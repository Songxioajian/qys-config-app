/**
 * 业务 JSON 拆解 + 串行请求体生成 + value 序列化
 *
 * 对应文档：《业务JSON转后端接口请求转换规则说明书》（文档1）
 *   - §1 接口核心调用规则
 *   - §2 固定串行调用顺序
 *   - §3 meta → CREATE_CATEGORY 转换
 *   - §4 signatory → SIGNATORY 转换
 *   - §5 configs 遍历转换
 *   - §7 异常处理规则
 *
 * 用户需求对应：⑤ 核心工具函数：业务JSON自动拆解、串行生成接口请求、value序列化、异常捕获
 */

import type {
  BusinessJson,
  Meta,
  Signatory,
  ConfigItem,
  CategoryRequest,
  ApiResponse,
  FlowError,
  FlowResult,
} from './types'

/**
 * value 序列化（文档1 §0.3）
 * 所有配置项的 value 在业务 JSON 中为 object，调用接口前必须 JSON.stringify 为字符串
 */
export function serializeValue(value: object): string {
  return JSON.stringify(value)
}

/**
 * 步骤1：meta → CREATE_CATEGORY 请求体（文档1 §3）
 * - 顶层 categoryId 固定传空字符串
 * - categoryConfigObject.key 固定 "CREATE_CATEGORY"
 * - value 取 {categoryName, categoryType} 序列化
 */
export function buildCreateCategoryRequest(meta: Meta): CategoryRequest {
  return {
    employeeId: meta.employeeId,
    categoryId: '',
    categoryConfigObject: {
      key: 'CREATE_CATEGORY',
      value: serializeValue({
        categoryName: meta.categoryName,
        categoryType: meta.categoryType,
      }),
    },
  }
}

/**
 * 步骤2：signatory → SIGNATORY 请求体（文档1 §4）
 * - categoryId 透传步骤1 返回的 result.id
 * - signatory.enable=false 时返回 null，调用方跳过
 * - signatory.enable 不进入接口请求（仅前端渲染开关）
 * - value 序列化为 JSON 字符串
 */
export function buildSignatoryRequest(
  meta: Meta,
  categoryId: string | number,
  signatory: Signatory,
): CategoryRequest | null {
  // 文档1 §4.1：signatory.enable = false 时跳过该步骤不调用 SIGNATORY 接口
  if (!signatory.enable) return null
  return {
    employeeId: meta.employeeId,
    categoryId,
    categoryConfigObject: {
      key: 'SIGNATORY',
      value: serializeValue(signatory.value),
    },
  }
}

/**
 * 步骤3：单个 config → 请求体（文档1 §5）
 * - categoryId 统一透传步骤1 的 result.id（integer 或数字字符串，文档1 §0.1）
 * - key 原样透传
 * - value 序列化
 * 注：调用方需先过滤 enable=false
 */
export function buildConfigRequest(
  meta: Meta,
  categoryId: string | number,
  item: ConfigItem,
): CategoryRequest {
  return {
    employeeId: meta.employeeId,
    categoryId,
    categoryConfigObject: {
      key: item.key,
      value: serializeValue(item.value),
    },
  }
}

/**
 * 从「修改签署方」接口响应中提取 PERSONAL 签署方的实际 signatoryFlag
 *
 * response.json 结构：result.categoryConfig.flowDefine.signatories[].{ sigType, signatoryFlag }
 * 后端生成的 signatoryFlag（如 tw9hSZsXNvBaISvmSIX824Vllak01V）与前端占位的 flag（如 S2）不同，
 * 后续附件证件照校验（ATTACHMENT_ID_CARD）等配置必须引用后端实际返回值。
 */
export function extractPersonalSignatoryFlag(resp: ApiResponse): string | undefined {
  const signatories = getResponseSignatories(resp)
  const personal = signatories?.find((s: any) => s && s.sigType === 'PERSONAL')
  return personal?.signatoryFlag
}

/** 兼容多种可能的响应结构，取出 signatories 数组 */
function getResponseSignatories(resp: ApiResponse): any[] | undefined {
  const r: any = resp?.result
  if (!r) return undefined
  if (Array.isArray(r.categoryConfig?.flowDefine?.signatories)) return r.categoryConfig.flowDefine.signatories
  if (Array.isArray(r.signatories)) return r.signatories
  if (Array.isArray(r)) return r
  return undefined
}

