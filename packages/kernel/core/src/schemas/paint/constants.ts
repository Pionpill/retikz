import type { ValueOf } from '../../types';

/**
 * 内置 pattern motif 名常量（用 const + ValueOf 派生，不用 TS enum）
 * @description 内置 3 motif：`lines`（横向阴影线）/ `dots`（波点）/ `grid`（横竖网格）。
 *   各 motif 的 tile 几何由 `BUILTIN_PATTERNS` 的 `PatternDefinition.emit` 在 compile 期产出。
 */
export const PatternShape = {
  Lines: 'lines',
  Dots: 'dots',
  Grid: 'grid',
} as const;

/**
 * 内置 3 pattern motif 名联合
 * @description `BUILTIN_PATTERNS` 的 Record key（保穷尽性约束，不随 `PatternShapeName` 开放而退化为 `string`）
 */
export type PatternShapeValue = ValueOf<typeof PatternShape>;

export type BuiltinPatternName = PatternShapeValue;

/**
 * pattern motif 名：开放字符串
 * @description 内置 `BuiltinPatternName`，或经 `CompileOptions.patterns` 注册的扩展 motif 名；
 *   `& {}` 让 IDE 仍对内置 3 名自动补全，同时接受任意非空字符串
 */
export type PatternShapeName = BuiltinPatternName | (string & {});
