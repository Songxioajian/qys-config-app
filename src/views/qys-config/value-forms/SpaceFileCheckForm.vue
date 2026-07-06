<script setup lang="ts">
/**
 * SPACE_FILE_CHECK 联动型 value 表单
 *
 * 字段：checkKind + 5 个布尔字段
 * 联动规则（文档3 §5.2）：
 *   - checkKind = SYSTEM → 隐藏全部自定义布尔字段
 *   - checkKind = CUSTOM → 显示 5 个字段
 *   - enableCheckBlankPage = false → 隐藏 allowSendOnBlankPage / allowAppointedSignOnBlankPage
 *   - enableCheckBlankSpace = false → 隐藏 allowAppointedSignOnBlankSpace
 *
 * 用户需求对应：③ 通用配置卡片组件-联动型 value 表单
 */
import { computed } from 'vue'
import { ENUM_CHECK_KIND } from '../../../qys-config/constants'

const props = defineProps<{ modelValue: Record<string, any> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const v = computed(() => props.modelValue)
const isCustom = computed(() => v.value.checkKind === 'CUSTOM')

function update(field: string, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}
</script>

<template>
  <div class="space-check-form">
    <div class="row">
      <div class="field">
        <label>检测要求</label>
        <el-select :model-value="v.checkKind" @update:model-value="(val: string) => update('checkKind', val)" style="width: 100%">
          <el-option v-for="o in ENUM_CHECK_KIND" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </div>

    <template v-if="isCustom">
      <div class="field-switch">
        <span>启用空白页检测</span>
        <el-switch :model-value="!!v.enableCheckBlankPage" @update:model-value="(val: boolean) => update('enableCheckBlankPage', val)" />
      </div>

      <template v-if="v.enableCheckBlankPage">
        <div class="field-switch">
          <span>允许在空白页发送</span>
          <el-switch :model-value="!!v.allowSendOnBlankPage" @update:model-value="(val: boolean) => update('allowSendOnBlankPage', val)" />
        </div>
        <div class="field-switch">
          <span>允许在空白页指定签署</span>
          <el-switch :model-value="!!v.allowAppointedSignOnBlankPage" @update:model-value="(val: boolean) => update('allowAppointedSignOnBlankPage', val)" />
        </div>
      </template>

      <div class="field-switch">
        <span>启用空白处检测</span>
        <el-switch :model-value="!!v.enableCheckBlankSpace" @update:model-value="(val: boolean) => update('enableCheckBlankSpace', val)" />
      </div>

      <div v-if="v.enableCheckBlankSpace" class="field-switch">
        <span>允许在空白处指定签署</span>
        <el-switch :model-value="!!v.allowAppointedSignOnBlankSpace" @update:model-value="(val: boolean) => update('allowAppointedSignOnBlankSpace', val)" />
      </div>
    </template>

    <el-alert v-else type="info" :closable="false" title="系统默认模式，无需自定义" />
  </div>
</template>

<style scoped>
.space-check-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  color: #606266;
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
</style>
