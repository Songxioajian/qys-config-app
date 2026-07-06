<script setup lang="ts">
/**
 * ATTACHMENT_ID_CARD 嵌套型 value 表单（attachmentRules 数组）
 *
 * 结构：value.flowSignatories[].attachmentRules[]
 *   每条 attachmentRule: { required, checkMode }
 *
 * 联动规则（文档3 §5.4）：
 *   - checkMode = NONE → 仅保留 required 开关，提示「不校验」
 *   - checkMode = IDCARD_FACE / IDCARD_NATIONAL → 正常展示
 *
 * 用户需求对应：③ 通用配置卡片组件-嵌套型 value 表单
 */
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { FlowSignatory } from '../../../qys-config/types'
import { ENUM_CHECK_MODE } from '../../../qys-config/constants'

const props = defineProps<{
  modelValue: Record<string, any>
  /** 实际签署方列表：附件校验的签署方必须引用其中真实存在的签署方，禁止凭空添加 */
  signatories?: FlowSignatory[]
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const list = computed(() => Array.isArray(props.modelValue.flowSignatories) ? props.modelValue.flowSignatories : [])

function emitList(newList: any[]) {
  emit('update:modelValue', { ...props.modelValue, flowSignatories: newList })
}

/** 已选签署方 flag（避免重复添加同一签署方） */
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

/** 从实际签署方中选择一个加入校验（禁止凭空新增不存在的签署方） */
function onPickSignatory(flag: string) {
  if (!flag) return
  emitList([...list.value, { flowSignatoryFlag: flag, attachmentRules: [] }])
  pendingFlag.value = ''
}

async function removeSignatory(idx: number) {
  await ElMessageBox.confirm(`确认删除第 ${idx + 1} 个签署方？`, '删除确认', { type: 'warning' })
  const newList = list.value.filter((_, i) => i !== idx)
  emitList(newList)
}

function addRule(idx: number) {
  const newList = list.value.map((item, i) => {
    if (i !== idx) return item
    return {
      ...item,
      attachmentRules: [...(item.attachmentRules || []), { required: false, checkMode: 'NONE' }],
    }
  })
  emitList(newList)
}

function removeRule(sIdx: number, rIdx: number) {
  const newList = list.value.map((item, i) => {
    if (i !== sIdx) return item
    return {
      ...item,
      attachmentRules: (item.attachmentRules || []).filter((_: any, j: number) => j !== rIdx),
    }
  })
  emitList(newList)
}

function updateRule(sIdx: number, rIdx: number, field: string, val: any) {
  const newList = list.value.map((item, i) => {
    if (i !== sIdx) return item
    const rules = (item.attachmentRules || []).map((r: any, j: number) => j === rIdx ? { ...r, [field]: val } : r)
    return { ...item, attachmentRules: rules }
  })
  emitList(newList)
}
</script>

<template>
  <div class="attachment-form">
    <div v-for="(s, sIdx) in list" :key="sIdx" class="signatory-block">
      <div class="block-header">
        <span class="flag">签署方 {{ s.flowSignatoryFlag }}</span>
        <el-button size="small" type="danger" plain @click="removeSignatory(sIdx)">删除签署方</el-button>
      </div>
      <div class="rules">
        <div v-for="(r, rIdx) in (s.attachmentRules || [])" :key="rIdx" class="rule-row">
          <div class="rule-field">
            <label>必须</label>
            <el-switch :model-value="!!r.required" @update:model-value="(v: boolean) => updateRule(sIdx, rIdx, 'required', v)" />
          </div>
          <div class="rule-field">
            <label>校验模式</label>
            <el-select :model-value="r.checkMode" @update:model-value="(v: string) => updateRule(sIdx, rIdx, 'checkMode', v)" size="small" style="width: 160px;">
              <el-option v-for="o in ENUM_CHECK_MODE" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
          <el-button size="small" type="danger" text @click="removeRule(sIdx, rIdx)">删除</el-button>
        </div>
        <el-button size="small" plain @click="addRule(sIdx)">+ 添加校验规则</el-button>
      </div>
    </div>
    <div class="add-signatory">
      <el-select
        v-model="pendingFlag"
        placeholder="选择实际签署方添加"
        :disabled="signatoryOptions.length === 0"
        @change="onPickSignatory"
        size="small"
        style="max-width: 360px;"
      >
        <el-option v-for="opt in signatoryOptions" :key="opt.flag" :label="opt.label" :value="opt.flag" :disabled="opt.disabled" />
      </el-select>
      <el-alert
        v-if="!hasRealSignatories"
        type="warning"
        :closable="false"
        title="尚未配置任何实际签署方，请先在「签署方编辑区」添加"
      />
    </div>
    <el-alert v-if="list.length === 0" type="info" :closable="false" title="未配置任何签署方附件校验" />
  </div>
</template>

<style scoped>
.attachment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.signatory-block {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}
.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f2f5;
}
.flag {
  font-size: 13px;
  font-weight: 500;
}
.rules {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 4px;
}
.rule-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}
.add-signatory {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
