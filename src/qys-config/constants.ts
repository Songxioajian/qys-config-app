/**
 * 全局常量文件（配置驱动版）
 *
 * 对应文档：《全局统一枚举字典》（文档2）
 *
 * 【配置驱动】所有 configKey 列表 / 中文表 / 分类表 / 默认 value 表
 * 均从 `前端配置清单_manifest.json` 派生，不再硬编码。
 * 新增配置项只需更新 manifest.json，本文件自动跟随。
 *
 * 用户需求对应：① 全局常量文件：枚举映射、configKey 中文对照表（配置驱动版）
 */

import type {
  CategoryType,
  FlowMode,
  ReceiveType,
  FlowSignatoryKind,
  FlowActionKind,
  ExpireKind,
  DaysType,
  CheckKind,
  CheckMode,
  FdaSignStyle,
  ConfigCategory,
} from './types'
import {
  manifest,
  manifestKeyList,
  getEnumOptions,
} from './manifest'

/** 下拉选项通用结构 */
export interface Option<T extends string = string> {
  value: T
  label: string
}

// ============ 模块一：业务枚举（从 manifest 派生） ============

/** §1.1 用印流程类型 */
export const ENUM_CATEGORY_TYPE = getEnumOptions('categoryType') as Option<CategoryType>[]

/** §1.2 流程模式 */
export const ENUM_FLOW_MODE = getEnumOptions('flowMode') as Option<FlowMode>[]

/** §1.3 接收顺序 */
export const ENUM_RECEIVE_TYPE = getEnumOptions('receiveType') as Option<ReceiveType>[]

/** §1.4 签署方类型 */
export const ENUM_FLOW_SIGNATORY_KIND = getEnumOptions('flowSignatoryKind') as Option<FlowSignatoryKind>[]

/** §1.5 签署节点类型 */
export const ENUM_FLOW_ACTION_KIND = getEnumOptions('flowActionKind') as Option<FlowActionKind>[]

/** §1.6 截止日期类型 */
export const ENUM_EXPIRE_KIND = getEnumOptions('expireKind') as Option<ExpireKind>[]

/** §1.7 天数类型 */
export const ENUM_DAYS_TYPE = getEnumOptions('daysType') as Option<DaysType>[]

/** §1.8 空白检测要求 */
export const ENUM_CHECK_KIND = getEnumOptions('checkKind') as Option<CheckKind>[]

/** §1.9 附件校验模式 */
export const ENUM_CHECK_MODE = getEnumOptions('checkMode') as Option<CheckMode>[]

/** §1.10 FDA 签名样式 */
export const ENUM_FDA_SIGN_STYLE = getEnumOptions('fdaSignStyle') as Option<FdaSignStyle>[]

// ============ 模块二：configs 配置 Key（从 manifest 派生） ============

/** 所有 configKey 列表（顺序与 manifest 一致，用于初始化 / 遍历） */
export const CONFIG_KEY_LIST = manifestKeyList as any[]

/** configKey 中文释义表（从 manifest 派生） */
export const CONFIG_KEY_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  manifest.configKeys.forEach((k) => { m[k.key] = k.label })
  return m
})()

/** configKey 所属分类表（从 manifest 派生，Partial 类型，缺失兜底 'other'） */
export const CONFIG_KEY_CATEGORY: Partial<Record<string, ConfigCategory>> = (() => {
  const m: Partial<Record<string, ConfigCategory>> = {}
  manifest.configKeys.forEach((k) => { m[k.key] = k.category })
  return m
})()

/** 各配置项默认 value 表（从 manifest 派生） */
export const CONFIG_DEFAULT_VALUES: Record<string, Record<string, any>> = (() => {
  const m: Record<string, Record<string, any>> = {}
  manifest.configKeys.forEach((k) => { m[k.key] = k.defaultValue })
  return m
})()

/** 分类中文标签 */
export const CATEGORY_LABEL: Record<ConfigCategory, string> = {
  time: '签署时效与文件管理',
  security: '签署安全与校验',
  convenient: '签署便捷能力',
  other: '其他配置',
}

/** 取某个 key 的分类，未指定或不存在则兜底 'other' */
export function getCategoryOf(key: string): ConfigCategory {
  return CONFIG_KEY_CATEGORY[key] ?? 'other'
}

/** 用于本地校验的合法 configKey 集合 */
export const VALID_CONFIG_KEYS = new Set<string>(manifestKeyList)

/** 用于本地校验的合法 categoryType 集合 */
export const VALID_CATEGORY_TYPES = new Set<string>(
  ENUM_CATEGORY_TYPE.map((o) => o.value),
)
