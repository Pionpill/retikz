/** Relation 有向性词汇 */
export const RelationDirection = {
  /** 无向关系 */
  None: 'none',
  /** 从 source 指向 target */
  Forward: 'forward',
  /** 从 target 指向 source */
  Reverse: 'reverse',
  /** 双向关系 */
  Both: 'both',
} as const;
