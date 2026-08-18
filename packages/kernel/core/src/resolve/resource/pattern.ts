import type { ResolvedPatternLineStyle, ResolvedPatternLineStyleCycle } from '../../contract';
import type { IRPatternLineStyle, IRPatternPaint } from '../../schemas';
import type { PatternStyleResolution } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { PatternLineStyleCycleSchema, PatternLineStyleSchema } from '../../schemas';
import { resolveDashPattern } from '../style';

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

const lineStyleInputOf = (spec: IRPatternPaint): Record<string, unknown> => ({
  ...(spec.color === undefined ? {} : { color: spec.color }),
  ...(spec.lineWidth === undefined ? {} : { lineWidth: spec.lineWidth }),
  ...(spec.dashed === undefined ? {} : { dashed: spec.dashed }),
  ...(spec.dotted === undefined ? {} : { dotted: spec.dotted }),
  ...(spec.dashPattern === undefined ? {} : { dashPattern: spec.dashPattern }),
  ...(spec.dashOffset === undefined ? {} : { dashOffset: spec.dashOffset }),
  ...(spec.lineCap === undefined ? {} : { lineCap: spec.lineCap }),
  ...(spec.lineJoin === undefined ? {} : { lineJoin: spec.lineJoin }),
});

const invalidPathOf = (prefix: string | undefined, path: ReadonlyArray<PropertyKey>): string =>
  [prefix, ...path].filter((part): part is PropertyKey => part !== undefined).join('.');

/** 在 resolve 边界校验单层 Pattern 线型，并保留稳定字段路径诊断 */
const parseLineStyle = (shape: string, input: unknown, prefix?: string): IRPatternLineStyle => {
  const parsed = PatternLineStyleSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  const path = invalidPathOf(prefix, parsed.error.issues[0]?.path ?? []);
  throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Pattern '${shape}' has an invalid ${path || 'line style'}.`);
};

/** 在基础线型上应用局部 override，并按 selector 优先级展开 dash */
export const resolvePatternLineStyle = (
  base: ResolvedPatternLineStyle,
  override: IRPatternLineStyle,
): ResolvedPatternLineStyle => {
  const resolved: ResolvedPatternLineStyle = {
    ...base,
    ...(base.dashPattern === undefined ? {} : { dashPattern: [...base.dashPattern] }),
  };
  if (override.color !== undefined) resolved.color = override.color;
  if (override.lineWidth !== undefined) resolved.lineWidth = override.lineWidth;
  if (override.dashOffset !== undefined) resolved.dashOffset = override.dashOffset;
  if (override.lineCap !== undefined) resolved.lineCap = override.lineCap;
  if (override.lineJoin !== undefined) resolved.lineJoin = override.lineJoin;
  if (hasOwn(override, 'dashPattern') || hasOwn(override, 'dashed') || hasOwn(override, 'dotted')) {
    const dashPattern = resolveDashPattern(override.dashPattern, override.dashed, override.dotted);
    if (dashPattern === undefined) delete resolved.dashPattern;
    else resolved.dashPattern = [...dashPattern];
  }
  return resolved;
};

/** 解析 Pattern 顶层、方向和周期线型 */
export const resolvePatternStyle = (spec: IRPatternPaint, defaultColor: string): PatternStyleResolution => {
  const baseInput = parseLineStyle(spec.shape, lineStyleInputOf(spec));
  const base = resolvePatternLineStyle({ color: defaultColor }, baseInput);
  const resolved: {
    base: ResolvedPatternLineStyle;
    horizontalStyle?: ResolvedPatternLineStyle;
    verticalStyle?: ResolvedPatternLineStyle;
    lineStyleCycle?: ResolvedPatternLineStyleCycle;
  } = { base };

  if (spec.horizontalStyle !== undefined) {
    resolved.horizontalStyle = resolvePatternLineStyle(
      base,
      parseLineStyle(spec.shape, spec.horizontalStyle, 'horizontalStyle'),
    );
  }
  if (spec.verticalStyle !== undefined) {
    resolved.verticalStyle = resolvePatternLineStyle(
      base,
      parseLineStyle(spec.shape, spec.verticalStyle, 'verticalStyle'),
    );
  }
  if (spec.lineStyleCycle !== undefined) {
    const parsedCycle = PatternLineStyleCycleSchema.safeParse(spec.lineStyleCycle);
    if (!parsedCycle.success) {
      const path = invalidPathOf('lineStyleCycle', parsedCycle.error.issues[0]?.path ?? []);
      throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Pattern '${spec.shape}' has an invalid ${path}.`);
    }
    const overridesByIndex = new Map(parsedCycle.data.overrides.map(override => [override.index, override.style]));
    resolved.lineStyleCycle = {
      period: parsedCycle.data.period,
      styles: Array.from({ length: parsedCycle.data.period }, (_, index) => {
        const override = overridesByIndex.get(index);
        return override === undefined ? resolvePatternLineStyle(base, {}) : resolvePatternLineStyle(base, override);
      }),
    };
  }
  return resolved;
};
