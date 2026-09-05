import type { ResolvedTheme } from '@retikz/core';

import { strictObject } from 'zod';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlot, IRPlotAxisRule, IRPlotAxisRules, IRPlotDefaults, IRPlotThemeResolution } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { getNeutralPlotDefaults, resolvePlotThemeStyleRegistry } from '../../providers/theme';
import { getNeutralAxisRules } from '../../providers/theme/preset';
import { PlotAxisRulesSchema, PlotDefaultsSchema, PlotThemeLayerKind, PlotThemeResolutionSchema } from '../../schemas';
import { applyPlotDefaults } from './mapping';

const PlotThemeStyleSourceSchema = strictObject({
  defaults: PlotDefaultsSchema.optional(),
  rules: PlotAxisRulesSchema.optional(),
});

type DefaultsLayer = Readonly<{
  kind: (typeof PlotThemeLayerKind)[keyof typeof PlotThemeLayerKind];
  path: string;
  defaults?: IRPlotDefaults;
  rules?: IRPlotAxisRules;
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
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlot, 'plotDefaults' | 'plotRules'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined) {
    throw new RetikzPlotError("Plot theme style '" + style + "' is not registered.");
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
      const source = PlotThemeStyleSourceSchema.parse(definition.resolve(effectiveTheme));
      layers.push({
        kind: PlotThemeLayerKind.Style,
        path: '$style/' + style + '/' + mode,
        ...(source.defaults === undefined ? {} : { defaults: source.defaults }),
        ...(source.rules === undefined ? {} : { rules: source.rules }),
      });
    } catch (cause) {
      throw new RetikzPlotError("Plot theme style '" + style + "' resolution failed.", { cause });
    }
  }
  if (input.plotDefaults !== undefined || input.plotRules !== undefined) {
    layers.push({
      kind: PlotThemeLayerKind.Source,
      path: '$spec',
      ...(input.plotDefaults === undefined ? {} : { defaults: input.plotDefaults }),
      ...(input.plotRules === undefined ? {} : { rules: input.plotRules }),
    });
  }

  const defaults = layers.reduce<IRPlotDefaults>(
    (resolvedDefaults, layer) => applyPlotDefaults(resolvedDefaults, layer.defaults),
    {},
  );
  if (defaults.palette === undefined) {
    throw new RetikzPlotError('Plot Neutral defaults must provide a complete palette.');
  }

  return PlotThemeResolutionSchema.parse({
    ...(style === undefined ? {} : { style }),
    mode,
    defaults,
    layers: sourceRecordsOf(layers),
    rules: ruleSourcesOf(layers),
    palette: defaults.palette,
  });
};

/** 仅供 Chart 在不复制 Plot 级联语义时构造其转发 defaults 输入 */
export type PlotDefaultsLayer = Readonly<{
  /** Chart forwarding 在 inspection 中的稳定路径 */
  path: string;
  /** Chart forwarding 的 Plot-owned sparse defaults */
  defaults?: IRPlotDefaults;
  /** Chart forwarding 的 Plot-owned Axis rules */
  rules?: ReadonlyArray<IRPlotAxisRule>;
}>;
