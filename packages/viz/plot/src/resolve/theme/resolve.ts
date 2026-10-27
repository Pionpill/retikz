import type { CanonicalTheme } from '@retikz/core';

import type { PlotThemeDefinition } from '../../contract';
import { RetikzPlotError } from '../../error';
import { getNeutralPlotDefaults, resolvePlotThemeRegistry } from '../../providers/theme';
import { getNeutralAxisRules } from '../../providers/theme/preset';
import type { IRPlot, IRPlotAxisRule, IRPlotDefaults, IRPlotThemeResolution } from '../../schemas';
import { PlotThemeLayerKind } from '../../schemas';
import { applyPlotDefaults } from './mapping';

type DefaultsLayer = Readonly<{
  kind: (typeof PlotThemeLayerKind)[keyof typeof PlotThemeLayerKind];
  path: string;
  defaults?: IRPlotDefaults;
  rules?: ReadonlyArray<IRPlotAxisRule>;
}>;

const sourceRecordsOf = (layers: ReadonlyArray<DefaultsLayer>) =>
  layers.map(layer => ({
    kind: layer.kind,
    path: layer.path,
    ...(layer.defaults === undefined ? {} : { defaults: structuredClone(layer.defaults) }),
  }));

const ruleSourcesOf = (layers: ReadonlyArray<DefaultsLayer>) =>
  layers.flatMap(layer =>
    (layer.rules ?? []).map((rule, index) => ({
      kind: layer.kind,
      sourcePath: layer.path,
      path: layer.path + '/plotRules/' + index,
      rule: structuredClone(rule),
    })),
  );

/** 按 Core Theme、Plot style 与 Direct Plot Source 顺序解析 Plot defaults */
export const resolvePlotTheme = (
  effectiveTheme: CanonicalTheme,
  input: Pick<IRPlot, 'defaultPlot' | 'plotRules'> = {},
  plotThemeDefinitions: ReadonlyArray<PlotThemeDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { name, mode } = effectiveTheme;
  const definitions = resolvePlotThemeRegistry(plotThemeDefinitions);
  const definition = name === undefined ? undefined : definitions.get(name);
  if (name !== undefined && definition === undefined) {
    throw new RetikzPlotError("Plot theme '" + name + "' is not registered.");
  }

  const layers: Array<DefaultsLayer> = [
    {
      kind: PlotThemeLayerKind.Neutral,
      path: '$default/' + mode,
      defaults: getNeutralPlotDefaults(mode, effectiveTheme.colors.categorical),
      rules: getNeutralAxisRules(),
    },
  ];
  if (definition !== undefined) {
    try {
      const source = structuredClone(definition.resolve(effectiveTheme));
      layers.push({
        kind: PlotThemeLayerKind.Style,
        path: '$style/' + name + '/' + mode,
        ...(source.defaults === undefined ? {} : { defaults: source.defaults }),
        ...(source.rules === undefined ? {} : { rules: source.rules }),
      });
    } catch (cause) {
      throw new RetikzPlotError("Plot theme '" + name + "' resolution failed.", { cause });
    }
  }

  if (input.defaultPlot !== undefined || input.plotRules !== undefined) {
    layers.push({
      kind: PlotThemeLayerKind.Source,
      path: '$spec',
      ...(input.defaultPlot === undefined ? {} : { defaults: input.defaultPlot }),
      ...(input.plotRules === undefined ? {} : { rules: input.plotRules }),
    });
  }

  const defaults = layers.reduce<IRPlotDefaults>(
    (resolvedDefaults, layer) => applyPlotDefaults(resolvedDefaults, layer.defaults),
    {},
  );
  const palette = defaults.palette;
  if (
    palette === undefined ||
    palette.categorical === undefined ||
    palette.series === undefined ||
    palette.sequential === undefined ||
    palette.diverging === undefined ||
    palette.shape === undefined
  ) {
    throw new RetikzPlotError('Plot Neutral defaults must provide a complete palette.');
  }

  return {
    ...(name === undefined ? {} : { name }),
    mode,
    defaults,
    layers: sourceRecordsOf(layers),
    rules: ruleSourcesOf(layers),
    palette: {
      categorical: [...palette.categorical],
      series: [...palette.series],
      sequential: palette.sequential,
      diverging: palette.diverging,
      shape: structuredClone(palette.shape),
    },
  };
};
