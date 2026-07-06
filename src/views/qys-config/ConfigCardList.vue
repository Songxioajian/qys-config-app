<script setup lang="ts">
/**
 * 配置卡片列表
 *
 * 职责：
 *   - 按 3 类分组（time / security / convenient）渲染 23 项配置卡片
 *   - 双向绑定 configs 数组（增删改同步回父组件）
 *
 * 对应文档：《前端页面模块拆分与交互逻辑方案》§2.3 卡片间无依赖，支持按 key 分类分组展示
 *
 * 用户需求对应：② 页面主组件-config通用配置卡片循环渲染
 */
import { computed } from 'vue'
import type { ConfigItem, ConfigCategory, FlowSignatory } from '../../qys-config/types'
import { getCategoryOf, CATEGORY_LABEL } from '../../qys-config/constants'
import ConfigCard from './ConfigCard.vue'

const props = defineProps<{
  modelValue: ConfigItem[]
  /** 实际签署方列表：透传给各配置表单，用于按真实签署方选择 */
  signatories?: FlowSignatory[]
}>()
const emit = defineEmits<{ 'update:modelValue': [ConfigItem[]] }>()

/** 渲染顺序：三类主分类 + other 兜底（仅在有未分类项时显示） */
const CATEGORIES: ConfigCategory[] = ['time', 'security', 'convenient', 'other']

/** 按分类分组（保持各分类内原数组顺序，未指定分类落 other） */
const grouped = computed(() => {
  const map: Record<ConfigCategory, ConfigItem[]> = {
    time: [],
    security: [],
    convenient: [],
    other: [],
  }
  props.modelValue.forEach((item) => {
    const cat = getCategoryOf(item.key)
    map[cat].push(item)
  })
  return map
})

/** other 分组为空时不渲染该区块 */
const visibleCategories = computed(() =>
  CATEGORIES.filter((c) => grouped.value[c].length > 0),
)

/** 某项更新时，根据 key 找到原数组中的索引并替换 */
function onItemUpdate(updated: ConfigItem) {
  const idx = props.modelValue.findIndex((it) => it.key === updated.key)
  if (idx === -1) return
  const newList = [...props.modelValue]
  newList[idx] = updated
  emit('update:modelValue', newList)
}
</script>

<template>
  <div class="config-card-list">
    <div v-for="cat in visibleCategories" :key="cat" class="category-group">
      <h3 class="group-title">{{ CATEGORY_LABEL[cat] }}</h3>
      <div class="cards-grid">
        <ConfigCard
          v-for="item in grouped[cat]"
          :key="item.key"
          :item="item"
          :signatories="signatories"
          @update:item="onItemUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-card-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.category-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  padding-left: 8px;
  border-left: 3px solid #409EFF;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}
</style>
