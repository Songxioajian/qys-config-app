<script setup lang="ts">
/**
 * 签署流程图组件 — 严格按照设计图实现
 *
 * 布局结构：
 *   1. 标题区：流程名称(可编辑) + 标签栏(PDF电子签约·预设·顺序接收)
 *   2. 流程步骤：发起签暑 → 发起主体 → 个人接收方 → 归档
 *   3. 生效配置按钮
 *   4. 已生效规则：统计 + 进度圆环 + 配置卡片网格(3列)
 */
import { computed, ref, nextTick } from 'vue'
import { Edit, Check, Close, Setting, ArrowRight, Calendar, Document as DocIcon, EditPen, Stamp, Camera, Lock } from '@element-plus/icons-vue'
import type { BusinessJson, ConfigItem } from '../../qys-config/types'
import {
  CONFIG_KEY_LABEL,
  ENUM_FLOW_SIGNATORY_KIND,
  ENUM_FLOW_MODE,
  ENUM_RECEIVE_TYPE,
  ENUM_CATEGORY_TYPE,
} from '../../qys-config/constants'

const props = defineProps<{ json: BusinessJson }>()

/** 编辑名称状态 */
const editingName = ref(false)
const nameDraft = ref('')
const nameInputRef = ref()

function startEditName() {
  nameDraft.value = props.json.meta.categoryName || ''
  editingName.value = true
  nextTick(() => nameInputRef.value?.focus())
}
function confirmEditName() {
  const val = nameDraft.value.trim()
  if (val) props.json.meta.categoryName = val
  editingName.value = false
}
function cancelEditName() { editingName.value = false }

/** 是否有数据可展示 */
const hasData = computed(() =>
  !!props.json.meta.categoryName ||
  (props.json.signatory.enable && props.json.signatory.value.flowSignatories.length > 0)
)

/** 流程标题 */
const flowTitle = computed(() => props.json.meta.categoryName || '未命名流程')

/** 标签列表 */
const tabs = computed(() => {
  const items: string[] = []
  const ct = ENUM_CATEGORY_TYPE.find((o) => o.value === props.json.meta.categoryType)
  if (ct) items.push(ct.label)
  if (props.json.signatory.enable) {
    const fm = ENUM_FLOW_MODE.find((o) => o.value === props.json.signatory.value.flowMode)
    if (fm) items.push(fm.label)
    const rt = ENUM_RECEIVE_TYPE.find((o) => o.value === props.json.signatory.value.receiveType)
    if (rt) items.push(rt.label)
  }
  return items.length > 0 ? items : ['PDF电子签约', '预设', '顺序接收']
})

/** 签署方颜色 */
const signColors = [
  { bg: '#FDF2F0', border: '#F5C6C0', text: '#C45A3E' },
  { bg: '#F5F3FE', border: '#D8D1F5', text: '#6B5DD3' },
  { bg: '#EDF6DE', border: '#B8D992', text: '#4A8014' },
]

/** 流程节点 */
const flowNodes = computed(() => {
  const nodes: Array<{ label: string; bg: string; border: string; color: string }> = [
    { label: '发起签暑', bg: '#EBF4FD', border: '#B3D9F5', color: '#1E7DC8' },
  ]
  if (props.json.signatory.enable) {
    props.json.signatory.value.flowSignatories.forEach((s, i) => {
      const kind = ENUM_FLOW_SIGNATORY_KIND.find((o) => o.value === s.flowSignatoryKind)
      const c = signColors[i % signColors.length]
      nodes.push({
        label: kind?.label || (s.flowSignatoryKind === 'SENDER' ? '发起主体' : s.flowSignatoryKind === 'PERSON' ? '个人接收方' : '签署方'),
        ...c,
      })
    })
  }
  nodes.push({ label: '归档', bg: '#F2F8EC', border: '#C5DBA8', color: '#5A9214' })
  return nodes
})

/** 已启用的配置 */
const enabledConfigs = computed(() =>
  props.json.configs
    .filter((c) => c.enable)
    .map((c) => ({
      key: c.key as string,
      label: CONFIG_KEY_LABEL[c.key] || c.key,
      valueText: formatValue(c),
      statusType: getStatus(c),
      iconName: getIconName(c.key),
    }))
)

/** 全部配置(用于展开) */
const allConfigs = computed(() =>
  props.json.configs.map((c) => ({
    key: c.key as string,
    label: CONFIG_KEY_LABEL[c.key] || c.key,
    valueText: c.enable ? formatValue(c) : '未开启',
    statusType: getStatus(c),
    iconName: getIconName(c.key),
  }))
)

/** 是否展开全部 */
const showAll = ref(false)

/** 展示的卡片：默认只显示已开启的，展开后显示全部 */
const displayCards = computed(() =>
  showAll.value ? allConfigs.value : enabledConfigs.value
)

/** 是否存在未展示的配置 */
const hasHidden = computed(() => totalCount.value > enabledCount.value)

const enabledCount = computed(() => enabledConfigs.value.length)
const totalCount = computed(() => props.json.configs.length)
const progressPct = computed(() => totalCount.value ? Math.round(enabledCount.value / totalCount.value * 100) : 0)

