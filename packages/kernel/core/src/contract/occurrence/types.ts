/** compile dispatch、展开与输出相对原始 occurrence 的结构化路径段 */
export type CompileExpansionSegment = Readonly<{
  /** 路径段类别 */
  kind: 'expand' | 'output' | 'probe' | 'replay' | 'scopeChild';
  /** 同类输出中的稳定索引 */
  index: number;
}>;

/** 同一次 canonical compile 内确定的 occurrence locator */
export type CompileOccurrenceLocator = Readonly<{
  /** 最近的原始输入 IR occurrence */
  sourcePath: string;
  /** 从原始 occurrence 到 provider 产物的结构化索引链 */
  expansionPath: ReadonlyArray<CompileExpansionSegment>;
}>;
