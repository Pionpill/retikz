/** compile occurrence 展开路径的阶段类别 */
export const CompileExpansionKind = {
  /** composite 展开结果中的 child 序号 */
  Expand: 'expand',
  /** provider 输出结果中的 child 序号 */
  Output: 'output',
  /** layout probe 结果中的 child 序号 */
  Probe: 'probe',
  /** replay 结果中的 child 序号 */
  Replay: 'replay',
  /** 生成 scope 子节点中的 child 序号 */
  ScopeChild: 'scopeChild',
} as const;