function formatValue(cfg: ConfigItem): string {
  if (!cfg.enable) return '未开启'
  const v = cfg.value
  switch (cfg.key) {
    case 'SIGN_EXPIRE_DATE': return v.expireKind === 'CUSTOM' ? `${v.days || 0}天` : '已开启'
    case 'END_TIME': return v.mustFill ? '已开启 · 必填' : '已开启'
    case 'TEMPLATE_BINDING': return `${v.templateIds?.length || 0} 个模板`
    case 'ATTACHMENT_ID_CARD':
    case 'TURN_TODO':
    case 'NEED_HANDWRITE_SEAL':
    case 'PERSON_SEAL_CHECK':
    case 'FDA_SIGN': {
      const n = v.flowSignatories?.length || 0; return n ? `${n}个签署方` : '已开启'
    }
    default: return '已开启'
  }
}

function getStatus(cfg: ConfigItem): string {
  if (!cfg.enable) return 'disabled'
  const v = cfg.value
  switch (cfg.key) {
    case 'SIGN_EXPIRE_DATE': return v.expireKind === 'CUSTOM' ? 'days' : 'success'
    case 'ATTACHMENT_ID_CARD':
    case 'NEED_HANDWRITE_SEAL':
    case 'FDA_SIGN': return (v.flowSignatories?.length || 0) ? 'warning' : 'success'
    default: return 'success'
  }
}

function getIconName(key: string): string {
  const m: Record<string, string> = {
    SIGN_EXPIRE_DATE: 'calendar', END_TIME: 'document', NEED_HANDWRITE_SEAL: 'pen',
    PERSON_SEAL_CHECK: 'shield', ATTACHMENT_ID_CARD: 'camera', FDA_SIGN: 'lock',
  }
  return m[key] || 'default'
}
</script>

<template>
  <div v-if="hasData" class="fc">
    <!-- ===== 1. 标题区 ===== -->
    <div class="fc__header">
      <div class="fc__title-row">
        <h2 v-if="!editingName" class="fc__title">{{ flowTitle }}</h2>
        <el-input v-else ref="nameInputRef" v-model="nameDraft" size="default"
          class="fc__title-input" @keyup.enter="confirmEditName" @blur="confirmEditName" />
        <el-icon v-if="!editingName" class="fc__edit-icon" @click="startEditName"><Edit /></el-icon>
        <template v-else>
          <el-icon class="fc__edit-icon fc__edit-icon--ok" @click="confirmEditName"><Check /></el-icon>
          <el-icon class="fc__edit-icon fc__edit-icon--cancel" @click="cancelEditName"><Close /></el-icon>
        </template>
      </div>
      <!-- 标签栏 -->
      <div class="fc__tabs">
        <template v-for="(t, i) in tabs" :key="i">
          <span class="fc__tab">{{ t }}</span>
          <span v-if="i < tabs.length - 1" :key="'d'+i" class="fc__tab-dot"></span>
        </template>
      </div>
    </div>

    <!-- ===== 2. 流程步骤 ===== -->
    <div class="fc__steps">
      <template v-for="(node, i) in flowNodes" :key="i">
        <span class="fc__step" :style="{ background: node.bg, borderColor: node.border, color: node.color }">
          {{ node.label }}
        </span>
        <ArrowRight v-if="i < flowNodes.length - 1" class="fc__arrow" />
      </template>
    </div>

    <!-- ===== 3. 生效配置（带左右横线分隔） ===== -->
    <div class="fc__divider">
      <span class="fc__divider-line"></span>
      <span class="fc__divider-text">
        <Setting style="font-size:13px;" />
        生效配置
      </span>
      <span class="fc__divider-line"></span>
    </div>

    <!-- ===== 4. 已生效规则 ===== -->
    <div class="fc__rules">
      <div class="fc__rules-head">
        <span class="fc__rules-title">已生效规则</span>
      </div>

      <!-- 卡片网格 -->
      <div class="fc__grid">
        <div v-for="c in displayCards" :key="c.key" class="fc__card" :class="{ 'fc__card--off': c.statusType === 'disabled' }">
          <div class="fc__card-l">
            <span class="fc__card-icon" :class="'fc__ci--'+c.iconName">
              <Calendar v-if="c.iconName==='calendar'" style="width:16px;height:16px;" />
              <DocIcon v-else-if="c.iconName==='document'" style="width:16px;height:16px;" />
              <EditPen v-else-if="c.iconName==='pen'" style="width:16px;height:16px;" />
              <Stamp v-else-if="c.iconName==='shield'" style="width:16px;height:16px;" />
              <Camera v-else-if="c.iconName==='camera'" style="width:16px;height:16px;" />
              <Lock v-else-if="c.iconName==='lock'" style="width:16px;height:16px;" />
              <Setting v-else style="width:16px;height:16px;" />
            </span>
            <span class="fc__card-label">{{ c.label }}</span>
          </div>
          <span class="fc__card-tag" :class="'fc__tag--'+c.statusType">{{ c.valueText }}</span>
        </div>
      </div>

      <!-- 查看全部 -->
      <div v-if="hasHidden" class="fc__more" @click="showAll = !showAll">
        <template v-if="!showAll">
          查看全部配置 <ArrowRight style="width:12px;height:12px;vertical-align:middle;" />
        </template>
        <template v-else>
          收起 <ArrowRight style="width:12px;height:12px;vertical-align:middle;transform:rotate(90deg);" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.fc { display:flex; flex-direction:column; gap:28px; padding:36px 40px 44px; }

