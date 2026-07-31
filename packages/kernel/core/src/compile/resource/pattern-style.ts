import type { ResolvedPatternLineStyle, ResolvedPatternLineStyleCycle } from '../../contract';
import type { IRPatternLineStyle, IRPatternPaintSpec } from '../../schemas';

import { PatternLineStyleCycleSchema, PatternLineStyleSchema } from '../../schemas';
import { resolveDashPattern } from '../style';

/** Pattern compile 消费的完整线型上下文 */
export type ResolvedPatternStyleContext = {
  /** 顶层字段解析出的基础线型 */
  base: ResolvedPatternLineStyle;
  /** 已继承基础字段的横向线型 */
  horizontalStyle?: ResolvedPatternLineStyle;
  /** 已继承基础字段的纵向线型 */
  verticalStyle?: ResolvedPatternLineStyle;
  /** 已展开稀疏 override 的完整周期 */
  lineStyleCycle?: ResolvedPatternLineStyleCycle;
};

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

const lineStyleInputOf = (spec: IRPatternPaintSpec): Record<string, unknown> => ({
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

/** 校验单层 Pattern 线型，并把首个问题转换为稳定字段路径 */
const parseLineStyle = (shape: string, input: unknown, prefix?: string): IRPatternLineStyle => {
  const parsed = PatternLineStyleSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  const path = invalidPathOf(prefix, parsed.error.issues[0]?.path ?? []);
  throw new Error(`Pattern '${shape}' has an invalid ${path || 'line style'}.`);
};

/**
 * 在基础线型上应用局部覆盖
 * @description 普通字段按字段继承；override 出现任一 dash selector 时独立解析 dash，没有显式数组且 preset 均不为 true 时清除继承 dash
 */
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
    if (dashPattern === undefined) {
      delete resolved.dashPattern;
    } else {
      resolved.dashPattern = [...dashPattern];
    }
  }
  return resolved;
};

/** 校验并解析 Pattern 顶层、方向与周期线型 */
export const resolvePatternStyleContext = (
  spec: IRPatternPaintSpec,
  defaultColor: string,
): ResolvedPatternStyleContext => {
  const baseInput = parseLineStyle(spec.shape, lineStyleInputOf(spec));
  const base = resolvePatternLineStyle({ color: defaultColor }, baseInput);
  const resolved: ResolvedPatternStyleContext = { base };

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
      throw new Error(`Pattern '${spec.shape}' has an invalid ${path}.`);
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
