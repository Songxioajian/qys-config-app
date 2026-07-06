/**
 * 接口统一入口
 *
 * 职责：
 *   - 暴露统一的 executeFlow，直接使用真实接口
 *
 * 真实接口配置见 realApi.ts 顶部的 API_BASE_URL / API_TIMEOUT。
 */

import type { BusinessJson, CategoryRequest, ApiResponse, FlowResult } from './types'
import { runFlow } from './transform'
import { realInvokeWithRetry } from './realApi'

/**
 * 串行执行入口
 *
 * 用法（Test.vue）：
 *   const result = await executeFlow(json, { demoMode: true, onStepStart, onStepSuccess, onStepError })
 */
export async function executeFlow(
  json: BusinessJson,
  options?: {
    /** 演示模式：创建流程 + 签署方成功后，其余配置接口视为成功 */
    demoMode?: boolean
    onStepStart?: (step: number, key: string, req: CategoryRequest) => void
    onStepSuccess?: (step: number, key: string, resp: ApiResponse) => void
    onStepError?: (step: number, key: string, resp: ApiResponse | null, err: Error | null) => void
  },
): Promise<FlowResult> {
  return runFlow(json, realInvokeWithRetry, options)
}