/* ===== 1. 标题区 ===== */
.fc__header { text-align:center; }
.fc__title-row { display:inline-flex; align-items:center; gap:8px; }
.fc__title {
  margin:0; font-size:20px; font-weight:600; color:#1a1a1a; letter-spacing:.3px;
}
.fc__title-input { width:360px; }
.fc__title-input :deep(.el-input__wrapper) {
  box-shadow:0 0 0 1px #2563eb inset; border-radius:6px;
}
.fc__edit-icon {
  font-size:17px; color:#2563eb; cursor:pointer; transition:color .2s;
}
.fc__edit-icon:hover { color:#1d4ed8; }
.fc__edit-icon--ok { color:#52c41a; }
.fc__edit-icon--cancel { color:#999; }

/* 标签栏 */
.fc__tabs {
  display:flex; align-items:center; justify-content:center; gap:8px; margin-top:14px;
}
.fc__tab {
  padding:4px 14px; font-size:13px; color:#666; background:transparent;
  border-radius:14px; cursor:pointer; transition:all .2s;
}
.fc__tab:hover { color:#2563eb; background:#f0f5ff; }
.fc__tab-dot { width:4px; height:4px; background:#ddd; border-radius:50%; }

/* ===== 2. 流程步骤 ===== */
.fc__steps {
  display:flex; align-items:center; justify-content:center; gap:6px; flex-wrap:wrap;
}
.fc__step {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:110px; height:44px; padding:0 22px; border-radius:10px;
  border:1.5px solid; font-size:15px; font-weight:500; white-space:nowrap;
  transition:transform .15s;
}
.fc__step:hover { transform:translateY(-1px); }
.fc__arrow { width:22px; height:22px; color:#c8c8c8; flex-shrink:0; }

/* ===== 3. 生效配置分隔线 ===== */
.fc__divider {
  display:flex;
  align-items:center;
  gap:16px;
  margin:4px 0;
}
.fc__divider-line {
  flex:1;
  height:1px;
  background:#eee;
}
.fc__divider-text {
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-size:13px;
  color:#999;
  white-space:nowrap;
}

/* ===== 4. 已生效规则 ===== */
.fc__rules { padding-top:24px; }
.fc__rules-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
.fc__rules-left { display:flex; align-items:baseline; gap:12px; }
.fc__rules-title { font-size:16px; font-weight:600; color:#1a1a1a; margin:0; }
.fc__rules-count { font-size:13px; color:#999; }
.fc__rules-count strong { color:#333; font-weight:600; }

/* 进度圆环 */
.fc__ring-wrap { position:relative; width:48px; height:48px; flex-shrink:0; }
.fc__ring-svg { width:100%; height:100%; transform:rotate(-90deg); }
.fc__ring-txt {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:600; color:#52C41A;
}

/* 卡片网格 */
.fc__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.fc__card {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; background:#fff; border:1px solid #f0f0f0; border-radius:10px;
  transition:all .2s;
}
.fc__card:hover { border-color:#d0e0ff; box-shadow:0 2px 8px rgba(37,99,235,.06); }
.fc__card--off { opacity:.5; }
.fc__card-l { display:flex; align-items:center; gap:10px; }
.fc__card-icon {
  width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.fc__ci--calendar { color:#2563eb; background:#e8f4fd; }
.fc__ci--document { color:#52c41a; background:#f6ffed; }
.fc__ci--pen { color:#fa541c; background:#fff2e8; }
.fc__ci--shield { color:#722ed1; background:#f9f0ff; }
.fc__ci--camera { color:#13c2c2; background:#e6fffb; }
.fc__ci--lock { color:#999; background:#fafafa; }
.fc__card-label { font-size:14px; color:#333; }

/* 状态标签 */
.fc__card-tag {
  padding:3px 10px; font-size:12px; font-weight:500; border-radius:4px; white-space:nowrap;
}
.fc__tag--success { color:#389e0d; background:#f6ffed; border:1px solid #b7eb8f; }
.fc__tag--days { color:#096dd9; background:#e6f7ff; border:1px solid #91d5ff; }
.fc__tag--warning { color:#d46b08; background:#fffbe6; border:1px solid #ffe58f; }
.fc__tag--disabled { color:#bfbfbf; background:#fafafa; border:1px solid #f0f0f0; }

/* 查看全部 */
.fc__more {
  display:flex; align-items:center; justify-content:center; gap:4px;
  margin-top:20px; padding-top:16px; font-size:13px; color:#999; cursor:pointer; transition:color .2s;
}
.fc__more:hover { color:#2563eb; }
</style>
