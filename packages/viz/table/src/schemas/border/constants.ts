/** Table border 候选判别值 */
export const TableBorderKind = {
  /** 显式抑制边线 */
  None: 'none',
  /** Core 可表达的线候选 */
  Line: 'line',
} as const;

/** Table border 拓扑模式 */
export const TableBorderMode = {
  /** 共享边参与确定性冲突解析 */
  Collapse: 'collapse',
  /** 每个真实 Cell side 独立绘制 */
  Separate: 'separate',
} as const;
