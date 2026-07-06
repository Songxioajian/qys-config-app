/**
 * 初始空 JSON 工厂
 *
 * 对应文档：《解析智能体输出JSON约束规范》§3 缺省/未启用功能填充规则
 *
 * 用户需求对应：⑦ 重置按钮恢复初始空态
 */

import type { BusinessJson, ConfigItem } from './types'
import { CONFIG_DEFAULT_VALUES, CONFIG_KEY_LIST } from './constants'
import { deepClone } from './helpers'

/**
 * 创建 23 项默认 configs 数组
 * 每项 enable=false，value 取自 CONFIG_DEFAULT_VALUES
 */
export function createDefaultConfigs(): ConfigItem[] {
  return CONFIG_KEY_LIST.map((key) => ({
    key,
    enable: false,
    value: deepClone(CONFIG_DEFAULT_VALUES[key]),
  }))
}

/**
 * 创建初始空业务 JSON（文档4 §3.4 meta 缺省 / §3.3 signatory 缺省 / §3.1 configs 默认）
 */
export function createEmptyBusinessJson(): BusinessJson {
  return {
    meta: {
      // ★★★ 上线时务必修改为正式员工 ID ★★★
      employeeId: '3469234491428114838',
      categoryName: '',
      categoryType: 'ELECTRONIC',
      categoryId: 0,
    },
    signatory: {
      enable: false,
      value: {
        flowMode: 'NON_DEFINE',
        receiveType: 'SEQ',
        flowSignatories: [],
      },
    },
    configs: createDefaultConfigs(),
  }
}

/**
 * 加载渲染样例 JSON（文档5.2 完整复杂配置流程）
 * 用于「载入示例」按钮，便于快速预览效果
 */
export function createSampleBusinessJson(): BusinessJson {
  return {
    meta: {
      employeeId: '3469234491428114838',
      categoryName: '标准采购合同流程',
      categoryType: 'ELECTRONIC',
      categoryId: 0,
    },
    signatory: {
      enable: true,
      value: {
        flowMode: 'DEFINE',
        receiveType: 'SEQ',
        flowSignatories: [
          {
            flowSignatoryFlag: 'S1',
            flowSignatoryKind: 'SENDER',
            flowActions: [{ flowActionFlag: 'A1', flowActionKind: 'CORPORATE_NODE' }],
          },
          {
            flowSignatoryFlag: 'S2',
            flowSignatoryKind: 'OUTER',
            flowActions: [
              { flowActionFlag: 'A2', flowActionKind: 'AUDIT_NODE' },
              { flowActionFlag: 'A3', flowActionKind: 'CORPORATE_NODE' },
            ],
          },
        ],
      },
    },
    configs: [
      { key: 'SCHEDULE_SEND', enable: true, value: { enable: true } },
      {
        key: 'SIGN_EXPIRE_DATE',
        enable: true,
        value: { expireKind: 'CUSTOM', daysType: 'ASSIGN_DAYS', days: 30, allowOperatorChange: true },
      },
      { key: 'END_TIME', enable: true, value: { enableEndTime: true, mustFill: false } },
      {
        key: 'SPACE_FILE_CHECK',
        enable: true,
        value: {
          checkKind: 'CUSTOM',
          enableCheckBlankPage: true,
          allowSendOnBlankPage: false,
          allowAppointedSignOnBlankPage: false,
          enableCheckBlankSpace: true,
          allowAppointedSignOnBlankSpace: false,
        },
      },
      { key: 'SHARE_FILE', enable: true, value: { allowShareFile: true } },
      { key: 'MERGE_FILE_SIGN', enable: false, value: { enableMergeFile: false } },
      { key: 'TEMPLATE_BINDING', enable: true, value: { templateIds: [1001, 1002] } },
      { key: 'SIMPLE_SIGN_MODE', enable: false, value: { enableSimpleSignMode: false } },
      { key: 'PRIVATE_SEND_CLOUD_SIGN', enable: false, value: { enableCloudSign: false } },
      { key: 'ALLOW_TERMINATE_PART', enable: true, value: { allowTerminatePart: true } },
      { key: 'SIGN_POSITION_OVERLAP', enable: true, value: { notAllowSignPositionOverlap: true } },
      { key: 'SIGN_REGION', enable: true, value: { allowSpecifySignRegion: true } },
      { key: 'TAMPER_PROOF_SIGN', enable: true, value: { enableTamperProofSign: true } },
      { key: 'PDF_CONVERT_IMAGE', enable: false, value: { enablePdfConvertImage: false } },
      { key: 'NEED_HANDWRITE_SEAL', enable: true, value: { enableHandwriteSeal: true, flowSignatories: [] } },
      { key: 'PERSON_SEAL_CHECK', enable: false, value: { enablePersonSealCheck: false, flowSignatories: [] } },
      {
        key: 'SIGN_RECORD_GPS',
        enable: true,
        value: {
          enableSignRecordGps: true,
          person: { enable: true, mustProvideGps: false },
          department: { enable: false, mustProvideGps: false },
          sender: { enable: true, mustProvideGps: true },
        },
      },
      { key: 'PURPOSE_STAMP', enable: false, value: { enablePurposeStamp: false } },
      {
        key: 'ATTACHMENT_ID_CARD',
        enable: true,
        value: {
          flowSignatories: [
            {
              flowSignatoryFlag: 'S2',
              attachmentRules: [
                { required: true, checkMode: 'IDCARD_FACE' },
                { required: true, checkMode: 'IDCARD_NATIONAL' },
              ],
            },
          ],
        },
      },
      {
        key: 'TURN_TODO',
        enable: true,
        value: { allowTurnTodo: true, flowSignatories: [{ flowSignatoryFlag: 'S2', allowTurnTodo: true }] },
      },
      {
        key: 'SWEEP_CODE_SIGN',
        enable: true,
        value: {
          personSweepCodeSign: true,
          departmentSweepCodeSign: false,
          flowSignatories: [{ flowSignatoryFlag: 'S2', sweepCodeSign: true }],
        },
      },
      { key: 'FACE_SIGN', enable: false, value: { enableFaceSign: false, flowSignatories: [] } },
      {
        key: 'FDA_SIGN',
        enable: true,
        value: {
          enableFda: true,
          fdaSignStyle: 'CN_FDA_LEFT_RIGHT',
          flowSignatories: [{ flowSignatoryFlag: 'S2', enableFda: true, fdaSignStyle: 'CN_FDA_LEFT_RIGHT' }],
        },
      },
    ],
  }
}
