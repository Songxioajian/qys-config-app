<script setup lang="ts">
/**
 * 单个签署方卡片
 *
 * 职责：
 *   - 展示 / 编辑 flowSignatoryFlag（只读）+ flowSignatoryKind（下拉）
 *   - flowActions 列表（增删 + 上下移动）
 *   - 删除当前签署方
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§3.3 / §3.4
 *
 * 用户需求对应：② 签署方拖拽编辑模块-单签署方卡片
 */
import type { FlowSignatory } from '../../qys-config/types'
import { ENUM_FLOW_SIGNATORY_KIND, ENUM_FLOW_ACTION_KIND } from '../../qys-config/constants'
import { moveUp, moveDown, nextActionFlag } from '../../qys-config/helpers'

const props = defineProps<{
  signatory: FlowSignatory
  index: number
}>()
const emit = defineEmits<{
  'update:signatory': [FlowSignatory]
  'remove': []
}>()

function updateKind(val: any) {
  emit('update:signatory', { ...props.signatory, flowSignatoryKind: val })
}

function addAction() {
  const newAction = {
    flowActionFlag: nextActionFlag(props.signatory.flowActions),
    flowActionKind: 'CORPORATE_NODE' as const,
  }
  emit('update:signatory', {
    ...props.signatory,
    flowActions: [...props.signatory.flowActions, newAction],
  })
}

function removeAction(idx: number) {
  const list = props.signatory.flowActions.filter((_, i) => i !== idx)
  emit('update:signatory', { ...props.signatory, flowActions: list })
}

function updateAction(idx: number, field: string, val: any) {
  const list = props.signatory.flowActions.map((a, i) => i === idx ? { ...a, [field]: val } : a)
  emit('update:signatory', { ...props.signatory, flowActions: list })
}

function onMoveUp(idx: number) {
  const list = [...props.signatory.flowActions]
  moveUp(list, idx)
  emit('update:signatory', { ...props.signatory, flowActions: list })
}

function onMoveDown(idx: number) {
  const list = [...props.signatory.flowActions]
  moveDown(list, idx)
  emit('update:signatory', { ...props.signatory, flowActions: list })
}
</script>

<template>
  <div class="flow-signatory-item">
    <div class="item-header">
      <div class="header-left">
        <el-tag size="small" type="primary">{{ signatory.flowSignatoryFlag }}</el-tag>
        <span class="index-label">第 {{ index + 1 }} 个签署方</span>
      </div>
      <el-button size="small" type="danger" text @click="emit('remove')">删除签署方</el-button>
    </div>

    <div class="item-body">
      <div class="field-row">
        <label>签署方标识</label>
        <el-input :model-value="signatory.flowSignatoryFlag" disabled style="width: 160px;" />
      </div>
      <div class="field-row">
        <label>签署方类型</label>
        <el-select
          :model-value="signatory.flowSignatoryKind"
          @update:model-value="updateKind"
          style="width: 200px;"
        >
          <el-option v-for="o in ENUM_FLOW_SIGNATORY_KIND" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </div>

      <div class="actions-section">
        <div class="actions-header">
          <span class="actions-title">签署节点列表（{{ signatory.flowActions.length }}）</span>
          <el-button size="small" plain @click="addAction">+ 添加节点</el-button>
        </div>
        <div v-if="signatory.flowActions.length === 0" class="empty-actions">
          暂无签署节点
        </div>
        <div v-for="(action, idx) in signatory.flowActions" :key="idx" class="action-row">
          <span class="action-flag">{{ action.flowActionFlag }}</span>
          <el-select
            :model-value="action.flowActionKind"
            @update:model-value="(v: string) => updateAction(idx, 'flowActionKind', v)"
            size="small"
            style="width: 180px;"
          >
            <el-option v-for="o in ENUM_FLOW_ACTION_KIND" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <div class="action-ops">
            <el-button size="small" text :disabled="idx === 0" @click="onMoveUp(idx)">↑</el-button>
            <el-button size="small" text :disabled="idx === signatory.flowActions.length - 1" @click="onMoveDown(idx)">↓</el-button>
            <el-button size="small" type="danger" text @click="removeAction(idx)">删除</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-signatory-item {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}
.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f7ff;
  border-bottom: 1px solid #dcdfe6;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.index-label {
  font-size: 13px;
  color: #606266;
}
.item-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.field-row label {
  font-size: 12px;
  color: #606266;
  width: 80px;
}
.actions-section {
  border-top: 1px dashed #ebeef5;
  padding-top: 10px;
}
.actions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.actions-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
.empty-actions {
  font-size: 12px;
  color: #909399;
  padding: 8px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 4px;
}
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 4px;
}
.action-flag {
  font-size: 12px;
  color: #409EFF;
  font-weight: 500;
  min-width: 28px;
}
.action-ops {
  margin-left: auto;
  display: flex;
  align-items: center;
}
</style>
