import type { PatternDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { providerDefinitionOf } from '../../providers';
import type { IRPaint } from '../../schemas';
import { resolvePatternStyle } from './pattern';
import type { PaintResolution, PatternResolution } from './types';

const DEFAULT_PATTERN_SIZE = 8;

const DEFAULT_MOTIF_COLOR = 'currentColor';

/** 解析图案填充所需的定义注册表与尺寸舍入规则 */
type PaintResolveContext = Readonly<{
  /** 当前可用的图案定义注册表 */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** 圆整尺寸，保持资源与 Scene 几何一致 */
  round: (value: number) => number;
  /** 调用方传入的 IR 路径；当前图案解析未使用此字段 */
  irPath?: string;
}>;

/** 查找图案定义，确定尺寸并解析图案线型 */
const resolvePattern = (
  spec: Extract<IRPaint, { kind: 'pattern' }>,
  context: PaintResolveContext,
): PatternResolution => {
  const definition = providerDefinitionOf(context.patterns, spec.shape);
  const rawSize = spec.size ?? definition.defaultSize ?? DEFAULT_PATTERN_SIZE;
  if (!Number.isFinite(rawSize) || rawSize <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Pattern '${spec.shape}' has an invalid size (${String(rawSize)}); it must be a finite number greater than 0.`,
    );
  }

  if (spec.rotation !== undefined && !Number.isFinite(spec.rotation)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Pattern '${spec.shape}' has a non-finite rotation (${String(spec.rotation)}); it must be a finite number.`,
    );
  }

  return {
    spec,
    name: spec.shape,
    definition,
    size: context.round(rawSize),
    style: resolvePatternStyle(spec, DEFAULT_MOTIF_COLOR),
  };
};

/** 颜色字符串和 undefined 原样返回；绘制配置包装为资源输入，图案另行绑定定义与线型 */
export const resolvePaint = (
  paint: string | IRPaint | undefined,
  context: PaintResolveContext,
): string | PaintResolution | undefined => {
  if (paint === undefined || typeof paint === 'string') return paint;

  return paint.kind === 'pattern'
    ? { kind: 'paint', spec: paint, pattern: resolvePattern(paint, context) }
    : { kind: 'paint', spec: paint };
};
