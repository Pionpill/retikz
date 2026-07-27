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

/** Cell 内容横向对齐值 */
export const TableHorizontalAlignment = {
  /** 对齐到较小 x 坐标 */
  Start: 'start',
  /** 居中对齐 */
  Center: 'center',
  /** 对齐到较大 x 坐标 */
  End: 'end',
} as const;

/** Cell 内容纵向对齐值 */
export const TableVerticalAlignment = {
  /** 对齐到较小 y 坐标 */
  Start: 'start',
  /** 居中对齐 */
  Center: 'center',
  /** 对齐到较大 y 坐标 */
  End: 'end',
} as const;

/** Cell 内容尺寸适配策略 */
export const TableCellFit = {
  /** 保持内容原始尺寸 */
  None: 'none',
  /** 等比缩放并完整包含 */
  Contain: 'contain',
  /** 等比缩放并完整覆盖 */
  Cover: 'cover',
  /** 分轴缩放到 content box */
  Stretch: 'stretch',
} as const;

/** Cell 内容溢出策略 */
export const TableCellOverflow = {
  /** 保留 content box 外的可见内容 */
  Visible: 'visible',
  /** 裁剪到 content box */
  Clip: 'clip',
} as const;
