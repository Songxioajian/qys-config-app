/**
 * 手写简化 Schema 校验 + 本地必填校验 + 错误信息格式化
 *
 * 对应文档：
 *  - 《解析智能体输出JSON约束规范》§4 校验覆盖项（Schema 强约束）
 *  - 《前端页面模块拆分与交互逻辑方案》§6.2 生成流程前的本地校验
 *  - 《业务JSON转后端接口请求转换规则说明书》§7.3 错误信息展示逻辑
 *
 * 用户需求对应：⑤ 核心工具函数：异常捕获
 */

import type {
  BusinessJson,
  SchemaError,
  FieldError,
  FlowError,
  Meta,
  Signatory,
} from './types'
import { VALID_CONFIG_KEYS, VALID_CATEGORY_TYPES } from './constants'

/**
 * 手写简化 Schema 校验
 * 覆盖文档4 §4.3 强制校验项：
 *   1. 顶层仅 meta / signatory / configs
 *   2. meta 仅 4 字段，categoryType 枚举
 *   3. signatory 仅 enable / value
 *   4. configs 每项仅 key / enable / value
 *   5. configs[i].key 为 23 个合法枚举之一
 *   6. configs[i].value 为 object
 *   7. meta.categoryId 为 integer ≥ 0
 */
export function validateSchema(json: any): { ok: boolean; errors: SchemaError[] } {
  const errors: SchemaError[] = []

  // 1. 顶层结构
  if (!json || typeof json !== 'object') {
    errors.push({ path: 'root', type: 'type', msg: '根节点必须为对象' })
    return { ok: false, errors }
  }

  const TOP_KEYS = new Set(['meta', 'signatory', 'configs'])
  Object.keys(json).forEach((k) => {
    if (!TOP_KEYS.has(k)) {
      errors.push({ path: k, type: 'extra', msg: `顶层不允许字段 "${k}"，仅允许 meta/signatory/configs` })
    }
  })
  ;['meta', 'signatory', 'configs'].forEach((k) => {
    if (!(k in json)) {
      errors.push({ path: k, type: 'missing', msg: `缺少必填顶层字段 "${k}"` })
    }
  })

  // 2. meta 校验
  if (json.meta) {
    const metaErrors = validateMeta(json.meta)
    errors.push(...metaErrors)
  }

  // 3. signatory 校验
  if (json.signatory) {
    const sigErrors = validateSignatory(json.signatory)
    errors.push(...sigErrors)
  }

  // 4. configs 校验
  if (json.configs !== undefined) {
    if (!Array.isArray(json.configs)) {
      errors.push({ path: 'configs', type: 'type', msg: 'configs 必须为数组' })
    } else {
      json.configs.forEach((item: any, idx: number) => {
        const path = `configs[${idx}]`
        if (!item || typeof item !== 'object') {
          errors.push({ path, type: 'type', msg: `${path} 必须为对象` })
          return
        }
        const allowed = new Set(['key', 'enable', 'value'])
        Object.keys(item).forEach((k) => {
          if (!allowed.has(k)) {
            errors.push({ path: `${path}.${k}`, type: 'extra', msg: `${path} 不允许字段 "${k}"` })
          }
        })
        ;['key', 'enable', 'value'].forEach((k) => {
          if (!(k in item)) {
            errors.push({ path: `${path}.${k}`, type: 'missing', msg: `${path} 缺少字段 "${k}"` })
          }
        })
        if (item.key !== undefined && !VALID_CONFIG_KEYS.has(item.key)) {
          errors.push({
            path: `${path}.key`,
            type: 'enum',
            msg: `${path}.key "${item.key}" 不在 23 个合法枚举中`,
          })
        }
        if (item.value !== undefined && (typeof item.value !== 'object' || Array.isArray(item.value) || item.value === null)) {
          errors.push({ path: `${path}.value`, type: 'type', msg: `${path}.value 必须为 object` })
        }
      })
    }
  }

  return { ok: errors.length === 0, errors }
}

