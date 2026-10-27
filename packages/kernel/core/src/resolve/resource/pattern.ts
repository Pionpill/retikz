import type { ResolvedPatternLineStyle, ResolvedPatternLineStyleCycle } from '../../contract';
import type { IRPatternLineStyle, IRPatternPaint } from '../../schemas';
import { resolveDashPattern } from '../style';
import type { PatternStyleResolution } from './types';

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

/** 提取图案顶层的线型覆盖，保留字段省略语义 */
const lineStyleInputOf = (spec: IRPatternPaint): IRPatternLineStyle => ({
  ...(spec.color === undefined ? {} : { color: spec.color }),
  ...(spec.lineWidth === undefined ? {} : { lineWidth: spec.lineWidth }),
  ...(spec.dashed === undefined ? {} : { dashed: spec.dashed }),
  ...(spec.dotted === undefined ? {} : { dotted: spec.dotted }),
  ...(spec.dashPattern === undefined ? {} : { dashPattern: spec.dashPattern }),
  ...(spec.dashOffset === undefined ? {} : { dashOffset: spec.dashOffset }),
  ...(spec.lineCap === undefined ? {} : { lineCap: spec.lineCap }),
  ...(spec.lineJoin === undefined ? {} : { lineJoin: spec.lineJoin }),
});

/** 在基础线型上应用局部覆盖；显式提供虚线相关字段时重新解析虚线，解析为空则清除继承值 */
const resolvePatternLineStyle = (
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

/** 解析图案基础线型，并据此补齐水平、垂直及周期内每项的线型 */
export const resolvePatternStyle = (spec: IRPatternPaint, defaultColor: string): PatternStyleResolution => {
  const baseInput = lineStyleInputOf(spec);
  const base = resolvePatternLineStyle({ color: defaultColor }, baseInput);
  const resolved: {
    base: ResolvedPatternLineStyle;
    horizontalStyle?: ResolvedPatternLineStyle;
    verticalStyle?: ResolvedPatternLineStyle;
    lineStyleCycle?: ResolvedPatternLineStyleCycle;
  } = { base };

  if (spec.horizontalStyle !== undefined) {
    resolved.horizontalStyle = resolvePatternLineStyle(base, spec.horizontalStyle);
  }

  if (spec.verticalStyle !== undefined) {
    resolved.verticalStyle = resolvePatternLineStyle(base, spec.verticalStyle);
  }

  if (spec.lineStyleCycle !== undefined) {
    const cycle = spec.lineStyleCycle;
    const overridesByIndex = new Map(cycle.overrides.map(override => [override.index, override.style]));
    resolved.lineStyleCycle = {
      period: cycle.period,
      styles: Array.from({ length: cycle.period }, (_, index) => {
        const override = overridesByIndex.get(index);
        return override === undefined ? resolvePatternLineStyle(base, {}) : resolvePatternLineStyle(base, override);
      }),
    };
  }

  return resolved;
};
