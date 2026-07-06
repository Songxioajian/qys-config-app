<script setup lang="ts">
/**
 * 用印流程配置页 — 主组件
 *
 * 职责：
 *   - 持有单一数据源 reactive<BusinessJson>
 *   - 双模式切换：预览模式（FlowChart） / 编辑模式（三区块表单）
 *   - 底部按钮逻辑：预览 / 重置 / 一键生成
 *   - 一键生成：Schema 校验 → 本地必填校验 → 串行执行 → categoryId 回填
 *   - 双向绑定：所有子组件 v-model 直绑 JSON 路径，修改实时同步
 *
 * 对应文档：
 *   - 《前端页面模块拆分与交互逻辑方案》§1 / §4 / §6
 *   - 《业务JSON转后端接口请求转换规则说明书》§7 异常处理
 *   - 《解析智能体输出JSON约束规范》§4 校验
 *
 * 用户需求对应：②③④⑤⑥⑦
 */
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import pako from 'pako'
import MetaForm from './qys-config/MetaForm.vue'
import SignatoryEditor from './qys-config/SignatoryEditor.vue'
import ConfigCardList from './qys-config/ConfigCardList.vue'
import PreviewDialog from './qys-config/PreviewDialog.vue'
import FlowChart from './qys-config/FlowChart.vue'
import type { BusinessJson, Meta, Signatory, ConfigItem } from '../qys-config/types'
import { createEmptyBusinessJson, createSampleBusinessJson } from '../qys-config/defaults'
import { validateSchema, validateBeforeGenerate, formatFlowError } from '../qys-config/validate'
import { executeFlow } from '../qys-config/api'
import { buildInitiateFileUrl } from '../qys-config/realApi'
import { parseImportedJson } from '../qys-config/importJson'
import { CONFIG_KEY_LABEL } from '../qys-config/constants'
import type { StepItem } from '../qys-config/ProgressDialog.vue'
import ProgressDialog from '../qys-config/ProgressDialog.vue'

/**
 * 生成默认用印流程名称
 * 接口不允许名字重复，附加时间戳 + 随机数确保唯一性
 */
function generateDefaultCategoryName(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const rand = Math.floor(Math.random() * 900 + 100) // 100-999
  return `AI智能用印流_${ts}${rand}`
}

/** ★ 单一数据源：业务 JSON（页面打开即填入默认流程名称） */
const json = reactive<BusinessJson>(createEmptyBusinessJson())
json.meta.categoryName = generateDefaultCategoryName()

/** ★ 视图模式：预览（默认） / 编辑 */
const editMode = ref(false)

/** 预览弹窗可见性 */
const previewVisible = ref(false)

/** 一键生成中 */
const generating = ref(false)

/** 导入 JSON 弹窗 */
const importVisible = ref(false)
const importText = ref('')
const importLoading = ref(false)

/** ===== 进度弹窗状态 ===== */
const progressVisible = ref(false)
const progressTitle = ref('AI 正在为您创建用印流程...')
const progressSubtitle = ref('预计需要等待 1~2 分钟，请稍后')
const progressSteps = ref<StepItem[]>([
  { label: '创建用印流程，初始化流程配置...' },
  { label: '修改签署方配置，配置签署流程...' },
  { label: '配置 印章管理 功能参数...' },
  { label: '配置 审批流 功能参数...' },
  { label: '配置 签署顺序 功能参数...' },
])
const currentStepIndex = ref(0)

/** ===== 成功弹窗状态 ===== */
const successVisible = ref(false)
const successCategoryId = ref<number | string>('')

/**
 * 从业务 JSON 构建步骤列表
 * 顺序：创建流程 → 修改签署方(可选) → 各已启用配置项
 */
function buildStepList(): StepItem[] {
  const steps: StepItem[] = [
    { label: '创建用印流程，初始化流程配置...' },
  ]
  if (json.signatory.enable) {
    steps.push({ label: '修改签署方配置，配置签署流程...' })
  }
  json.configs.forEach((item) => {
    if (!item.enable) return
    const label = CONFIG_KEY_LABEL[item.key] || item.key
    steps.push({ label: `配置 ${label} 功能参数...` })
  })
  return steps
}

/** 流程是否有数据 */
const hasFlowData = computed(() => {
  return !!json.meta.categoryName ||
    (json.signatory.enable && json.signatory.value.flowSignatories.length > 0) ||
    json.configs.some(c => c.enable)
})

