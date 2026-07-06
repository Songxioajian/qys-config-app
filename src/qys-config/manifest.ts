/**
 * 配置清单 manifest 加载器
 *
 * 职责：从 `前端配置清单_manifest.json` 读取配置项元数据，作为前端「配置驱动 UI」的唯一数据源。
 *
 * 数据来源：qys-prompt-sync 技能从文档2/文档4派生的 `前端配置清单_manifest.json`
 * 文件位置：项目外 C:\Users\Administrator\Desktop\QYS接口\前端配置清单_manifest.json
 *          构建时通过 vite ?raw 导入，或运行时 fetch
 *
 * 用户需求对应：配置驱动 UI，新增配置项只需更新 manifest，前端零改动自动识别
 */

import manifestRaw from './manifest.json'

/** manifest 中单个配置项定义 */
export interface ManifestConfigKey {
  key: string
  label: string
  category: 'time' | 'security' | 'convenient' | 'other'
  defaultValue: Record<string, any>
  /** 表单类型，决定 ValueFormRenderer 用哪个组件渲染 */
  formType: 'simple-switch' | 'sign-expire-date' | 'space-file-check' | 'template-binding' | 'sign-record-gps' | 'attachment-id-card' | 'flow-signatory-config' | 'custom'
}

/** manifest 中单个枚举组 */
export interface ManifestEnum {
  name: string
  label: string
  options: Array<{ value: string; label: string }>
}

/** manifest 顶层结构 */
export interface Manifest {
  version: string
  generatedAt: string
  description?: string
  configKeys: ManifestConfigKey[]
  enums: ManifestEnum[]
}

/** 加载后的 manifest（单例） */
export const manifest: Manifest = manifestRaw as Manifest

/** configKey → 元数据映射（O(1) 查找） */
export const manifestKeyMap: Record<string, ManifestConfigKey> = (() => {
  const m: Record<string, ManifestConfigKey> = {}
  manifest.configKeys.forEach((k) => { m[k.key] = k })
  return m
})()

/** 枚举名 → 枚举组映射 */
export const manifestEnumMap: Record<string, ManifestEnum> = (() => {
  const m: Record<string, ManifestEnum> = {}
  manifest.enums.forEach((e) => { m[e.name] = e })
  return m
})()

/** 所有 configKey 列表（顺序与 manifest 一致） */
export const manifestKeyList: string[] = manifest.configKeys.map((k) => k.key)

/** 取某个 key 的元数据，不存在返回 null */
export function getKeyMeta(key: string): ManifestConfigKey | null {
  return manifestKeyMap[key] ?? null
}

/** 取某个枚举组的选项数组 */
export function getEnumOptions(enumName: string): Array<{ value: string; label: string }> {
  return manifestEnumMap[enumName]?.options ?? []
}
