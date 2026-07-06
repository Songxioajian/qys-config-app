<script setup lang="ts">
/**
 * 基础信息表单（meta）
 *
 * 字段：
 *   - employeeId    员工 ID（字符串，防大整数精度丢失，文档1 §0.1）
 *   - categoryName  流程名称
 *   - categoryType  流程类型（ELECTRONIC / ELECTRONIC_OFD）
 *   - categoryId    流程 ID（新建态为 0，由后端 result.id 回填，只读回显）
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§1 ① 基础信息区
 *
 * 用户需求对应：② 页面主组件-基础信息 meta 表单
 */
import { computed } from 'vue'
import type { Meta } from '../../qys-config/types'
import { ENUM_CATEGORY_TYPE } from '../../qys-config/constants'

const props = defineProps<{
  modelValue: Meta
}>()
const emit = defineEmits<{ 'update:modelValue': [Meta] }>()

const v = computed(() => props.modelValue)
const isNew = computed(() => v.value.categoryId === 0)

function update(field: keyof Meta, val: any) {
  emit('update:modelValue', { ...props.modelValue, [field]: val })
}
</script>

<template>
  <el-card class="meta-form" shadow="never">
    <template #header>
      <span class="section-title">① 基础信息</span>
    </template>

    <!-- ★ 员工 ID 已默认填充，隐藏输入框；上线时需修改 defaults.ts 中的默认值 ★ -->
    <input type="hidden" :value="v.employeeId" />

    <div class="form-grid">

      <div class="field">
        <label>流程名称 <span class="required">*</span></label>
        <el-input
          :model-value="v.categoryName"
          @update:model-value="(val: string) => update('categoryName', val)"
          placeholder="用印流程名称"
        />
      </div>

      <div class="field">
        <label>流程类型 <span class="required">*</span></label>
        <el-select
          :model-value="v.categoryType"
          @update:model-value="(val: string) => update('categoryType', val)"
          style="width: 100%;"
        >
          <el-option v-for="o in ENUM_CATEGORY_TYPE" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>

      <div class="field">
        <label>流程 ID</label>
        <el-input :model-value="isNew ? '' : v.categoryId" disabled placeholder="创建完成后自动生成，无需填写" />
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.meta-form {
  margin-bottom: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 13px;
  color: #606266;
}
.required {
  color: #f56c6c;
}
</style>
