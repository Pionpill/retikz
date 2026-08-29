import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import type { ChartMarkBinding } from '../contract/mark';
import type { ChartRecipeDefinition, ChartRecipeResolution, ChartSlotConsumption } from '../contract/recipe';
import type { IRChartSource } from '../schemas';
import type { ChartResolveWarning, InheritedChartMarkSlots } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { ChartWarningCode } from '../../warning';

type AuthoredChartMarkResolution = Readonly<{
  kind: string;
  index: number;
  override: boolean;
  plotMarks: ReadonlyArray<IRPlotMarkOperation>;
}>;

type ChartMarksResolution = Readonly<{
  authoredMarks: ReadonlyArray<AuthoredChartMarkResolution>;
  consumption: ChartSlotConsumption;
}>;

type ChartSemanticMarksResolution = Readonly<{
  marks: ReadonlyArray<IRPlotMarkOperation>;
  warnings: ReadonlyArray<ChartResolveWarning>;
}>;

const invalidMark = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const pickSlots = (values: IRJsonObject, names?: ReadonlyArray<string>): IRJsonObject => {
  if (names === undefined) return {};
  const picked: IRJsonObject = {};
  for (const name of names) if (Object.hasOwn(values, name)) picked[name] = structuredClone(values[name]);
  return picked;
};

const inheritedSlotsOf = (
  source: IRChartSource,
  resolvedEncodings: IRJsonObject,
  binding: ChartMarkBinding,
): InheritedChartMarkSlots => ({
  encodings: pickSlots(resolvedEncodings, binding.inherit.encodings),
  properties: pickSlots(source.recipe.properties ?? {}, binding.inherit.properties),
});

const resolveOneMark = (
  source: IRChartSource,
  index: number,
  mark: IRJsonObject,
  binding: ChartMarkBinding,
  resolvedEncodings: IRJsonObject,
  recipeTokens: IRJsonObject,
): ReadonlyArray<IRPlotMarkOperation> => {
  const resolution = binding.definition.resolve({
    chartType: source.recipe.chartType,
    source: mark,
    inherited: inheritedSlotsOf(source, resolvedEncodings, binding),
    recipeThemeTokens: recipeTokens,
  });
  if (resolution.marks.length === 0) {
    throw invalidMark('Chart mark resolver must produce at least one Plot mark', ['recipe', 'marks', index]);
  }
  return resolution.marks;
};

/** 通过 recipe-local binding 解析 authored Chart marks */
export const resolveChartMarks = (
  source: IRChartSource,
  recipe: Pick<ChartRecipeDefinition, 'chartType' | 'marks'>,
  resolvedEncodings: IRJsonObject,
  recipeTokens: IRJsonObject,
): ChartMarksResolution => {
  const authoredMarks = source.recipe.marks ?? [];
  const marks: Array<AuthoredChartMarkResolution> = [];
  const encodings = new Set<string>();
  const properties = new Set<string>();
  const overrideIndices = new Map<string, number>();
  for (const [index, mark] of authoredMarks.entries()) {
    const kind = mark.kind;
    if (typeof kind !== 'string' || kind.length === 0) {
      throw invalidMark('Chart mark kind must be a non-empty string', ['recipe', 'marks', index, 'kind']);
    }
    const binding = recipe.marks.find(candidate => candidate.definition.kind === kind);
    if (binding === undefined) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.UnknownDefinition,
        message: `Chart recipe "${recipe.chartType}" does not allow mark "${kind}"`,
        details: { path: ['recipe', 'marks', index, 'kind'], kind },
      });
    }
    const override = mark.override === true;
    if (override) {
      const previousIndex = overrideIndices.get(kind);
      if (previousIndex !== undefined) {
        throw invalidMark(`Chart mark "${kind}" can override its semantic group at most once`, [
          'recipe',
          'marks',
          index,
          'override',
        ]);
      }
      overrideIndices.set(kind, index);
    }
    binding.inherit.encodings?.forEach(slot => encodings.add(slot));
    binding.inherit.properties?.forEach(slot => properties.add(slot));
    marks.push({
      kind,
      index,
      override,
      plotMarks: resolveOneMark(source, index, mark, binding, resolvedEncodings, recipeTokens),
    });
  }
  return {
    authoredMarks: marks,
    consumption: { encodings: [...encodings], properties: [...properties] },
  };
};

/** 按 Chart mark kind 合并内建 semantic groups 与 authored marks */
export const resolveChartSemanticMarks = (
  recipe: ChartRecipeResolution,
  authored: ChartMarksResolution,
): ChartSemanticMarksResolution => {
  const semanticIndices = new Map<string, number>();
  const groups = recipe.semanticMarks.map((group, index) => {
    if (group.kind.length === 0) {
      throw invalidMark('Chart semantic mark kind must be non-empty', ['recipe', 'semanticMarks', index, 'kind']);
    }
    if (group.plotMarks.length === 0) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.InvalidResolvedPlot,
        message: `Chart semantic mark "${group.kind}" must produce at least one Plot mark`,
        details: { path: ['recipe', 'semanticMarks', index, 'plotMarks'], kind: group.kind },
      });
    }
    if (semanticIndices.has(group.kind)) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.InvalidResolvedPlot,
        message: `Chart recipe produced duplicate semantic mark kind "${group.kind}"`,
        details: { path: ['recipe', 'semanticMarks', index, 'kind'], kind: group.kind },
      });
    }
    semanticIndices.set(group.kind, index);
    return { kind: group.kind, plotMarks: [...group.plotMarks] };
  });
  const additions: Array<IRPlotMarkOperation> = [];
  const warnings: Array<ChartResolveWarning> = [];

  for (const mark of authored.authoredMarks) {
    if (!mark.override) {
      additions.push(...mark.plotMarks);
      continue;
    }
    const semanticIndex = semanticIndices.get(mark.kind);
    if (semanticIndex === undefined) {
      additions.push(...mark.plotMarks);
      warnings.push({
        code: ChartWarningCode.MarkOverrideTargetNotFound,
        message: `Chart mark "${mark.kind}" requested override, but the recipe produced no semantic mark group with that kind; the authored mark was appended.`,
        subPath: `recipe.marks[${mark.index}].override`,
      });
      continue;
    }
    groups[semanticIndex] = { kind: mark.kind, plotMarks: [...mark.plotMarks] };
  }

  return {
    marks: [...groups.flatMap(group => group.plotMarks), ...additions],
    warnings,
  };
};