onMounted(() => {
  console.log('%c[用印流程配置] 使用真实接口', 'color:#2563eb;font-weight:bold;')
  loadFromHash()
  // 若 hash 导入未带来流程名称，确保有默认值
  if (!json.meta.categoryName || !json.meta.categoryName.trim()) {
    json.meta.categoryName = generateDefaultCategoryName()
  }
  window.addEventListener('hashchange', loadFromHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', loadFromHash)
})

function loadFromHash() {
  const hash = window.location.hash
  if (!hash || hash.length < 2) return
  try {
    const obj = decodeHashJson(hash)
    const text = JSON.stringify(obj)
    const result = parseImportedJson(text)
    if (!result.ok || !result.data) {
      ElMessage.error('URL hash 导入失败：' + (result.error || '解析失败'))
      return
    }
    // employeeId 为当前操作员身份，不属于流程配置，导入时不被覆盖
    const preservedEmployeeId = json.meta.employeeId
    Object.assign(json.meta, result.data.meta)
    if (!json.meta.employeeId || !String(json.meta.employeeId).trim()) {
      json.meta.employeeId = preservedEmployeeId
    }
    Object.assign(json.signatory, result.data.signatory)
    json.configs.splice(0, json.configs.length, ...result.data.configs)
    ElMessage.success('已从 URL hash 导入配置')
  } catch (err: any) {
    console.error('[hash 导入] 解析失败', err)
    ElMessage.error('URL hash 数据解析异常：' + (err?.message || '未知错误'))
  }
}

function decodeHashJson(hash: string): any {
  let b64 = hash.replace(/^#/, '')
  b64 = b64.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  const binStr = atob(b64)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i)
  let decompressed: Uint8Array
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    decompressed = pako.ungzip(bytes)
  } else if (bytes[0] === 0x78) {
    decompressed = pako.inflate(bytes)
  } else {
    decompressed = pako.inflate(bytes, { raw: true })
  }
  const jsonStr = new TextDecoder('utf-8').decode(decompressed)
  return JSON.parse(jsonStr)
}

function onMetaUpdate(val: Meta) { Object.assign(json.meta, val) }
function onSignatoryUpdate(val: Signatory) { Object.assign(json.signatory, val) }
function onConfigsUpdate(val: ConfigItem[]) { json.configs.splice(0, json.configs.length, ...val) }

function onOpenImport() { importText.value = ''; importVisible.value = true }

function onConfirmImport() {
  importLoading.value = true
  try {
    const text = importText.value.trim()
    if (!text) { ElMessage.warning('请粘贴 JSON 内容'); return }
    const result = parseImportedJson(text)
    if (!result.ok || !result.data) { ElMessage.error(result.error || '解析失败'); return }
    // employeeId 为当前操作员身份，不属于流程配置，导入时不被覆盖
    const preservedEmployeeId = json.meta.employeeId
    Object.assign(json.meta, result.data.meta)
    if (!json.meta.employeeId || !String(json.meta.employeeId).trim()) {
      json.meta.employeeId = preservedEmployeeId
    }
    Object.assign(json.signatory, result.data.signatory)
    json.configs.splice(0, json.configs.length, ...result.data.configs)
    importVisible.value = false
    ElMessage.success('导入成功，已回填到表单')
  } catch (err: any) {
    ElMessage.error('导入异常：' + (err?.message || '未知错误'))
  } finally { importLoading.value = false }
}

function onPreview() { previewVisible.value = true }

async function onReset() {
  try {
    await ElMessageBox.confirm('确认重置为初始空态？当前编辑内容将丢失。', '重置确认', { type: 'warning' })
  } catch { return }
  const empty = createEmptyBusinessJson()
  Object.assign(json.meta, empty.meta)
  Object.assign(json.signatory, empty.signatory)
  json.configs.splice(0, json.configs.length, ...empty.configs)
  // 重置后重新生成默认名称
  json.meta.categoryName = generateDefaultCategoryName()
  editMode.value = false
  ElMessage.success('已重置为初始空态')
}

async function onLoadSample() {
  try {
    await ElMessageBox.confirm('确认载入示例配置？将覆盖当前编辑内容。', '载入示例', { type: 'info' })
  } catch { return }
  const sample = createSampleBusinessJson()
  Object.assign(json.meta, sample.meta)
  Object.assign(json.signatory, sample.signatory)
  json.configs.splice(0, json.configs.length, ...sample.configs)
  ElMessage.success('已载入示例配置')
}