/** meta 层校验 */
function validateMeta(meta: any): SchemaError[] {
  const errors: SchemaError[] = []
  const path = 'meta'
  if (!meta || typeof meta !== 'object') {
    errors.push({ path, type: 'type', msg: 'meta 必须为对象' })
    return errors
  }
  const allowed = new Set(['employeeId', 'categoryName', 'categoryType', 'categoryId'])
  Object.keys(meta).forEach((k) => {
    if (!allowed.has(k)) {
      errors.push({ path: `${path}.${k}`, type: 'extra', msg: `meta 不允许字段 "${k}"` })
    }
  })
  ;['employeeId', 'categoryName', 'categoryType', 'categoryId'].forEach((k) => {
    if (!(k in meta)) {
      errors.push({ path: `${path}.${k}`, type: 'missing', msg: `meta 缺少字段 "${k}"` })
    }
  })
  if (meta.categoryType !== undefined && !VALID_CATEGORY_TYPES.has(meta.categoryType)) {
    errors.push({
      path: `${path}.categoryType`,
      type: 'enum',
      msg: `meta.categoryType 必须为 ELECTRONIC 或 ELECTRONIC_OFD`,
    })
  }
  if (meta.categoryId !== undefined) {
    // categoryId 在「新建态」为 0（number），生成成功后被后端回填为长整数字符串（文档1 §0.1 大整数为字符串），
    // 因此校验同时允许：非负整数 number，或纯数字组成的非负整数字符串（空字符串视为非法）。
    const cid = meta.categoryId
    const isNumberOk = typeof cid === 'number' && Number.isInteger(cid) && cid >= 0
    const isStringOk = typeof cid === 'string' && cid.trim() !== '' && /^\d+$/.test(cid.trim())
    if (!isNumberOk && !isStringOk) {
      errors.push({
        path: `${path}.categoryId`,
        type: 'type',
        msg: `meta.categoryId 必须为非负整数或非负整数字符串`,
      })
    }
  }
  return errors
}

/** signatory 层校验 */
function validateSignatory(sig: any): SchemaError[] {
  const errors: SchemaError[] = []
  const path = 'signatory'
  if (!sig || typeof sig !== 'object') {
    errors.push({ path, type: 'type', msg: 'signatory 必须为对象' })
    return errors
  }
  const allowed = new Set(['enable', 'value'])
  Object.keys(sig).forEach((k) => {
    if (!allowed.has(k)) {
      errors.push({ path: `${path}.${k}`, type: 'extra', msg: `signatory 不允许字段 "${k}"` })
    }
  })
  ;['enable', 'value'].forEach((k) => {
    if (!(k in sig)) {
      errors.push({ path: `${path}.${k}`, type: 'missing', msg: `signatory 缺少字段 "${k}"` })
    }
  })
  if (sig.value !== undefined && (typeof sig.value !== 'object' || Array.isArray(sig.value) || sig.value === null)) {
    errors.push({ path: `${path}.value`, type: 'type', msg: `signatory.value 必须为 object` })
  }
  return errors
}

/**
 * 生成前本地必填校验（文档3 §6.2）
 * 校验项：
 *   1. meta.employeeId 非空
 *   2. meta.categoryName 非空
 *   3. meta.categoryType 为合法枚举
 *   4. signatory.enable=true 时，DEFINE/DEFINE_CHANGE 模式下 flowSignatories 至少 1 条
 *   5. SIGN_EXPIRE_DATE 自定义模式下 days > 0
 *   6. ATTACHMENT_ID_CARD 的 attachmentRules[].checkMode 合法
 */