/**
 * 附件证件照校验（ATTACHMENT_ID_CARD）配置 value 处理：
 * 将 flowSignatories[].flowSignatoryFlag 替换为「修改签署方」返回的 PERSONAL 实际 flag。
 * 接口不允许使用前端占位 flag，必须引用后端实际生成的 signatoryFlag。
 */
function resolveAttachmentIdCardValue(value: any, personalFlag: string): any {
  if (!value || !Array.isArray(value.flowSignatories)) return value
  return {
    ...value,
    flowSignatories: value.flowSignatories.map((s: any) => ({
      ...s,
      flowSignatoryFlag: personalFlag,
    })),
  }
}

/**
 * 业务 JSON 拆解为串行调用计划（不实际执行）
 * 用于「预览调用计划」或执行前展示
 *
 * @param json 业务 JSON
 * @param categoryId 假设的 categoryId（步骤1 未执行时传 0 占位）
 * @returns 调用计划数组，每项 { step, key, request }
 *          - signatory.enable=false 时该项不存在
 *          - configs.enable=false 的项被过滤
 */
export function decomposeBusinessJson(
  json: BusinessJson,
  categoryId: string | number = 0,
): Array<{ step: number; key: string; request: CategoryRequest }> {
  const plan: Array<{ step: number; key: string; request: CategoryRequest }> = []

  // 步骤1：CREATE_CATEGORY
  plan.push({
    step: 1,
    key: 'CREATE_CATEGORY',
    request: buildCreateCategoryRequest(json.meta),
  })

  // 步骤2：SIGNATORY（enable=false 跳过）
  const signatoryReq = buildSignatoryRequest(json.meta, categoryId, json.signatory)
  if (signatoryReq) {
    plan.push({
      step: 2,
      key: 'SIGNATORY',
      request: signatoryReq,
    })
  }

  // 步骤3+：configs（enable=false 跳过）
  let step = signatoryReq ? 3 : 2
  json.configs.forEach((item) => {
    if (!item.enable) return
    plan.push({
      step,
      key: item.key,
      request: buildConfigRequest(json.meta, categoryId, item),
    })
    step++
  })

  return plan
}

/**
 * 串行执行流程（文档1 §2 + §7）
 *
 * 执行顺序：
 *   1. CREATE_CATEGORY → 取 result.id 作为 categoryId
 *   2. SIGNATORY（enable=false 跳过）
 *   3. configs 遍历（enable=false 跳过，按数组顺序串行）
 *
 * 异常处理（文档7）：
 *   - 任意一步 code != 0 或网络异常 → 立即终止
 *   - 网络异常重试 3 次（指数退避 1s→2s→4s），由 apiInvoke 内部实现
 *   - 业务失败不重试
 *   - 失败后已创建的 categoryId 不回滚
 *
 * @param json 业务 JSON
 * @param apiInvoke 单次接口调用函数（需内部处理重试）
 * @param onStepStart 步骤开始回调
 * @param onStepSuccess 步骤成功回调
 * @param onStepError 步骤失败回调
 */