async function onGenerate() {
  const schemaRes = validateSchema(json)
  if (!schemaRes.ok) {
    ElMessage.error('Schema 校验失败：' + schemaRes.errors[0].msg)
    console.log('Schema 校验错误详情：', schemaRes.errors)
    return
  }
  const fieldRes = validateBeforeGenerate(json)
  if (!fieldRes.ok) {
    ElMessage.error(fieldRes.errors[0].msg)
    console.log('本地校验错误详情：', fieldRes.errors)
    return
  }

  // 构建步骤列表并初始化进度弹窗
  progressSteps.value = buildStepList()
  currentStepIndex.value = 0
  progressVisible.value = true
  generating.value = true

  try {
    const result = await executeFlow(json, {
      demoMode: true,
      onStepStart: (step, key) => {
        console.log(`%c===== 步骤 ${step} 开始：${key} =====`, 'color:#2563eb;font-weight:bold;')
      },
      onStepSuccess: (step, key) => {
        console.log(`步骤 ${step}（${key}）成功`)
        // 推进进度条到下一步（当前步骤完成，指向下一个）
        currentStepIndex.value = step
      },
      onStepError: (step, key, resp, err) => {
        console.error(`步骤 ${step}（${key}）失败：`, { resp, err })
        progressVisible.value = false
      },
    })

    progressVisible.value = false
    if (result.ok) {
      const cid = result.categoryId!
      json.meta.categoryId = cid
      showCreateSuccessDialog(cid)
    } else {
      ElMessage.error({ message: formatFlowError(result.error!), duration: 0, showClose: true })
    }
  } catch (err: any) {
    progressVisible.value = false
    ElMessage.error('生成流程异常：' + (err?.message || '未知错误'))
    console.error(err)
  } finally { generating.value = false }
}

/**
 * 所有接口调用成功后的弹窗
 * 自定义样式：标题「提示」+ 居中消息 + 蓝色大按钮「去发起文件」
 */
function showCreateSuccessDialog(categoryId: number | string) {
  successCategoryId.value = categoryId
  successVisible.value = true
}

/** 点击「去发起文件」跳转新页面 */
function onGoInitiateFile() {
  const url = buildInitiateFileUrl(successCategoryId.value)
  console.log('%c[去发起文件] 跳转新页面：' + url, 'color:#2563eb;font-weight:bold;')
  window.open(url, '_blank')
}
</script>

