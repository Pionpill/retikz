/**
 * Pattern Registry 扩展面
 * @description 内置 3 pattern motif 的注册项 + 第三方 pattern motif 作者所需的类型。
 *   `BUILTIN_PATTERNS` 的 Record key 用 `BuiltinPatternName`（3 名穷尽），不用开放的 `PatternShapeName`。
 *
 *   内置 3 的 `emit` 在局部 tile 坐标系产 `MarkerPrimitive` 几何（lines 横线 / grid 横竖 / dots 圆点），
 *   与历史 SVG 等价；`defaultSize` 等几何字段按几何契约声明。
 */
import type { BuiltinPatternName } from '../ir/paint';
import type { MarkerPrimitive } from '../primitive/marker';
import type { PatternDefinition, PatternEmitContext } from './types';

/** 内置 3 motif 默认 tile 周期（user units）；用户 `pattern.size` 覆盖 */
const DEFAULT_PATTERN_SIZE = 8;

/** 占位 emit：motif 几何由实现阶段落地（golden 见历史 paintDefs motif switch） */
const notImplemented = (motif: string): ((ctx: PatternEmitContext) => Iterable<MarkerPrimitive>) => () => {
  throw new Error(`Pattern '${motif}' emit is not implemented yet.`);
};

/**
 * 内置 3 pattern 注册项；与 `CompileOptions.patterns` 合并时被同名注入覆盖
 * @description `defaultSize` 统一 8（user units）；motif 几何（lines 横线 / grid 横竖 / dots 圆点）
 *   在局部 tile 坐标系产出，等价历史 SVG。emit 当前为占位（待几何落地）。
 */
export const BUILTIN_PATTERNS: Record<BuiltinPatternName, PatternDefinition> = {
  lines: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: notImplemented('lines'),
  },
  dots: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: notImplemented('dots'),
  },
  grid: {
    defaultSize: DEFAULT_PATTERN_SIZE,
    emit: notImplemented('grid'),
  },
};

export type { PatternDefinition, PatternEmitContext } from './types';
