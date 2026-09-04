/** 从精确 Chart Source 提取可声明的单个 Chart mark payload */
export type ChartMarkOf<TSource extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<
  TSource['recipe']['marks']
>[number];
