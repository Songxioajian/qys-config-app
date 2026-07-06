<script setup lang="ts">
/**
 * SIGN_EXPIRE_DATE 联动型 value 表单
 *
 * 字段：expireKind / daysType / days / allowOperatorChange
 * 联动规则（文档3 §5.1）：
 *   - expireKind = DEFAULT → 隐藏 daysType / days / allowOperatorChange
 *   - expireKind = CUSTOM  → 显示 daysType / allowOperatorChange
 *   - daysType = ASSIGN_DAYS → 显示 days 数字输入
 *   - daysType = DAY_OF_SEND → 隐藏 days
 *
 * 用户需求对应：③ 通用配置卡片组件-联动型 value 表单
 */
import { computed } from 'vue'
import { ENUM_EXPIRE_KIND, ENUM_DAYS_TYPE } from '../../../qys-config/constants'

const props = defineProps<{ modelValue: Record<string, any> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const v = computed(() => props.modelValue)
const isCustom = computed(() => v.value.expireKind === 'CUSTOM')
const isAssignDays = computed(() => v.value.daysType === 'ASSIGN_DAYS')

function update(field: string, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}
</script>

<template>
  <div class="sign-expire-form">
    <div class="row">
      <div class="field">
        <label>截止日期类型</label>
        <el-select :model-value="v.expireKind" @update:model-value="(val: string) => update('expireKind', val)" style="width: 100%">
          <el-option v-for="o in ENUM_EXPIRE_KIND" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>
    </div>

    <template v-if="isCustom">
      <div class="row">
        <div class="field">
          <label>天数类型</label>
          <el-select :model-value="v.daysType" @update:model-value="(val: string) => update('daysType', val)" style="width: 100%">
            <el-option v-for="o in ENUM_DAYS_TYPE" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
      </div>

      <div v-if="isAssignDays" class="row">
        <div class="field">
          <label>签署天数</label>
          <el-input-number
            :model-value="v.days"
            @update:model-value="(val: number) => update('days', val)"
            :min="1"
            :step="1"
            style="width: 100%"
          />
        </div>
      </div>

      <div class="row">
        <div class="field field-switch">
          <label>允许操作人修改</label>
          <el-switch :model-value="!!v.allowOperatorChange" @update:model-value="(val: boolean) => update('allowOperatorChange', val)" />
        </div>
      </div>
    </template>

    <el-alert v-else type="info" :closable="false" title="默认模式，无需自定义天数" />
  </div>
</template>

<style scoped>
.sign-expire-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
}
</style>
