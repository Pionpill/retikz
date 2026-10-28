import type { PlotsLoweringOptions, PlotDefinitions } from '@retikz/plot';

type PlotAuthoringRuntime = Readonly<{
  resolveLabel?: NonNullable<PlotsLoweringOptions['resolveLabel']>;
}>;

/** 合并 ambient Plot theme 与 concrete Chart 的 lowering options */
export const lowerOptionsWithAmbientThemeOf = (
  lowerOptions: PlotsLoweringOptions | undefined,
  ambientThemeDefinitions: PlotDefinitions['plotThemeDefinitions'],
): PlotsLoweringOptions | undefined => {
  if (ambientThemeDefinitions === undefined || ambientThemeDefinitions.length === 0) return lowerOptions;

  const explicit = lowerOptions?.definitions?.plotThemeDefinitions;

  return {
    ...lowerOptions,
    definitions: {
      ...lowerOptions?.definitions,
      plotThemeDefinitions:
        explicit === undefined ? ambientThemeDefinitions : [...ambientThemeDefinitions, ...explicit],
    },
  };
};

/** 将 Plot declaration runtime sidecar 合并进 lowering options，显式配置优先 */
export const lowerOptionsWithPlotRuntimeOf = (
  lowerOptions: PlotsLoweringOptions | undefined,
  runtime: PlotAuthoringRuntime,
): PlotsLoweringOptions | undefined => {
  if (runtime.resolveLabel === undefined) return lowerOptions;

  return {
    ...(lowerOptions ?? {}),
    resolveLabel: { ...runtime.resolveLabel, ...(lowerOptions?.resolveLabel ?? {}) },
  };
};
