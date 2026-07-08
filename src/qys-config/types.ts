/**
 * 业务渲染 JSON TypeScript 类型定义
 *
 * 对应文档：《解析智能体输出JSON约束规范》§1 顶层结构强制约束
 * 数据模型：顶层仅 meta / signatory / configs 三层，禁止额外字段
 *
 * 用户需求对应：① 全局常量文件的类型基础
 */

/** 用印流程类型枚举（文档2 §1.1） */
export type CategoryType = 'ELECTRONIC' | 'ELECTRONIC_OFD'

/** 流程模式枚举（文档2 §1.2） */
export type FlowMode = 'NON_DEFINE' | 'DEFINE' | 'DEFINE_CHANGE'

/** 接收顺序枚举（文档2 §1.3） */
export type ReceiveType = 'SIMUL' | 'SEQ'

/** 签署方类型枚举（文档2 §1.4） */
export type FlowSignatoryKind = 'SENDER' | 'OUTER' | 'PERSON'

/** 签署节点类型枚举（文档2 §1.5） */
export type FlowActionKind =
  | 'CORPORATE_NODE'
  | 'LP_NODE'
  | 'AUDIT_NODE'
  | 'PERSONAL_NODE'
  | 'OPERATOR_NODE'

/** 截止日期类型枚举（文档2 §1.6） */
export type ExpireKind = 'DEFAULT' | 'CUSTOM'

/** 天数类型枚举（文档2 §1.7） */
export type DaysType = 'ASSIGN_DAYS' | 'DAY_OF_SEND'

/** 空白检测要求枚举（文档2 §1.8） */
export type CheckKind = 'SYSTEM' | 'CUSTOM'

/** 附件校验模式枚举（文档2 §1.9） */
export type CheckMode = 'NONE' | 'IDCARD_FACE' | 'IDCARD_NATIONAL'

/** FDA 签名样式枚举（文档2 §1.10） */
export type FdaSignStyle =
  | 'EN_FDA_LEFT_RIGHT'
  | 'EN_FDA_UP_DOWN'
  | 'CN_FDA_LEFT_RIGHT'
  | 'CN_FDA_UP_DOWN'

/**
 * configs 配置 Key 枚举
 * 【配置驱动】不再写死 23 项，改为 string 兜底，实际合法值由 manifest.json 决定
 * 保留字面量联合仅用于已有 23 项的代码提示，新增 key 无需改这里
 */
export type ConfigKey =
  | 'SCHEDULE_SEND'
  | 'SIGN_EXPIRE_DATE'
  | 'END_TIME'
  | 'SPACE_FILE_CHECK'
  | 'SHARE_FILE'
  | 'MERGE_FILE_SIGN'
  | 'TEMPLATE_BINDING'
  | 'SIMPLE_SIGN_MODE'
  | 'PRIVATE_SEND_CLOUD_SIGN'
  | 'ALLOW_TERMINATE_PART'
  | 'SIGN_POSITION_OVERLAP'
  | 'SIGN_REGION'
  | 'TAMPER_PROOF_SIGN'
  | 'PDF_CONVERT_IMAGE'
  | 'NEED_HANDWRITE_SEAL'
  | 'PERSON_SEAL_CHECK'
  | 'SIGN_RECORD_GPS'
  | 'PURPOSE_STAMP'
  | 'ATTACHMENT_ID_CARD'
  | 'TURN_TODO'
  | 'SWEEP_CODE_SIGN'
  | 'FACE_SIGN'
  | 'FDA_SIGN'
  | (string & {})  // 兜底：允许 manifest 新增的 key 通过类型检查

/** 配置项分类（文档2 模块二「所属分类」列，other 为前端兜底） */
export type ConfigCategory = 'time' | 'security' | 'convenient' | 'other'

/** meta 层（文档4 §1.2，仅 4 字段） */
export interface Meta {
  /** 操作员工 ID，字符串形式防大整数精度丢失（文档1 §0.1） */
  employeeId: string
  /** 用印流程名称 */
  categoryName: string
  /** 用印流程类型 */
  categoryType: CategoryType
  /** 用印流程唯一 ID，新建态填 0，由后端 result.id 回填（大整数可能为字符串，文档1 §0.1） */
  categoryId: number | string
}

/** 签署节点 */
export interface FlowAction {
  flowActionFlag: string
  flowActionKind: FlowActionKind
}

/** 签署方 */
export interface FlowSignatory {
  flowSignatoryFlag: string
  flowSignatoryKind: FlowSignatoryKind
  flowActions: FlowAction[]
}

/** signatory.value 结构 */
export interface SignatoryValue {
  flowMode: FlowMode
  receiveType: ReceiveType
  flowSignatories: FlowSignatory[]
}

/** signatory 层（文档4 §1.3，仅 enable / value 两个字段） */
export interface Signatory {
  enable: boolean
  value: SignatoryValue
}

/** configs 数组项（文档4 §1.4，仅 key / enable / value 三个字段） */
export interface ConfigItem {
  key: ConfigKey
  enable: boolean
  /** value 内部字段因配置项而异，统一用 object 兜底 */
  value: Record<string, any>
}

/** 业务渲染 JSON 顶层结构（文档4 §1.1） */
export interface BusinessJson {
  meta: Meta
  signatory: Signatory
  configs: ConfigItem[]
}

/** 接口请求体（文档1 §1 顶层固定三字段） */
export interface CategoryRequest {
  employeeId: string
  /** 新建流程传空字符串，其余步骤传 result.id（integer） */
  categoryId: string | number
  categoryConfigObject: {
    key: string
    /** value 序列化后的 JSON 字符串 */
    value: string
  }
}

/** 接口响应体（文档1 §3.4） */
export interface ApiResponse {
  code: number
  message: string
  result: any
}

/** Schema 校验错误 */
export interface SchemaError {
  path: string
  type: 'enum' | 'extra' | 'missing' | 'type' | 'value'
  msg: string
}

/** 本地必填校验错误 */
export interface FieldError {
  path: string
  msg: string
}

/** 串行流程错误（文档7.3） */
export interface FlowError {
  /** 步骤序号 1=CREATE_CATEGORY, 2=SIGNATORY, 3+=configs */
  step: number
  /** 步骤名 */
  key: string
  /** 接口返回 code，网络异常时为 undefined */
  code?: number
  /** 错误消息 */
  message: string
  /** 是否网络异常 */
  isNetwork: boolean
}

/** 串行流程执行结果 */
export interface FlowResult {
  ok: boolean
  /** 成功时回填的 categoryId（大整数可能为字符串） */
  categoryId?: number | string
  /** 失败时的错误信息 */
  error?: FlowError
  /** 演示模式下：部分配置接口失败但未阻断流程时，记录失败的 key 列表 */
  failedConfigs?: string[]
}
