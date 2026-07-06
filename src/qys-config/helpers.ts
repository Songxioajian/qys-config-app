/**
 * 工具函数集合
 *
 * 用户需求对应：⑤ 核心工具函数的辅助部分
 */

/**
 * 生成简单唯一 ID
 * @param prefix 前缀，如 'S'（签署方）、'A'（节点）、'c'（组件）
 */
export function uid(prefix: string = ''): string {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

/**
 * 生成签署方标识（S1 / S2 / ...）
 * 根据当前数组最大序号递增
 */
export function nextSignatoryFlag(existing: { flowSignatoryFlag: string }[]): string {
  let max = 0
  for (const item of existing) {
    const m = /^S(\d+)$/.exec(item.flowSignatoryFlag)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return 'S' + (max + 1)
}

/**
 * 生成签署节点标识（A1 / A2 / ...）
 * 根据当前数组最大序号递增
 */
export function nextActionFlag(existing: { flowActionFlag: string }[]): string {
  let max = 0
  for (const item of existing) {
    const m = /^A(\d+)$/.exec(item.flowActionFlag)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return 'A' + (max + 1)
}

/**
 * 深拷贝（基于 JSON，适用于纯数据对象）
 * 业务 JSON 仅含可序列化数据，此实现足够
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 数组元素上移
 */
export function moveUp<T>(arr: T[], index: number): void {
  if (index <= 0 || index >= arr.length) return
  const tmp = arr[index - 1]
  arr[index - 1] = arr[index]
  arr[index] = tmp
}

/**
 * 数组元素下移
 */
export function moveDown<T>(arr: T[], index: number): void {
  if (index < 0 || index >= arr.length - 1) return
  const tmp = arr[index + 1]
  arr[index + 1] = arr[index]
  arr[index] = tmp
}

/**
 * 校验 flowSignatoryFlag 在数组内是否唯一
 */
export function isFlagUnique(
  arr: { flowSignatoryFlag: string }[],
  flag: string,
  excludeIndex: number = -1,
): boolean {
  return arr.filter((item, idx) => idx !== excludeIndex && item.flowSignatoryFlag === flag).length === 0
}
