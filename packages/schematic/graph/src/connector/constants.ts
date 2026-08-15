/** GraphConnector 角色词汇 */
export const GraphConnectorRole = {
  /** 流程顺序关系 */
  Flow: 'flow',
  /** 分支关系 */
  Branch: 'branch',
  /** 依赖关系 */
  Dependency: 'dependency',
  /** 反馈关系 */
  Feedback: 'feedback',
} as const;
