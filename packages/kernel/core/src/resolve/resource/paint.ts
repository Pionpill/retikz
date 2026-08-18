import type { PatternDefinition } from '../../contract';
import type { IRPaint } from '../../schemas';
import type { PaintResolution, PatternResolution } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { providerDefinitionOf } from '../../providers/registry';
import { resolvePatternStyle } from './pattern';

const DEFAULT_PATTERN_SIZE = 8;
const DEFAULT_MOTIF_COLOR = 'currentColor';

/** Pattern paint 解析所需的 registry 和 round 上下文 */
export type PaintResolveContext = Readonly<{
  /** 有效 pattern provider registry */
  patterns: ReadonlyMap<string, PatternDefinition>;
  /** 圆整尺寸，保持资源与 Scene 几何一致 */
  round: (value: number) => number;
  /** 当前 IR locator，用于未知 provider 诊断 */
  irPath?: string;
}>;

/** 在 resolve 阶段选择 pattern provider、应用默认值并 shaping 样式 */
const resolvePattern = (
  spec: Extract<IRPaint, { kind: 'pattern' }>,
  context: PaintResolveContext,
): PatternResolution => {
  const definition = providerDefinitionOf(context.patterns, spec.shape, {
    capability: 'pattern shape',
    optionName: 'patterns',
  });
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

/** 将 IR paint 值解析为纯色或已绑定的内部 paint resolution */
export const resolvePaint = (
  paint: string | IRPaint | undefined,
  context: PaintResolveContext,
): string | PaintResolution | undefined => {
  if (paint === undefined || typeof paint === 'string') return paint;
  return {
    kind: 'paint',
    spec: paint,
    ...(paint.kind === 'pattern' ? { pattern: resolvePattern(paint, context) } : {}),
  };
};
