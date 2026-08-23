/** Table Cell 视觉编码可写入的闭合颜色通道 */
export const TableVisualChannel = {
  /** Cell 背景填充 */
  BackgroundFill: 'backgroundFill',
  /** Cell 内容主颜色 */
  ContentColor: 'contentColor',
} as const;

/** Table 内置 Cell visual scale 名 */
export const TableCellVisualScale = {
  OrdinalColor: 'ordinal-color',
  SequentialColor: 'sequential-color',
  ThresholdColor: 'threshold-color',
} as const;
