/**
 * 从精确 Chart Source 提取可声明的单个 Chart mark payload
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type ChartMarkOf<TSource extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<
  TSource['recipe']['marks']
>[number];
