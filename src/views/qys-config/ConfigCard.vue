<script setup lang="ts">
/**
 * 通用配置卡片组件
 *
 * 职责：
 *   - 渲染开关（绑 item.enable）
 *   - 渲染标题（CONFIG_KEY_LABEL + key 枚举值小字）
 *   - 折叠/展开 value 表单（enable=false 折叠，enable=true 展开）
 *   - enable=false 时不清空 value（文档3 §2.1）
 *   - 通过 ValueFormRenderer 按 key 自动渲染对应表单
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§2 通用配置卡片统一模板
 *
 * 用户需求对应：③ 通用配置卡片组件：根据key自动渲染对应表单，开关控制enable
 */
import { computed } from 'vue'
import type { ConfigItem, FlowSignatory } from '../../qys-config/types'
import { CONFIG_KEY_LABEL, getCategoryOf, CATEGORY_LABEL } from '../../qys-config/constants'
import ValueFormRenderer from './value-forms/ValueFormRenderer.vue'

const props = defineProps<{
  item: ConfigItem
  /** 实际签署方列表：透传给功能配置表单，用于按真实签署方选择 */
  signatories?: FlowSignatory[]
}>()
const emit = defineEmits<{ 'update:item': [ConfigItem] }>()

const title = computed(() => CONFIG_KEY_LABEL[props.item.key])
const categoryLabel = computed(() => CATEGORY_LABEL[getCategoryOf(props.item.key)])

function onEnableChange(val: boolean) {
  emit('update:item', { ...props.item, enable: val })
}

function onValueChange(val: Record<string, any>) {
  emit('update:item', { ...props.item, value: val })
}
</script>

<template>
  <el-card class="config-card" :class="{ disabled: !item.enable }" shadow="hover">
    <div class="card-header">
      <div class="header-left">
        <el-switch :model-value="item.enable" @update:model-value="onEnableChange" />
        <span class="title">{{ title }}</span>
        <span class="key">({{ item.key }})</span>
      </div>
      <el-tag size="small" type="info" effect="plain">{{ categoryLabel }}</el-tag>
    </div>

    <el-collapse-transition>
      <div v-show="item.enable" class="card-body">
        <ValueFormRenderer :config-key="item.key" :model-value="item.value" :signatories="signatories" @update:model-value="onValueChange" />
      </div>
    </el-collapse-transition>

    <div v-if="!item.enable" class="card-tip">未启用 · 切换开关以展开配置</div>
  </el-card>
</template>

<style scoped>
.config-card {
  transition: opacity 0.2s;
}
.config-card.disabled {
  opacity: 0.7;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.key {
  font-size: 12px;
  color: #909399;
}
.card-body {
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}
.card-tip {
  font-size: 12px;
  color: #909399;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}
</style>
