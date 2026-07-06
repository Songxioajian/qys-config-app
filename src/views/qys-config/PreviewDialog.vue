<script setup lang="ts">
/**
 * 预览弹窗
 *
 * 职责：弹窗展示当前业务 JSON 完整内容（只读，格式化文本）
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§6 底部操作按钮 - 预览配置
 *
 * 用户需求对应：⑦ 预览按钮逻辑
 */
import { computed } from 'vue'
import type { BusinessJson } from '../../qys-config/types'

const props = defineProps<{
  visible: boolean
  json: BusinessJson
}>()
const emit = defineEmits<{ 'update:visible': [boolean] }>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
})

const jsonText = computed(() => JSON.stringify(props.json, null, 2))

/** 统计信息 */
const stats = computed(() => {
  const j = props.json
  return {
    employeeId: j.meta.employeeId || '（未填）',
    categoryName: j.meta.categoryName || '（未填）',
    categoryType: j.meta.categoryType,
    categoryId: j.meta.categoryId,
    signatoryEnabled: j.signatory.enable,
    signatoryCount: j.signatory.value.flowSignatories.length,
    configEnabledCount: j.configs.filter((c) => c.enable).length,
    configTotal: j.configs.length,
  }
})

function copyJson() {
  navigator.clipboard?.writeText(jsonText.value).then(() => {
    // 简单复制反馈
  })
}
</script>

<template>
  <el-dialog v-model="visibleProxy" title="预览配置" width="800px" top="5vh">
    <div class="preview-dialog">
      <!-- 摘要 -->
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">流程名称</span>
          <span class="stat-value">{{ stats.categoryName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">流程类型</span>
          <span class="stat-value">{{ stats.categoryType }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">流程 ID</span>
          <span class="stat-value">{{ stats.categoryId }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">签署方</span>
          <span class="stat-value">
            {{ stats.signatoryEnabled ? `启用 · ${stats.signatoryCount} 方` : '未启用' }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">配置项</span>
          <span class="stat-value">{{ stats.configEnabledCount }} / {{ stats.configTotal }} 启用</span>
        </div>
      </div>

      <!-- JSON 文本 -->
      <div class="json-section">
        <div class="json-header">
          <span>完整业务 JSON</span>
          <el-button size="small" plain @click="copyJson">复制</el-button>
        </div>
        <pre class="json-text">{{ jsonText }}</pre>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.preview-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-label {
  font-size: 12px;
  color: #909399;
}
.stat-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}
.json-section {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f2f5;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
.json-text {
  margin: 0;
  padding: 12px;
  max-height: 50vh;
  overflow: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #303133;
  background: #fafafa;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
