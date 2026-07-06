<script setup lang="ts">
/**
 * TEMPLATE_BINDING 数组型 value 表单
 *
 * 字段：templateIds (Array<Long>)
 * 渲染：标签输入 + 回车确认 + 删除标签
 *
 * 用户需求对应：③ 通用配置卡片组件-数组型 value 表单
 */
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: Record<string, any> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, any>] }>()

const inputValue = ref('')
const tags = computed<number[]>(() => Array.isArray(props.modelValue.templateIds) ? props.modelValue.templateIds : [])

function addTag() {
  const raw = inputValue.value.trim()
  if (!raw) return
  const num = Number(raw)
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return
  }
  if (tags.value.includes(num)) {
    inputValue.value = ''
    return
  }
  emit('update:modelValue', { ...props.modelValue, templateIds: [...tags.value, num] })
  inputValue.value = ''
}

function removeTag(num: number) {
  emit('update:modelValue', { ...props.modelValue, templateIds: tags.value.filter((t) => t !== num) })
}
</script>

<template>
  <div class="template-binding-form">
    <label class="label">模板 ID 列表（输入数字后回车添加）</label>
    <div class="tags-wrap">
      <el-tag
        v-for="tag in tags"
        :key="tag"
        closable
        @close="removeTag(tag)"
        style="margin-right: 6px; margin-bottom: 6px;"
      >
        {{ tag }}
      </el-tag>
      <el-input
        v-model="inputValue"
        placeholder="输入模板 ID"
        size="small"
        style="width: 160px;"
        @keyup.enter="addTag"
      />
    </div>
    <el-alert
      v-if="tags.length === 0"
      type="info"
      :closable="false"
      title="未绑定任何模板"
      style="margin-top: 4px;"
    />
  </div>
</template>

<style scoped>
.template-binding-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-size: 12px;
  color: #606266;
}
.tags-wrap {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  min-height: 40px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
</style>
