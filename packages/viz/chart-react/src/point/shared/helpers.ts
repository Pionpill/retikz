import type { LowerPlotsOptions } from '@retikz/plot';

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