<template>
  <div class="page-root">
    <!-- ===== 页头（固定在顶部） ===== -->
    <header class="page-header">
      <div class="page-header__inner">
        <div class="page-header__left">
          <div class="page-header__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/>
            </svg>
          </div>
          <div>
            <h1 class="page-header__title">用印流程配置</h1>
            <p class="page-header__sub">配置签署流程，一键生成提交</p>
          </div>
        </div>
        <div class="page-header__right">
          <el-button text @click="onOpenImport" :disabled="generating">
            <el-icon><Upload /></el-icon>导入
          </el-button>
          <el-button text @click="onLoadSample" :disabled="generating">
            <el-icon><DocumentCopy /></el-icon>示例
          </el-button>
          <el-button
            v-if="!editMode"
            type="primary"
            round
            @click="editMode = true"
            :disabled="generating"
          >
            <el-icon><EditPen /></el-icon>编辑配置
          </el-button>
          <el-button
            v-else
            round
            @click="editMode = false"
          >
            <el-icon><View /></el-icon>完成编辑
          </el-button>
        </div>
      </div>
    </header>

    <!-- ===== 主内容区（白色圆角卡片） ===== -->
    <main class="page-body">
      <!-- ===== 预览模式 ===== -->
      <div v-if="!editMode" class="content-card">
        <FlowChart v-if="hasFlowData" :json="json" />
        <div v-else class="empty-state">
          <div class="empty-state__icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h3 class="empty-state__title">尚未配置签署流程</h3>
          <p class="empty-state__desc">点击「编辑配置」开始创建，或导入已有 JSON / 载入示例</p>
          <div class="empty-state__actions">
            <el-button type="primary" @click="editMode = true">开始配置</el-button>
            <el-button plain @click="onLoadSample">载入示例</el-button>
            <el-button plain @click="onOpenImport">导入 JSON</el-button>
          </div>
        </div>
      </div>

      <!-- ===== 编辑模式 ===== -->
      <div v-else class="edit-mode">
        <FlowChart v-if="hasFlowData" :json="json" class="chart-ref" />

        <!-- ① 基础信息 -->
        <div class="section-block">
          <div class="section-block__head">
            <span class="section-block__step">1</span>
            <span class="section-block__title">基础信息</span>
            <span class="section-block__meta">{{ hasFlowData ? '已填写' : '未填写' }}</span>
          </div>
          <div class="section-block__body">
            <MetaForm :model-value="json.meta" @update:model-value="onMetaUpdate" />
          </div>
        </div>

        <!-- ② 签署方配置 -->
        <div class="section-block">
          <div class="section-block__head">
            <span class="section-block__step">2</span>
            <span class="section-block__title">签署方配置</span>
            <span class="section-block__meta">{{ json.signatory.enable ? '已启用' : '未启用' }}</span>
          </div>
          <div class="section-block__body">
            <SignatoryEditor :model-value="json.signatory" @update:model-value="onSignatoryUpdate" />
          </div>
        </div>

        <!-- ③ 功能配置 -->
        <div class="section-block">
          <div class="section-block__head">
            <span class="section-block__step">3</span>
            <span class="section-block__title">功能配置</span>
            <span class="section-block__meta">{{ json.configs.filter(c => c.enable).length }}/{{ json.configs.length }} 启用</span>
          </div>
          <div class="section-block__body">
            <ConfigCardList
              :model-value="json.configs"
              :signatories="json.signatory.value.flowSignatories"
              @update:model-value="onConfigsUpdate"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- 预览弹窗 -->
    <PreviewDialog v-model:visible="previewVisible" :json="json" />

    <!-- 导入弹窗 -->
    <el-dialog v-model="importVisible" title="导入智能体输出 JSON" width="640px" top="8vh">
      <div class="import-body">
        <div class="import-tip">
          粘贴智能体输出的完整业务 JSON（含 meta / signatory / configs），解析后将自动回填到表单，缺失的配置项会补默认值。
        </div>
        <el-input
          v-model="importText"
          type="textarea"
          :rows="16"
          placeholder='{"meta":{...},"signatory":{...},"configs":[...]}'
          class="import-input"
        />
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="onConfirmImport">解析并回填</el-button>
      </template>
    </el-dialog>

    <!-- ===== 进度弹窗（接口调用中） ===== -->
    <ProgressDialog
      :visible="progressVisible"
      :title="progressTitle"
      :subtitle="progressSubtitle"
      :steps="progressSteps"
      :current-step="currentStepIndex"
    />

    <!-- ===== 创建成功弹窗 ===== -->
    <el-dialog
      v-model="successVisible"
      title=""
      width="400px"
      :show-close="true"
      :close-on-click-modal="false"
      :modal="true"
      append-to-body
      class="success-dialog"
    >
      <div class="success-dialog__body">
        <div class="success-dialog__title">提示</div>
        <div class="success-dialog__msg">系统已自动创建用印流程</div>
        <button class="success-dialog__btn" @click="onGoInitiateFile">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          去发起文件
        </button>
      </div>
    </el-dialog>

    <!-- ===== 底部操作栏 ===== -->
    <footer class="footer-bar">
      <div class="footer-bar__inner">
        <div class="footer-bar__hint">
          <el-icon><InfoFilled /></el-icon>
          <span>配置完成后将自动生成流程模版</span>
        </div>
        <div class="footer-bar__actions">
          <el-button @click="onPreview" :disabled="generating">
            <el-icon><DocumentCopy /></el-icon>预览 JSON
          </el-button>
          <el-button @click="onReset" :disabled="generating">
            <el-icon><RefreshRight /></el-icon>重置
          </el-button>
          <el-button
            type="primary"
            :loading="generating"
            @click="onGenerate"
            class="footer-bar__generate"
          >
            <el-icon><Promotion /></el-icon>一键生成流程
          </el-button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { Upload, DocumentCopy, EditPen, View, InfoFilled, RefreshRight, Promotion } from '@element-plus/icons-vue'
export default { components: { Upload, DocumentCopy, EditPen, View, InfoFilled, RefreshRight, Promotion } }
</script>

<style scoped>
/* ===== ROOT ===== */
.page-root {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  padding-top: 72px;
  padding-bottom: 80px;
  background: #f5f7fa;
  font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

/* ===== PAGE HEADER（头部 - 固定在顶部） ===== */
.page-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}
.page-header__inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 32px;
}
.page-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-header__icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.page-header__title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.2;
}
.page-header__sub {
  font-size: 12px;
  color: #999;
  margin: 2px 0 0;
}
.page-header__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ===== 主内容区（白色卡片） ===== */
.page-body { max-width:1100px; margin:24px auto; }
.content-card {
  background:#fff; border-radius:16px; border:1px solid #eee;
  box-shadow:0 1px 6px rgba(0,0,0,.04); overflow:hidden;
}

