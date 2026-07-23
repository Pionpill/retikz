/** Cell 在表格语义区域中的位置 */
export const TableCellLocation = {
  /** 列表头区域 */
  ColumnHeader: 'columnHeader',
  /** 明细数据区域 */
  Body: 'body',
} as const;

/** Cell 可承担的语义角色 */
export const TableCellRole = {
  /** 列表头标签 */
  ColumnHeader: 'columnHeader',
  /** 明细数据值 */
  Data: 'data',
} as const;

/** Table Cell payload 的判别值 */
export const TableCellPayloadKind = {
  /** 交给 presentation provider 的标量值 */
  Value: 'value',
  /** 直接放置的 Core child */
  Content: 'content',
} as const;