export function validateBeforeGenerate(json: BusinessJson): { ok: boolean; errors: FieldError[] } {
  const errors: FieldError[] = []
  const meta: Meta = json.meta
  const sig: Signatory = json.signatory

  // 1. employeeId 非空
  if (!meta.employeeId || !meta.employeeId.trim()) {
    errors.push({ path: 'meta.employeeId', msg: '员工 ID 不能为空' })
  }
  // 2. categoryName 非空
  if (!meta.categoryName || !meta.categoryName.trim()) {
    errors.push({ path: 'meta.categoryName', msg: '流程名称不能为空' })
  }
  // 3. categoryType 合法
  if (!VALID_CATEGORY_TYPES.has(meta.categoryType)) {
    errors.push({ path: 'meta.categoryType', msg: '流程类型必须为 ELECTRONIC 或 ELECTRONIC_OFD' })
  }

  // 4. signatory.enable=true 时校验
  if (sig.enable) {
    const v = sig.value
    if (!v) {
      errors.push({ path: 'signatory.value', msg: '签署方启用但 value 为空' })
    } else {
      // DEFINE / DEFINE_CHANGE 模式下 flowSignatories 至少 1 条
      if ((v.flowMode === 'DEFINE' || v.flowMode === 'DEFINE_CHANGE') && (!v.flowSignatories || v.flowSignatories.length === 0)) {
        errors.push({
          path: 'signatory.value.flowSignatories',
          msg: `${v.flowMode === 'DEFINE' ? '预设' : '预设允许修改'}模式下签署方至少 1 条`,
        })
      }
      // 校验 flowSignatoryFlag 唯一
      if (v.flowSignatories && v.flowSignatories.length > 0) {
        const flags = new Set<string>()
        v.flowSignatories.forEach((s, idx) => {
          if (!s.flowSignatoryFlag) {
            errors.push({ path: `signatory.value.flowSignatories[${idx}].flowSignatoryFlag`, msg: `第 ${idx + 1} 个签署方标识为空` })
          } else if (flags.has(s.flowSignatoryFlag)) {
            errors.push({ path: `signatory.value.flowSignatories[${idx}].flowSignatoryFlag`, msg: `签署方标识 "${s.flowSignatoryFlag}" 重复` })
          } else {
            flags.add(s.flowSignatoryFlag)
          }
        })
      }
    }
  }

  // 5. configs 启用项的必填字段
  json.configs.forEach((item, idx) => {
    if (!item.enable) return
    const v = item.value
    const path = `configs[${idx}].value`

    // SIGN_EXPIRE_DATE 自定义模式下 days > 0
    if (item.key === 'SIGN_EXPIRE_DATE') {
      if (v.expireKind === 'CUSTOM' && v.daysType === 'ASSIGN_DAYS') {
        if (typeof v.days !== 'number' || v.days <= 0 || !Number.isInteger(v.days)) {
          errors.push({ path: `${path}.days`, msg: 'SIGN_EXPIRE_DATE 自定义指定天数模式下 days 必须为正整数' })
        }
      }
    }

    // ATTACHMENT_ID_CARD 的 attachmentRules[].checkMode 合法
    if (item.key === 'ATTACHMENT_ID_CARD') {
      const validCheckModes = new Set(['NONE', 'IDCARD_FACE', 'IDCARD_NATIONAL'])
      if (Array.isArray(v.flowSignatories)) {
        v.flowSignatories.forEach((s: any, sIdx: number) => {
          if (Array.isArray(s.attachmentRules)) {
            s.attachmentRules.forEach((r: any, rIdx: number) => {
              if (r.checkMode !== undefined && !validCheckModes.has(r.checkMode)) {
                errors.push({
                  path: `${path}.flowSignatories[${sIdx}].attachmentRules[${rIdx}].checkMode`,
                  msg: `ATTACHMENT_ID_CARD 校验模式 "${r.checkMode}" 不合法`,
                })
              }
            })
          }
        })
      }
    }
  })

  return { ok: errors.length === 0, errors }
}

/**
 * 格式化串行流程错误信息（文档7.3）
 * 输出格式：
 *   [流程创建失败] 步骤：SIGN_EXPIRE_DATE（第4步）
 *   接口返回：code=1003，message="days 字段必须为正整数"
 *   建议：请检查 SIGN_EXPIRE_DATE 配置中的 days 取值。
 */
export function formatFlowError(err: FlowError): string {
  const stepName = err.key
  const lines: string[] = []
  lines.push(`[流程创建失败] 步骤：${stepName}（第${err.step}步）`)
  if (err.isNetwork) {
    lines.push(`网络异常，重试 3 次仍失败：${err.message}`)
  } else {
    lines.push(`接口返回：code=${err.code ?? 'unknown'}，message="${err.message}"`)
  }
  lines.push(`建议：请检查 ${stepName} 配置项的取值。`)
  return lines.join('\n')
}
