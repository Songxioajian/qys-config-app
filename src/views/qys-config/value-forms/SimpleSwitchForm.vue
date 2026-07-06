<script setup lang="ts">
/**
 * 简单开关型 value 表单
 *
 * 适用配置项：单一布尔字段或多布尔字段的配置
 *   - SCHEDULE_SEND: { enable }
 *   - SHARE_FILE: { allowShareFile }
 *   - MERGE_FILE_SIGN: { enableMergeFile }
 *   - END_TIME: { enableEndTime, mustFill }
 *   - SIMPLE_SIGN_MODE: { enableSimpleSignMode }
 *   - PRIVATE_SEND_CLOUD_SIGN: { enableCloudSign }
 *   - ALLOW_TERMINATE_PART: { allowTerminatePart }
 *   - SIGN_POSITION_OVERLAP: { notAllowSignPositionOverlap }
 *   - SIGN_REGION: { allowSpecifySignRegion }
 *   - TAMPER_PROOF_SIGN: { enableTamperProofSign }
 *   - PDF_CONVERT_IMAGE: { enablePdfConvertImage }
 *   - PURPOSE_STAMP: { enablePurposeStamp }
 *
 * 用户需求对应：③ 通用配置卡片组件-简单型 value 表单
 */
import { computed } from 'vue'
import type { ConfigKey } from '../../../qys-config/types'

const props = defineProps<{
  configKey: ConfigKey
  modelValue: Record<string, any>
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

/** 各 configKey 对应的字段定义（label + 字段名） */
const FIELD_DEFS: Partial<Record<ConfigKey, Array<{ field: string; label: string }>>> = {
  SCHEDULE_SEND: [{ field: 'enable', label: '启用文件定时发起' }],
  SHARE_FILE: [{ field: 'allowShareFile', label: '允许文件分享' }],
  MERGE_FILE_SIGN: [{ field: 'enableMergeFile', label: '启用文件合并签署' }],
  END_TIME: [
    { field: 'enableEndTime', label: '启用文件到期日期' },
    { field: 'mustFill', label: '必须填写到期日期' },
  ],
  SIMPLE_SIGN_MODE: [{ field: 'enableSimpleSignMode', label: '启用极简签署模式' }],
  PRIVATE_SEND_CLOUD_SIGN: [{ field: 'enableCloudSign', label: '启用私发公签' }],
  ALLOW_TERMINATE_PART: [{ field: 'allowTerminatePart', label: '允许作废部分签署文档' }],
  SIGN_POSITION_OVERLAP: [{ field: 'notAllowSignPositionOverlap', label: '签章位置防重叠' }],
  SIGN_REGION: [{ field: 'allowSpecifySignRegion', label: '允许指定签署区域' }],
  TAMPER_PROOF_SIGN: [{ field: 'enableTamperProofSign', label: '启用防篡改保护证书' }],
  PDF_CONVERT_IMAGE: [{ field: 'enablePdfConvertImage', label: '启用文件转图片防扣章' }],
  PURPOSE_STAMP: [{ field: 'enablePurposeStamp', label: '启用用途章' }],
}

const fields = computed(() => FIELD_DEFS[props.configKey] || [])

/** 更新某个布尔字段 */
function updateField(field: string, val: boolean) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}
</script>

<template>
  <div class="simple-switch-form">
    <div v-for="f in fields" :key="f.field" class="field-row">
      <span class="label">{{ f.label }}</span>
      <el-switch :model-value="!!modelValue[f.field]" @update:model-value="(v: boolean) => updateField(f.field, v)" />
    </div>
  </div>
</template>

<style scoped>
.simple-switch-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}
.label {
  font-size: 13px;
  color: #303133;
}
</style>
