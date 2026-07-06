<script setup lang="ts">
/**
 * 通用 flowSignatories 子表单型 value 表单
 *
 * 适用 6 个配置项（含签署方级配置）：
 *   - NEED_HANDWRITE_SEAL: 顶层 enableHandwriteSeal，子项 { flowSignatoryFlag, enableHandwriteSeal }
 *   - PERSON_SEAL_CHECK:   顶层 enablePersonSealCheck，子项 { flowSignatoryFlag, enablePersonSealCheck }
 *   - TURN_TODO:           顶层 allowTurnTodo，子项 { flowSignatoryFlag, allowTurnTodo }
 *   - SWEEP_CODE_SIGN:     顶层 personSweepCodeSign + departmentSweepCodeSign，子项 { flowSignatoryFlag, sweepCodeSign }
 *   - FACE_SIGN:           顶层 enableFaceSign，子项 { flowSignatoryFlag, enableFaceSign }
 *   - FDA_SIGN:            顶层 enableFda + fdaSignStyle，子项 { flowSignatoryFlag, enableFda, fdaSignStyle }
 *
 * 联动规则（文档3 §5.3）：
 *   - 顶层全局开关 = false → 折叠 flowSignatories 子表单
 *   - 顶层全局开关 = true  → 展示子表单，逐签署方配置
 *   - FDA_SIGN: enableFda = true 时显示 fdaSignStyle 下拉（全局与签署方级同理）
 *
 * 用户需求对应：③ 通用配置卡片组件-含 flowSignatories 子表单的通用型
 */
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { ConfigKey, FlowSignatory } from '../../../qys-config/types'
import { ENUM_FDA_SIGN_STYLE } from '../../../qys-config/constants'

