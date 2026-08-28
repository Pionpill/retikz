import type { LowerPlotsOptions } from '@retikz/plot';

type PlotAuthoringRuntime = Readonly<{
  resolveLabel?: NonNullable<LowerPlotsOptions['resolveLabel']>;
}>;

/** 合并 ambient Plot theme 与 concrete Chart 的 lowering options */
export const lowerOptionsWithAmbientThemeOf = (
  lowerOptions: LowerPlotsOptions | undefined,
  ambientThemeStyles: NonNullable<LowerPlotsOptions['plotThemeStyles']> | undefined,
): LowerPlotsOptions | undefined => {
  if (ambientThemeStyles === undefined || ambientThemeStyles.length === 0) return lowerOptions;
  const explicit = lowerOptions?.plotThemeStyles;
  return {
    ...(lowerOptions ?? {}),
    plotThemeStyles: explicit === undefined ? ambientThemeStyles : [...ambientThemeStyles, ...explicit],
  };
};

/** 将 Plot declaration runtime sidecar 合并进 lowering options，显式配置优先 */
export const lowerOptionsWithPlotRuntimeOf = (
  lowerOptions: LowerPlotsOptions | undefined,
  runtime: PlotAuthoringRuntime,
): LowerPlotsOptions | undefined => {
  if (runtime.resolveLabel === undefined) return lowerOptions;
  return {
    ...(lowerOptions ?? {}),
    resolveLabel: { ...runtime.resolveLabel, ...(lowerOptions?.resolveLabel ?? {}) },
  };
};
