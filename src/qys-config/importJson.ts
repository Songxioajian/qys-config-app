/**
 * 导入智能体输出 JSON 的解析与规范化
 *
 * 职责：
 *   - 解析粘贴的 JSON 文本
 *   - Schema 校验
 *   - 补全缺失的 configs 项（智能体输出可能只含部分 key，缺失项补默认 value + enable=false）
 *   - 返回可直接回填到 reactive 的 BusinessJson
 *
 * 对应文档：《解析智能体输出JSON约束规范》§3 缺省/未启用功能填充规则
 *
 * 用户需求对应：临时功能-解析智能体输出JSON弹窗
 */

import type { BusinessJson, ConfigItem, ConfigKey } from './types'
import { CONFIG_KEY_LIST, CONFIG_DEFAULT_VALUES, VALID_CONFIG_KEYS } from './constants'
import { validateSchema } from './validate'
import { deepClone } from './helpers'

export interface ImportResult {
  ok: boolean
  data?: BusinessJson
  error?: string
}

/**
 * 解析并规范化智能体输出的 JSON
 *
 * @param text 粘贴的 JSON 文本
 * @returns ImportResult
 */
export function parseImportedJson(text: string): ImportResult {
  // 1. JSON 解析
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch (err: any) {
    return { ok: false, error: 'JSON 格式错误：' + (err?.message || '解析失败') }
  }

  // 2. Schema 校验
  const schemaRes = validateSchema(parsed)
  if (!schemaRes.ok) {
    return { ok: false, error: 'Schema 校验失败：' + schemaRes.errors[0].msg }
  }

  // 3. 规范化：补全缺失的 configs 项
  const normalized = normalizeConfigs(parsed)

  return { ok: true, data: normalized }
}

/**
 * 规范化 configs：
 *   - 过滤掉非法 key 的项
 *   - 按 CONFIG_KEY_LIST 顺序补全缺失项（enable=false + 默认 value）
 *   - 保留智能体输出的 enable / value
 */
function normalizeConfigs(parsed: any): BusinessJson {
  const inputConfigs: any[] = Array.isArray(parsed.configs) ? parsed.configs : []
  // 以 key 为索引建立映射
  const map: Record<string, any> = {}
  for (const item of inputConfigs) {
    if (item && typeof item === 'object' && typeof item.key === 'string' && VALID_CONFIG_KEYS.has(item.key)) {
      map[item.key] = {
        key: item.key,
        enable: !!item.enable,
        value: (item.value && typeof item.value === 'object') ? item.value : {},
      }
    }
  }

  // 按 CONFIG_KEY_LIST 顺序生成完整 configs
  const configs: ConfigItem[] = CONFIG_KEY_LIST.map((key: ConfigKey) => {
    let item: ConfigItem
    if (map[key]) {
      item = map[key]
    } else {
      // 缺失项补默认
      item = {
        key,
        enable: false,
        value: deepClone(CONFIG_DEFAULT_VALUES[key]),
      }
    }
    // 业务规则：传入的「在线模板（绑定模板）」一律在渲染时关闭，忽略其开启状态。
    // 即使导入 JSON 中 TEMPLATE_BINDING.enable=true，也强制置为 false，避免误启用模板。
    if (key === 'TEMPLATE_BINDING') {
      return { ...item, enable: false }
    }
    return item
  })

  return {
    meta: {
      employeeId: String(parsed.meta?.employeeId ?? ''),
      categoryName: String(parsed.meta?.categoryName ?? ''),
      categoryType: parsed.meta?.categoryType ?? 'ELECTRONIC',
      categoryId: Number(parsed.meta?.categoryId ?? 0) || 0,
    },
    signatory: {
      enable: !!parsed.signatory?.enable,
      value: parsed.signatory?.value ?? { flowMode: 'NON_DEFINE', receiveType: 'SEQ', flowSignatories: [] },
    },
    configs,
  }
}
