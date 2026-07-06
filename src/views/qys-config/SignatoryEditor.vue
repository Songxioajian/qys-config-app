<script setup lang="ts">
/**
 * 签署方拖拽编辑区
 *
 * 职责：
 *   - 顶部总开关绑 signatory.enable
 *   - 开启后展开 flowMode / receiveType 下拉 + flowSignatories 列表
 *   - flowSignatories 使用 vuedraggable 拖拽排序（receiveType=SIMUL 时禁用）
 *   - 增删签署方（前端校验 flowSignatoryFlag 唯一）
 *   - flowMode=NON_DEFINE 时提示「自定义模式下签署方由发起人填写」
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§3 签署方模块交互
 *
 * 用户需求对应：② 签署方拖拽编辑模块
 */
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import type { Signatory, FlowSignatory } from '../../qys-config/types'
import { ENUM_FLOW_MODE, ENUM_RECEIVE_TYPE } from '../../qys-config/constants'
import { nextSignatoryFlag, isFlagUnique } from '../../qys-config/helpers'
import FlowSignatoryItem from './FlowSignatoryItem.vue'

const props = defineProps<{
  modelValue: Signatory
}>()
const emit = defineEmits<{ 'update:modelValue': [Signatory] }>()

const v = computed(() => props.modelValue)
const isSeq = computed(() => v.value.value.receiveType === 'SEQ')
const isNonDefine = computed(() => v.value.value.flowMode === 'NON_DEFINE')

function updateEnable(val: boolean) {
  emit('update:modelValue', { ...props.modelValue, enable: val })
}

function updateValueField(field: string, val: any) {
  emit('update:modelValue', {
    ...props.modelValue,
    value: { ...props.modelValue.value, [field]: val },
  })
}

function onDragEnd(newList: FlowSignatory[]) {
  emit('update:modelValue', {
    ...props.modelValue,
    value: { ...props.modelValue.value, flowSignatories: newList },
  })
}

async function addSignatory() {
  const list = v.value.value.flowSignatories
  let flag = nextSignatoryFlag(list)
  // 唯一性保险（极端情况下 nextSignatoryFlag 算出的值已存在）
  while (!isFlagUnique(list, flag)) {
    flag = 'S' + (Math.floor(Math.random() * 10000))
  }
  const newSignatory: FlowSignatory = {
    flowSignatoryFlag: flag,
    flowSignatoryKind: 'PERSON',
    flowActions: [],
  }
  emit('update:modelValue', {
    ...props.modelValue,
    value: { ...props.modelValue.value, flowSignatories: [...list, newSignatory] },
  })
}

async function removeSignatory(idx: number) {
  await ElMessageBox.confirm(`确认删除签署方 ${v.value.value.flowSignatories[idx].flowSignatoryFlag}？`, '删除确认', { type: 'warning' })
  const list = v.value.value.flowSignatories.filter((_, i) => i !== idx)
  emit('update:modelValue', {
    ...props.modelValue,
    value: { ...props.modelValue.value, flowSignatories: list },
  })
}

function updateSignatory(idx: number, updated: FlowSignatory) {
  // 校验 flag 唯一
  if (updated.flowSignatoryFlag !== v.value.value.flowSignatories[idx].flowSignatoryFlag
      && !isFlagUnique(v.value.value.flowSignatories, updated.flowSignatoryFlag, idx)) {
    ElMessage.warning(`签署方标识 ${updated.flowSignatoryFlag} 重复`)
    return
  }
  const list = v.value.value.flowSignatories.map((s, i) => i === idx ? updated : s)
  emit('update:modelValue', {
    ...props.modelValue,
    value: { ...props.modelValue.value, flowSignatories: list },
  })
}
</script>

<template>
  <el-card class="signatory-editor" shadow="never">
    <template #header>
      <div class="section-header">
        <span class="section-title">② 签署方编辑区</span>
        <div class="header-right">
          <span class="enable-label">启用签署方配置</span>
          <el-switch :model-value="v.enable" @update:model-value="updateEnable" />
        </div>
      </div>
    </template>

    <div v-if="v.enable" class="editor-body">
      <div class="top-row">
        <div class="field">
          <label>流程模式</label>
          <el-select :model-value="v.value.flowMode" @update:model-value="(val: string) => updateValueField('flowMode', val)" style="width: 100%;">
            <el-option v-for="o in ENUM_FLOW_MODE" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
        <div class="field">
          <label>接收顺序</label>
          <el-select :model-value="v.value.receiveType" @update:model-value="(val: string) => updateValueField('receiveType', val)" style="width: 100%;">
            <el-option v-for="o in ENUM_RECEIVE_TYPE" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </div>
      </div>

      <el-alert v-if="isNonDefine" type="info" :closable="false" title="自定义模式下签署方由发起人填写，预设列表非必填" style="margin-bottom: 12px;" />

      <div class="signatory-list-header">
        <span class="list-title">签署方列表（{{ v.value.flowSignatories.length }}）</span>
        <div class="list-ops">
          <el-tag v-if="!isSeq" size="small" type="info">同时接收无需排序</el-tag>
          <el-button size="small" type="primary" plain @click="addSignatory">+ 添加签署方</el-button>
        </div>
      </div>

      <draggable
        :model-value="v.value.flowSignatories"
        @update:model-value="onDragEnd"
        :disabled="!isSeq"
        item-key="flowSignatoryFlag"
        handle=".item-header"
        animation="200"
      >
        <template #item="{ element, index }">
          <div class="drag-item" :class="{ 'no-drag': !isSeq }">
            <FlowSignatoryItem
              :signatory="element"
              :index="index"
              @update:signatory="(val) => updateSignatory(index, val)"
              @remove="removeSignatory(index)"
            />
          </div>
        </template>
      </draggable>

      <el-alert
        v-if="v.value.flowSignatories.length === 0"
        type="warning"
        :closable="false"
        title="尚未添加任何签署方"
      />
    </div>

    <div v-else class="disabled-tip">签署方配置未启用 · 切换开关以展开</div>
  </el-card>
</template>

<style scoped>
.signatory-editor {
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.enable-label {
  font-size: 13px;
  color: #606266;
}
.editor-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.top-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  color: #606266;
}
.signatory-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px dashed #ebeef5;
}
.list-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
.list-ops {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drag-item {
  margin-bottom: 10px;
  cursor: grab;
}
.drag-item.no-drag {
  cursor: default;
}
.drag-item:active {
  cursor: grabbing;
}
.disabled-tip {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
