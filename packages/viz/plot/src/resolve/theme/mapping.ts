import type { IRPlotAxisDefaults, IRPlotDefaults, IRPlotTypographyDefaults } from '../../schemas';

type JsonRecord = Record<string, unknown>;

const isPlainRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const cloneValue = <T>(value: T): T => structuredClone(value);

const hasDefinedValue = (value: unknown): boolean => {
  if (value === undefined) return false;
  if (value === null || typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.length > 0;
  return Object.values(value).some(field => hasDefinedValue(field));
};

const discriminatorOf = (value: JsonRecord): string | undefined => {
  const kind = value.kind;
  if (typeof kind === 'string') return kind;
  const type = value.type;
  return typeof type === 'string' ? type : undefined;
};

/**
 * 合并两个正式 Source 值
 * @description array、scalar、false、null 与不同 discriminator 整体替换；同 discriminator 的 object 逐字段合并。空对象和空 font 不产生覆盖
 */
const mergeSourceValue = (base: unknown, override: unknown, field: string | undefined = undefined): unknown => {
  if (override === undefined || !hasDefinedValue(override)) return cloneValue(base);
  if (field === 'font') return cloneValue(override);
  if (!isPlainRecord(base) || !isPlainRecord(override)) return cloneValue(override);

  const baseDiscriminator = discriminatorOf(base);
  const overrideDiscriminator = discriminatorOf(override);
  if (
    baseDiscriminator !== undefined &&
    overrideDiscriminator !== undefined &&
    baseDiscriminator !== overrideDiscriminator
  ) {
    return cloneValue(override);
  }

  const merged: JsonRecord = cloneValue(base);
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const next = mergeSourceValue(merged[key], value, key);
    if (next !== undefined) merged[key] = next;
  }
  return merged;
};

/** 判断 defaults 片段是否包含至少一个有意义的 Source 值 */
export const hasPlotDefaultsValue = (defaults: IRPlotDefaults | undefined): boolean =>
  defaults !== undefined && hasDefinedValue(defaults);

/** 按正式 Source 粒度合并 Plot defaults */
export const mergePlotDefaults = (
  base: IRPlotDefaults | undefined,
  override: IRPlotDefaults | undefined,
): IRPlotDefaults => mergeSourceValue(base ?? {}, override) ?? {};

/** 合并一个 guide 文本样式；非空 font 作为一个原子字段替换 */
export const mergeGuideTextStyle = <T extends object>(base: T | undefined, override: object | undefined): T =>
  (mergeSourceValue(base ?? {}, override) ?? {}) as T;

const typographyAppliedToAxis = (
  axis: IRPlotAxisDefaults | undefined,
  typography: IRPlotTypographyDefaults,
): IRPlotAxisDefaults | undefined => {
  if (axis === undefined) return undefined;
  const result: IRPlotAxisDefaults = { ...axis };
  if (axis.tickLabels !== undefined && axis.tickLabels !== false) {
    result.tickLabels = mergeGuideTextStyle(axis.tickLabels, typography);
  }
  if (axis.title !== undefined && axis.title !== false) {
    result.title = mergeGuideTextStyle(axis.title, typography);
  }
  return result;
};

const typographyAppliedToLegend = (
  legend: IRPlotDefaults['legend'],
  typography: IRPlotTypographyDefaults,
): IRPlotDefaults['legend'] | undefined => {
  if (legend === undefined) return undefined;
  return {
    ...legend,
    ...(legend.title === undefined ? {} : { title: mergeGuideTextStyle(legend.title, typography) }),
    ...(legend.label === undefined ? {} : { label: mergeGuideTextStyle(legend.label, typography) }),
  };
};

/**
 * 以单个来源的内部顺序应用 Plot defaults
 * @description 先让 typography 覆盖之前来源的 Axis/Legend 文字样式，再应用本来源专用字段，确保后来源的全局字体可覆盖早来源的专用字体
 */
export const applyPlotDefaults = (
  base: IRPlotDefaults | undefined,
  source: IRPlotDefaults | undefined,
): IRPlotDefaults => {
  if (!hasPlotDefaultsValue(source)) return cloneValue(base ?? {});
  const typography = source?.typography;
  if (typography === undefined || !hasDefinedValue(typography)) return mergePlotDefaults(base, source);

  const current = cloneValue(base ?? {});
  const typographyDefaults = mergeGuideTextStyle(current.typography, typography);
  const axis = typographyAppliedToAxis(current.axis, typography);
  const legend = typographyAppliedToLegend(current.legend, typography);
  const specializedSource: IRPlotDefaults = {
    ...(source?.plotArea === undefined ? {} : { plotArea: source.plotArea }),
    ...(source?.axis === undefined ? {} : { axis: source.axis }),
    ...(source?.legend === undefined ? {} : { legend: source.legend }),
    ...(source?.palette === undefined ? {} : { palette: source.palette }),
  };
  return mergePlotDefaults(
    {
      ...current,
      typography: typographyDefaults,
      ...(axis === undefined ? {} : { axis }),
      ...(legend === undefined ? {} : { legend }),
    },
    specializedSource,
  );
};
