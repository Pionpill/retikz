import type { IRJsonObject } from '@retikz/core';
import type { IRPlotMarkOperation } from '@retikz/plot';

import type { ChartMarkBinding } from '../contract/mark';
import type { ChartRecipeDefinition, ChartSlotConsumption } from '../contract/recipe';
import type { IRChartSource } from '../schemas';
import type { InheritedChartMarkSlots } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';

type ChartMarksResolution = Readonly<{
  marks: ReadonlyArray<IRPlotMarkOperation>;
  consumption: ChartSlotConsumption;
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

const inheritedSlotsOf = (source: IRChartSource, binding: ChartMarkBinding): InheritedChartMarkSlots => ({
  encodings: pickSlots(source.recipe.encodings, binding.inherit.encodings),
  properties: pickSlots(source.recipe.properties ?? {}, binding.inherit.properties),
});

const resolveOneMark = (
  source: IRChartSource,
  index: number,
  mark: IRJsonObject,
  binding: ChartMarkBinding,
  recipeTokens: IRJsonObject,
): ReadonlyArray<IRPlotMarkOperation> => {
  const resolution = binding.definition.resolve({
    chartType: source.recipe.chartType,
    source: mark,
    inherited: inheritedSlotsOf(source, binding),
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
  recipe: ChartRecipeDefinition,
  recipeTokens: IRJsonObject,
): ChartMarksResolution => {
  const authoredMarks = source.recipe.marks ?? [];
  const marks: Array<IRPlotMarkOperation> = [];
  const encodings = new Set<string>();
  const properties = new Set<string>();
  for (const [index, mark] of authoredMarks.entries()) {
    const kind = mark.kind;
    const binding = recipe.marks.find(candidate => candidate.definition.kind === kind);
    if (binding === undefined) {
      throw new RetikzChartError({
        code: RetikzChartErrorCode.UnknownDefinition,
        message: `Chart recipe "${recipe.chartType}" does not allow mark "${kind}"`,
        details: { path: ['recipe', 'marks', index, 'kind'], kind },
      });
    }
    binding.inherit.encodings?.forEach(slot => encodings.add(slot));
    binding.inherit.properties?.forEach(slot => properties.add(slot));
    marks.push(...resolveOneMark(source, index, mark, binding, recipeTokens));
  }
  return {
    marks,
    consumption: { encodings: [...encodings], properties: [...properties] },
  };
};