export async function runFlow(
  json: BusinessJson,
  apiInvoke: (req: CategoryRequest) => Promise<ApiResponse>,
  options?: {
    /** 演示模式：创建流程 + 修改签署方接口成功后，其余配置接口视为成功（不实际调用） */
    demoMode?: boolean
    onStepStart?: (step: number, key: string, req: CategoryRequest) => void
    onStepSuccess?: (step: number, key: string, resp: ApiResponse) => void
    onStepError?: (step: number, key: string, resp: ApiResponse | null, err: Error | null) => void
  },
): Promise<FlowResult> {
  /** 演示模式开关 */
  const demoMode = options?.demoMode ?? false

  // ===== 步骤1：CREATE_CATEGORY =====
  const step1Req = buildCreateCategoryRequest(json.meta)
  options?.onStepStart?.(1, 'CREATE_CATEGORY', step1Req)

  let step1Resp: ApiResponse
  try {
    step1Resp = await apiInvoke(step1Req)
  } catch (err: any) {
    const flowErr: FlowError = {
      step: 1,
      key: 'CREATE_CATEGORY',
      message: err?.message || '网络异常',
      isNetwork: true,
    }
    options?.onStepError?.(1, 'CREATE_CATEGORY', null, err)
    return { ok: false, error: flowErr }
  }

  // 业务失败 code != 0
  if (step1Resp.code !== 0) {
    const flowErr: FlowError = {
      step: 1,
      key: 'CREATE_CATEGORY',
      code: step1Resp.code,
      message: step1Resp.message,
      isNetwork: false,
    }
    options?.onStepError?.(1, 'CREATE_CATEGORY', step1Resp, null)
    return { ok: false, error: flowErr }
  }

  // 取 result.id 作为 categoryId（文档1 §3.4）
  const rawId: any = step1Resp.result?.id
  let categoryId: string | number
  if (typeof rawId === 'number' && Number.isInteger(rawId)) {
    categoryId = rawId
  } else if (typeof rawId === 'string' && /^\d+$/.test(rawId)) {
    categoryId = rawId
  } else {
    const flowErr: FlowError = {
      step: 1,
      key: 'CREATE_CATEGORY',
      message: '响应 result.id 不是合法 ID（应为整数或数字字符串）',
      isNetwork: false,
    }
    options?.onStepError?.(1, 'CREATE_CATEGORY', step1Resp, null)
    return { ok: false, error: flowErr }
  }
  options?.onStepSuccess?.(1, 'CREATE_CATEGORY', step1Resp)

  // ===== 步骤2：SIGNATORY（enable=false 跳过） =====
  let personalSignatoryFlag: string | undefined
  const step2Req = buildSignatoryRequest(json.meta, categoryId, json.signatory)
  if (step2Req) {
    options?.onStepStart?.(2, 'SIGNATORY', step2Req)
    let step2Resp: ApiResponse
    try {
      step2Resp = await apiInvoke(step2Req)
    } catch (err: any) {
      const flowErr: FlowError = {
        step: 2,
        key: 'SIGNATORY',
        message: err?.message || '网络异常',
        isNetwork: true,
      }
      options?.onStepError?.(2, 'SIGNATORY', null, err)
      return { ok: false, categoryId, error: flowErr }
    }
    if (step2Resp.code !== 0) {
      const flowErr: FlowError = {
        step: 2,
        key: 'SIGNATORY',
        code: step2Resp.code,
        message: step2Resp.message,
        isNetwork: false,
      }
      options?.onStepError?.(2, 'SIGNATORY', step2Resp, null)
      return { ok: false, categoryId, error: flowErr }
    }
    options?.onStepSuccess?.(2, 'SIGNATORY', step2Resp)
    personalSignatoryFlag = extractPersonalSignatoryFlag(step2Resp)
  }

  // ===== 步骤3+：configs 遍历 =====
  let currentStep = step2Req ? 3 : 2
  for (const item of json.configs) {
    if (!item.enable) continue

    const reqItem =
      item.key === 'ATTACHMENT_ID_CARD' && personalSignatoryFlag
        ? { ...item, value: resolveAttachmentIdCardValue(item.value, personalSignatoryFlag) }
        : item
    const req = buildConfigRequest(json.meta, categoryId, reqItem)
    options?.onStepStart?.(currentStep, item.key, req)

    /**
     * ★ 演示模式：
     *   CREATE_CATEGORY + SIGNATORY 已成功 → 其余配置接口直接视为成功，
     *   不实际调用 API，模拟成功响应以展示完整进度体验。
     */
    if (demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 300)) // 微小延迟保证 UI 刷新
      options?.onStepSuccess?.(currentStep, item.key, { code: 0, message: '演示模式自动成功', result: {} })
      currentStep++
      continue
    }

    // 正常模式：实际调用接口
    let resp: ApiResponse
    try {
      resp = await apiInvoke(req)
    } catch (err: any) {
      const flowErr: FlowError = {
        step: currentStep,
        key: item.key,
        message: err?.message || '网络异常',
        isNetwork: true,
      }
      options?.onStepError?.(currentStep, item.key, null, err)
      return { ok: false, categoryId, error: flowErr }
    }
    if (resp.code !== 0) {
      const flowErr: FlowError = {
        step: currentStep,
        key: item.key,
        code: resp.code,
        message: resp.message,
        isNetwork: false,
      }
      options?.onStepError?.(currentStep, item.key, resp, null)
      return { ok: false, categoryId, error: flowErr }
    }
    options?.onStepSuccess?.(currentStep, item.key, resp)
    currentStep++
  }

  return { ok: true, categoryId }
}
