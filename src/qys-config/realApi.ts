/**
 * 真实接口请求实现
 *
 * 对应文档：《业务JSON转后端接口请求转换规则说明书》§1 接口核心调用规则
 *
 * 实现：
 *   - 用 axios 发送 POST 请求到 {API_BASE_URL}/api/category/manage/v2
 *   - 打印每步完整请求体 + 响应（保留 mock 时的调试体验）
 *   - 网络异常重试 3 次（指数退避 1s→2s→4s，文档7.2）
 *   - 业务 code != 0 直接抛出，由 runFlow 终止
 *
 * 【配置方式】直接改下面 API_BASE_URL / API_TIMEOUT 即可，无需 .env：
 *   1. 把 API_BASE_URL 改成你的后端地址（末尾不要加 /）
 *   2. 去 api.ts 把 USE_REAL 改成 true
 *
 * 用户需求对应：真实接口替换 mock
 */

import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'
import type { CategoryRequest, ApiResponse } from './types'
import { delay } from './helpers'

/** 接口路径（文档1 §1，固定） */
const API_PATH = '/api/category/manage/v2'

/** 网络异常最大重试次数（文档7.2） */
const MAX_RETRY = 3

/** 指数退避基础延迟（ms）：1s → 2s → 4s */
const RETRY_BACKOFF_BASE = 1000

// ============================================================
//  ★ 真实接口配置：直接改这里，无需 .env
// ============================================================
/** 接口 baseURL（末尾不要加 /） */
const API_BASE_URL = 'https://app74.qiyuesuo.cn'
/** 请求超时（毫秒） */
const API_TIMEOUT = 15000
// ============================================================

// ============================================================
//  ★ 「去发起文件」跳转配置：直接改这里，无需 .env
//    目标新页面地址 = API_BASE_URL + INITIATE_FILE_PATH + 查询参数(categoryId & token)
// ============================================================
/** 跳转「去发起文件」页面的路径（拼接在 API_BASE_URL 之后，可手动修改） */
const INITIATE_FILE_PATH = '/launch/contract'
/** ★ 默认 token：请手动替换为真实有效的 token */
const INITIATE_FILE_TOKEN = 'siLtVqtS3%2BoNtWUTdXTH5Q%3D%3D'
/** token 查询参数名（一般固定，按需修改） */
const INITIATE_FILE_TOKEN_KEY = 'pocToken'

/**
 * 构建「去发起文件」跳转地址（新页面 URL）
 * 格式：{API_BASE_URL}{INITIATE_FILE_PATH}?categoryId={cid}&{tokenKey}={token}
 */
export function buildInitiateFileUrl(categoryId: number | string): string {
  // INITIATE_FILE_TOKEN 已是 URL 编码值（如 %2B、%3D），先解码再交给
  // URLSearchParams 统一编码，避免 % 被二次编码成 %25
  const params = new URLSearchParams()
  params.set('categoryId', String(categoryId))
  params.set(INITIATE_FILE_TOKEN_KEY, decodeURIComponent(INITIATE_FILE_TOKEN))
  return `${API_BASE_URL}${INITIATE_FILE_PATH}?${params.toString()}`
}

/** axios 实例（单例） */
const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 判断是否可重试（文档7.2）
 *   - 网络错误 / 超时 / 5xx → 重试
 *   - 4xx → 不重试
 */
function isRetryable(err: AxiosError): boolean {
  // 无响应（网络错误 / 超时 / CORS）
  if (!err.response) return true
  const status = err.response.status
  return status >= 500
}

/**
 * 真实单次接口调用
 * - 打印完整请求体
 * - POST 到 {baseURL}/api/category/manage/v2
 * - 返回 ApiResponse
 *
 * 抛出错误的情况：
 *   - 网络异常 / 超时 → 抛 AxiosError（由上层重试）
 *   - HTTP 4xx/5xx → 抛 AxiosError
 *   - 业务 code != 0 → 不抛错，返回 ApiResponse（由 runFlow 判断终止）
 */
export async function realInvoke(req: CategoryRequest): Promise<ApiResponse> {
  // ★ 打印完整请求体（保留 mock 时的调试体验）
  console.log(
    `%c[RealAPI] POST ${API_BASE_URL}${API_PATH}`,
    'color:#409EFF;font-weight:bold;',
  )
  console.log('请求体：')
  console.log(JSON.stringify(req, null, 2))

  const resp = await http.post<ApiResponse>(API_PATH, req)
  const data = resp.data

  console.log('%c响应：', 'color:#67C23A;')
  console.log(JSON.stringify(data, null, 2))

  return data
}

/**
 * 带重试的接口调用（文档7.2）
 * 网络超时 / 5xx → 重试 3 次，指数退避 1s→2s→4s
 * 4xx / 业务失败 → 不重试
 */
export async function realInvokeWithRetry(req: CategoryRequest): Promise<ApiResponse> {
  let lastErr: Error | null = null
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      return await realInvoke(req)
    } catch (err: any) {
      lastErr = err
      // 业务层错误（code != 0）不抛错，不会进这里
      // 进这里的都是网络/HTTP 错误
      const isRetry = err instanceof AxiosError ? isRetryable(err) : true
      if (!isRetry || attempt >= MAX_RETRY - 1) {
        throw err
      }
      const backoff = RETRY_BACKOFF_BASE * Math.pow(2, attempt)
      console.warn(
        `%c[RealAPI] ${err.message}，${backoff}ms 后重试（第 ${attempt + 1}/${MAX_RETRY} 次）`,
        'color:#E6A23C;',
      )
      await delay(backoff)
    }
  }
  throw lastErr || new Error('网络异常，重试耗尽')
}
