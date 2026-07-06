<script setup lang="ts">
/**
 * 接口调用进度弹窗
 *
 * 样式参考：圆环进度 + 步骤状态列表（✓ 已完成 / ○ 进行中 / ○ 待执行）
 *
 * Props:
 *   visible: boolean  — 弹窗显隐
 *   title: string      — 主标题（如"AI 正在为您创建用印流程..."）
 *   subtitle: string   — 副标题（如"预计需要等待 1~2 分钟，请稍后"）
 *   steps: StepItem[]  — 步骤列表
 *   currentStep: number — 当前正在执行的步骤索引（0-based）
 */

import { computed } from 'vue'

export interface StepItem {
  /** 步骤名称 */
  label: string
}

const props = defineProps<{
  visible: boolean
  title: string
  subtitle: string
  steps: StepItem[]
  currentStep: number
}>()

/** 进度百分比（0~100） */
const percent = computed(() => {
  const total = props.steps.length || 1
  return Math.min(100, Math.round(((props.currentStep + 1) / total) * 100))
})

/** 圆环 SVG 描边偏移（实现动画效果） */
const dashOffset = computed(() => {
  // 周长 ≈ 2 * PI * r，r=42 → C≈264
  const circumference = 264
  return circumference - (circumference * percent.value) / 100
})

/** 步骤状态：'pending' | 'running' | 'done' */
function stepStatus(index: number): 'pending' | 'running' | 'done' {
  if (index < props.currentStep) return 'done'
  if (index === props.currentStep) return 'running'
  return 'pending'
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="480px"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="progress-dialog"
    align-center
  >
    <!-- ===== 圆环进度 ===== -->
    <div class="pd-ring-wrap">
      <svg class="pd-ring" viewBox="0 0 100 100">
        <!-- 背景轨道 -->
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" stroke-width="6" />
        <!-- 进度弧 -->
        <circle
          class="pd-ring__arc"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#2563eb"
          stroke-width="6"
          stroke-linecap="round"
          :stroke-dasharray="264"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div class="pd-ring__text">{{ percent }}%</div>
    </div>

    <!-- ===== 文字信息 ===== -->
    <h3 class="pd-title">{{ title }}</h3>
    <p class="pd-subtitle">{{ subtitle }}</p>

    <!-- ===== 步骤列表 ===== -->
    <div class="pd-steps">
      <div v-for="(item, idx) in steps" :key="idx" class="pd-step">
        <!-- 状态图标 -->
        <span class="pd-step__icon" :class="'--' + stepStatus(idx)">
          <!-- ✓ 完成 -->
          <svg v-if="stepStatus(idx) === 'done'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <!-- ○ 进行中（旋转） -->
          <svg v-else-if="stepStatus(idx) === 'running'" class="pd-step__spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 2a10 10 0 1 0 9.95 8.95"/>
          </svg>
          <!-- ○ 待执行 -->
          <span v-else class="pd-step__dot"></span>
        </span>
        <!-- 步骤文字 -->
        <span class="pd-step__label">{{ item.label }}</span>
        <span class="pd-step__status">
          <span v-if="stepStatus(idx) === 'done'" class="--done">已完成</span>
          <span v-else-if="stepStatus(idx) === 'running'" class="--run">进行中</span>
        </span>
      </div>
    </div>

    <!-- 隐藏 footer 区域 -->
    <template #footer></template>
  </el-dialog>
</template>

<style scoped>
/* ===== 弹窗容器 ===== */
.progress-dialog {
  border-radius: 14px !important;
}
.progress-dialog :deep(.el-dialog) {
  border-radius: 14px;
  overflow: hidden;
}
.progress-dialog :deep(.el-dialog__header) {
  display: none;
}
.progress-dialog :deep(.el-dialog__body) {
  padding: 40px 36px 32px;
  text-align: center;
}

/* ===== 圆环进度 ===== */
.pd-ring-wrap {
  position: relative;
  display: block;
  width: 96px;
  height: 96px;
  margin: 0 auto 20px;
}
.pd-ring {
  width: 96px;
  height: 96px;
  display: block;
  margin: 0 auto;
}
.pd-ring__arc {
  transition: stroke-dashoffset 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}
.pd-ring__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

/* ===== 文字 ===== */
.pd-title {
  display: block;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 6px;
}
.pd-subtitle {
  display: block;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 24px;
}

/* ===== 步骤列表 ===== */
.pd-steps {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 16px;
  text-align: left;
}
.pd-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
}
.pd-step + .pd-step {
  border-top: 1px solid #f1f5f9;
}

/* 状态图标容器 */
.pd-step__icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ✓ 已完成 — 绿色背景 */
.pd-step__icon.--done {
  /* svg 自带颜色，无需额外样式 */
}

/* ○ 进行中 — 蓝色旋转 */
.pd-step__icon.--running .pd-step__spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ○ 待执行 — 灰色空心圆 */
.pd-step__icon--pending .pd-step__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  box-sizing: border-box;
}

/* 步骤标签 */
.pd-step__label {
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 进行中的步骤加粗 */
.pd-step:has(.--running) .pd-step__label,
.pd-step:has(.--run) .pd-step__label {
  font-weight: 500;
  color: #0f172a;
}

/* 状态文案 */
.pd-step__status {
  font-size: 12px;
  flex-shrink: 0;
  margin-left: auto;
}
.pd-step__status .--done {
  color: #10b981;
}
.pd-step__status .--run {
  color: #2563eb;
}
</style>