const props = defineProps<{
  configKey: ConfigKey
  modelValue: Record<string, any>
  /** 实际签署方列表：功能配置中的签署方必须引用其中真实存在的签署方，禁止凭空添加 */
  signatories?: FlowSignatory[]
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const v = computed(() => props.modelValue)

/** 各 configKey 的顶层全局开关字段定义 */
const TOP_FIELDS: Partial<Record<ConfigKey, Array<{ field: string; label: string; type: 'switch' | 'fdaStyle' }>>> = {
  NEED_HANDWRITE_SEAL: [{ field: 'enableHandwriteSeal', label: '启用每次签署均需手写签名', type: 'switch' }],
  PERSON_SEAL_CHECK: [{ field: 'enablePersonSealCheck', label: '启用个人签名笔迹校验', type: 'switch' }],
  TURN_TODO: [{ field: 'allowTurnTodo', label: '允许转办', type: 'switch' }],
  SWEEP_CODE_SIGN: [
    { field: 'personSweepCodeSign', label: '个人扫码签署', type: 'switch' },
    { field: 'departmentSweepCodeSign', label: '部门扫码签署', type: 'switch' },
  ],
  FACE_SIGN: [{ field: 'enableFaceSign', label: '启用当面签', type: 'switch' }],
  FDA_SIGN: [
    { field: 'enableFda', label: '启用多签名结构体', type: 'switch' },
    { field: 'fdaSignStyle', label: 'FDA 签名样式', type: 'fdaStyle' },
  ],
}

/** 各 configKey 的子项字段定义 */
const SUB_FIELDS: Partial<Record<ConfigKey, Array<{ field: string; label: string; type: 'switch' | 'fdaStyle' }>>> = {
  NEED_HANDWRITE_SEAL: [{ field: 'enableHandwriteSeal', label: '需手写签名', type: 'switch' }],
  PERSON_SEAL_CHECK: [{ field: 'enablePersonSealCheck', label: '需笔迹校验', type: 'switch' }],
  TURN_TODO: [{ field: 'allowTurnTodo', label: '允许转办', type: 'switch' }],
  SWEEP_CODE_SIGN: [{ field: 'sweepCodeSign', label: '扫码签署', type: 'switch' }],
  FACE_SIGN: [{ field: 'enableFaceSign', label: '当面签', type: 'switch' }],
  FDA_SIGN: [
    { field: 'enableFda', label: '启用 FDA', type: 'switch' },
    { field: 'fdaSignStyle', label: 'FDA 样式', type: 'fdaStyle' },
  ],
}

const topFields = computed(() => TOP_FIELDS[props.configKey] || [])
const subFields = computed(() => SUB_FIELDS[props.configKey] || [])

/** 顶层全局开关是否全部为 false（用于折叠子表单） */
const allTopOff = computed(() => {
  return topFields.value
    .filter((f) => f.type === 'switch')
    .every((f) => !v.value[f.field])
})

/** 是否显示 FDA 样式（仅 FDA_SIGN 且 enableFda=true） */
function showFdaStyle(field: any): boolean {
  return field.type === 'fdaStyle' && v.value.enableFda === true
}

function updateTop(field: string, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}

const list = computed(() => Array.isArray(props.modelValue.flowSignatories) ? props.modelValue.flowSignatories : [])

function emitList(newList: any[]) {
  emit('update:modelValue', { ...props.modelValue, flowSignatories: newList })
}

/** 已选签署方 flag（避免同一功能重复添加同一签署方） */
const usedFlags = computed(() => new Set(list.value.map((s: any) => s.flowSignatoryFlag)))

/** 可选择的真实签署方（排除已添加的） */
const signatoryOptions = computed(() =>
  (props.signatories || []).map((s, i) => ({
    flag: s.flowSignatoryFlag,
    label: `第 ${i + 1} 个签署方 (${s.flowSignatoryFlag})`,
    disabled: usedFlags.value.has(s.flowSignatoryFlag),
  })),
)

const hasRealSignatories = computed(() => (props.signatories?.length ?? 0) > 0)

const pendingFlag = ref('')

/** 从实际签署方中选择一个加入配置（禁止凭空新增不存在的签署方） */
function onPickSignatory(flag: string) {
  if (!flag) return
  const newItem: Record<string, any> = { flowSignatoryFlag: flag }
  subFields.value.forEach((f) => {
    if (f.type === 'switch') newItem[f.field] = false
    if (f.type === 'fdaStyle') newItem[f.field] = 'CN_FDA_LEFT_RIGHT'
  })
  emitList([...list.value, newItem])
  pendingFlag.value = ''
}

async function removeSub(idx: number) {
  await ElMessageBox.confirm(`确认删除第 ${idx + 1} 个签署方配置？`, '删除确认', { type: 'warning' })
  emitList(list.value.filter((_, i) => i !== idx))
}

function updateSubField(idx: number, field: string, val: any) {
  const newList = list.value.map((item, i) => i === idx ? { ...item, [field]: val } : item)
  emitList(newList)
}
</script>

<template>
  <div class="flow-signatory-config-form">
    <!-- 顶层全局开关 -->
    <div class="top-fields">
      <template v-for="f in topFields" :key="f.field">
        <div v-if="f.type === 'switch'" class="field-switch">
          <span>{{ f.label }}</span>
          <el-switch :model-value="!!v[f.field]" @update:model-value="(val: boolean) => updateTop(f.field, val)" />
        </div>
        <div v-else-if="showFdaStyle(f)" class="field-select">
          <label>{{ f.label }}</label>
          <el-select :model-value="v[f.field]" @update:model-value="(val: string) => updateTop(f.field, val)" size="small" style="width: 100%;">
            <el-option v-for="o in ENUM_FDA_SIGN_STYLE" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
      </template>
    </div>

    <!-- 子表单（顶层全部关闭时折叠） -->
    <template v-if="!allTopOff">
      <div class="sub-list">
        <div v-for="(item, idx) in list" :key="idx" class="sub-item">
          <div class="sub-header">
            <span class="flag">签署方 {{ item.flowSignatoryFlag }}</span>
            <el-button size="small" type="danger" text @click="removeSub(idx)">删除</el-button>
          </div>
          <div class="sub-body">
            <template v-for="f in subFields" :key="f.field">
              <div v-if="f.type === 'switch'" class="field-switch small">
                <span>{{ f.label }}</span>
                <el-switch :model-value="!!item[f.field]" @update:model-value="(val: boolean) => updateSubField(idx, f.field, val)" />
              </div>
              <div v-else-if="f.type === 'fdaStyle' && item.enableFda" class="field-select">
                <label>{{ f.label }}</label>
                <el-select :model-value="item[f.field]" @update:model-value="(val: string) => updateSubField(idx, f.field, val)" size="small" style="width: 100%;">
                  <el-option v-for="o in ENUM_FDA_SIGN_STYLE" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="add-signatory">
        <el-select
          v-model="pendingFlag"
          placeholder="选择实际签署方添加"
          :disabled="signatoryOptions.length === 0"
          @change="onPickSignatory"
          size="small"
          style="max-width: 320px;"
        >
          <el-option
            v-for="opt in signatoryOptions"
            :key="opt.flag"
            :label="opt.label"
            :value="opt.flag"
            :disabled="opt.disabled"
          />
        </el-select>
        <el-alert
          v-if="!hasRealSignatories"
          type="warning"
          :closable="false"
          title="尚未配置任何实际签署方，请先在「签署方编辑区」添加"
          style="flex: 1;"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.flow-signatory-config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.top-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
  color: #303133;
}
.field-switch.small {
  padding: 6px 8px;
  background: #fff;
}
.field-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}
.field-select label {
  font-size: 12px;
  color: #606266;
}
.sub-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sub-item {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}
.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f0f2f5;
}
.sub-header .flag {
  font-size: 12px;
  font-weight: 500;
}
.sub-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.add-signatory {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
