<script setup lang="ts">
/**
 * value 表单统一分发器（配置驱动版）
 *
 * 职责：按 manifest 的 formType 字段路由到对应表单组件
 *
 * 分发逻辑：
 *   - 从 manifest 取该 key 的 formType
 *   - 按 formType 映射到前端表单组件
 *   - formType='custom' 时渲染通用 JSON 编辑器兜底（不白屏）
 *
 * 用户需求对应：③ 通用配置卡片组件-按 formType 自动渲染对应表单
 *
 * 新增配置项时：
 *   - formType 匹配已有组件 → manifest 加一行，前端零改动
 *   - formType='custom' → 渲染 JSON 兜底，前端不崩；建议后续新建专用组件
 */
import { computed } from 'vue'
import type { FlowSignatory } from '../../../qys-config/types'
import SimpleSwitchForm from './SimpleSwitchForm.vue'
import SignExpireDateForm from './SignExpireDateForm.vue'
import SpaceFileCheckForm from './SpaceFileCheckForm.vue'
import TemplateBindingForm from './TemplateBindingForm.vue'
import SignRecordGpsForm from './SignRecordGpsForm.vue'
import AttachmentIdCardForm from './AttachmentIdCardForm.vue'
import FlowSignatoryConfigForm from './FlowSignatoryConfigForm.vue'
import { getKeyMeta } from '../../../qys-config/manifest'

const props = defineProps<{
  configKey: string
  modelValue: Record<string, any>
  /** 实际签署方列表：仅 flow-signatory-config / attachment-id-card 表单使用，用于按真实签署方选择 */
  signatories?: FlowSignatory[]
}>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

/** formType → 组件映射表 */
const FORM_TYPE_MAP: Record<string, any> = {
  'simple-switch': SimpleSwitchForm,
  'sign-expire-date': SignExpireDateForm,
  'space-file-check': SpaceFileCheckForm,
  'template-binding': TemplateBindingForm,
  'sign-record-gps': SignRecordGpsForm,
  'attachment-id-card': AttachmentIdCardForm,
  'flow-signatory-config': FlowSignatoryConfigForm,
}

/** 取该 key 的 formType，未配置则 'custom' */
const formType = computed(() => {
  const meta = getKeyMeta(props.configKey)
  return meta?.formType ?? 'custom'
})

const Comp = computed(() => FORM_TYPE_MAP[formType.value])

function onUpdate(val: Record<string, any>) {
  emit('update:modelValue', val)
}
</script>

<template>
  <!-- 需要实际签署方列表的表单：显式传入 signatories -->
  <AttachmentIdCardForm
    v-if="formType === 'attachment-id-card'"
    :model-value="modelValue"
    :signatories="signatories"
    @update:model-value="onUpdate"
  />
  <FlowSignatoryConfigForm
    v-else-if="formType === 'flow-signatory-config'"
    :config-key="configKey"
    :model-value="modelValue"
    :signatories="signatories"
    @update:model-value="onUpdate"
  />
  <template v-else>
    <component
      :is="Comp"
      v-if="Comp"
      :config-key="configKey"
      :model-value="modelValue"
      @update:model-value="onUpdate"
    />
    <!-- custom 兜底：通用 JSON 编辑器，保证不白屏 -->
    <div v-else class="custom-fallback">
      <el-alert
        type="warning"
        :closable="false"
        :title="`配置项 ${configKey} 使用 custom 表单（formType=${formType}），建议新建专用组件`"
        style="margin-bottom: 8px;"
      />
      <el-input
        type="textarea"
        :rows="6"
        :model-value="JSON.stringify(modelValue, null, 2)"
        @update:model-value="(v: string) => { try { emit('update:modelValue', JSON.parse(v)) } catch {} }"
        placeholder="JSON 编辑（兜底）"
        style="font-family: monospace; font-size: 12px;"
      />
    </div>
  </template>
</template>

<style scoped>
.custom-fallback {
  display: flex;
  flex-direction: column;
}
</style>
