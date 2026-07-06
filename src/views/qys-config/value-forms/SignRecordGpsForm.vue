<script setup lang="ts">
/**
 * SIGN_RECORD_GPS 嵌套型 value 表单（EntryConfig 三段）
 *
 * 字段：enableSignRecordGps + person/department/sender 三个 EntryConfig
 * 联动规则（文档3 §5.5）：
 *   - enableSignRecordGps = false → 隐藏三段子表单
 *   - enableSignRecordGps = true  → 展示三段
 *   - 每个 EntryConfig.enable = false → 折叠其 mustProvideGps
 *
 * 用户需求对应：③ 通用配置卡片组件-EntryConfig 嵌套型 value 表单
 */
import { computed } from 'vue'

const props = defineProps<{ modelValue: Record<string, any> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const v = computed(() => props.modelValue)
const segments = [
  { key: 'person', label: '个人签署方' },
  { key: 'department', label: '部门签署方' },
  { key: 'sender', label: '发起方' },
] as const

function update(field: string, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}

function updateEntryConfig(segKey: string, subField: string, val: any) {
  const seg = props.modelValue[segKey] || {}
  emit('update:modelValue', {
    ...props.modelValue,
    [segKey]: { ...seg, [subField]: val },
  })
}
</script>

<template>
  <div class="gps-form">
    <div class="field-switch">
      <span>启用签署时记录 GPS 定位</span>
      <el-switch :model-value="!!v.enableSignRecordGps" @update:model-value="(val: boolean) => update('enableSignRecordGps', val)" />
    </div>

    <template v-if="v.enableSignRecordGps">
      <div v-for="seg in segments" :key="seg.key" class="entry-config">
        <div class="entry-header">
          <span class="entry-label">{{ seg.label }}</span>
          <el-switch
            :model-value="!!(v[seg.key] && v[seg.key].enable)"
            @update:model-value="(val: boolean) => updateEntryConfig(seg.key, 'enable', val)"
          />
        </div>
        <div v-if="v[seg.key] && v[seg.key].enable" class="entry-body">
          <div class="field-switch small">
            <span>必须提供 GPS</span>
            <el-switch
              :model-value="!!(v[seg.key] && v[seg.key].mustProvideGps)"
              @update:model-value="(val: boolean) => updateEntryConfig(seg.key, 'mustProvideGps', val)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gps-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.entry-config {
  border: 1px solid #e3e5e8;
  border-radius: 6px;
  overflow: hidden;
}
.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f2f5;
  font-size: 13px;
  font-weight: 500;
}
.entry-body {
  padding: 8px 12px;
}
.entry-body .small {
  background: #fff;
  padding: 6px 8px;
  border-radius: 4px;
}
</style>