/* ===== EMPTY STATE ===== */
.empty-state {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:80px 20px;
}
.empty-state__icon {
  width:64px; height:64px; border-radius:14px; background:#f0f5ff;
  border:1px solid #d6e4ff; display:flex; align-items:center; justify-content:center;
  color:#2563eb; margin-bottom:20px;
}
.empty-state__title {
  font-size:16px; font-weight:600; color:#1a1a1a; margin:0 0 8px;
}
.empty-state__desc {
  font-size:13px; color:#999; margin:0 0 28px; text-align:center; max-width:340px;
}
.empty-state__actions { display:flex; gap:10px; }

/* ===== EDIT MODE ===== */
.edit-mode {
  background:#fff; border-radius:16px; border:1px solid #eee;
  box-shadow:0 1px 6px rgba(0,0,0,.04); overflow:hidden;
}
.chart-ref :deep(.el-card) {
  border-radius:0; border:none; border-bottom:1px solid #f0f0f0; box-shadow:none;
}

/* ===== SECTION BLOCK (Shape Lock: 6px) ===== */
.section-block {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 16px;
}
.section-block__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.section-block__step {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.section-block__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.section-block__meta {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
}
.section-block__body {
  padding: 16px;
}

/* ===== FOOTER BAR（脚部 - 固定底部） ===== */
.footer-bar {
  position:fixed; bottom:0; left:0; right:0; z-index:100;
  background:#fff; border-top:1px solid #e8e8e8;
}
.footer-bar__inner {
  max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between;
  padding:14px 32px;
}
.footer-bar__hint { display:flex; align-items:center; gap:7px; font-size:13px; color:#aaa; }
.footer-bar__hint .el-icon { font-size:15px; color:#ccc; }
.footer-bar__actions { display:flex; align-items:center; gap:10px; }
.footer-bar__generate { min-width:140px; }

/* ===== IMPORT DIALOG ===== */
.import-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.import-tip {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  padding: 10px 12px;
  background: #f1f5f9;
  border-radius: 6px;
}
.import-input :deep(.el-textarea__inner) {
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 6px;
}

/* ===== ELEMENT PLUS GLOBAL OVERWRIDES (consistent with page tokens) ===== */

/* Buttons */
:deep(.el-button) {
  border-radius: 6px;
}
:deep(.el-button--primary) {
  background: #2563eb;
  border-color: #2563eb;
}
:deep(.el-button--primary:hover) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}
:deep(.el-button--primary:active) {
  background: #1e40af;
  border-color: #1e40af;
  transform: translateY(1px);
}
:deep(.el-button--default) {
  border-color: #e2e8f0;
  color: #334155;
}
:deep(.el-button--default:hover) {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}

/* Cards in child components */
.section-block__body :deep(.el-card) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.section-block__body :deep(.el-card__header) {
  border-bottom: 1px solid #f1f5f9;
  padding: 10px 16px;
}
.section-block__body :deep(.el-card__body) {
  padding: 16px;
}

/* Form Items */
:deep(.el-form-item__label) {
  color: #334155;
  font-size: 13px;
  font-weight: 500;
}
:deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2563eb inset, 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Select */
:deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
}

/* Switch */
:deep(.el-switch) {
  --el-switch-off-color: #cbd5e1;
  --el-switch-on-color: #2563eb;
}

/* Tag */
:deep(.el-tag) {
  border-radius: 6px;
}

/* Checkbox */
:deep(.el-checkbox__inner) {
  border-radius: 6px;
  border-color: #cbd5e1;
}
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #2563eb;
  border-color: #2563eb;
}

/* Radio */
:deep(.el-radio__inner) {
  border-color: #cbd5e1;
}
:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #2563eb;
  border-color: #2563eb;
}

/* Scrollbar */
.page-root::-webkit-scrollbar {
  width: 5px;
}
.page-root::-webkit-scrollbar-track {
  background: transparent;
}
.page-root::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

/* ===== 创建成功弹窗 ===== */
.success-dialog :deep(.el-dialog__header) {
  display: none;
}
.success-dialog :deep(.el-dialog__body) {
  padding: 40px 32px 36px;
}
.success-dialog__body {
  text-align: center;
}
.success-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}
.success-dialog__msg {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 28px;
}
.success-dialog__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.success-dialog__btn:hover {
  opacity: 0.9;
}
.success-dialog__btn:active {
  transform: scale(0.98);
}
</style>
