import { createReadonlyMap } from '@retikz/foundation';
import { z } from 'zod';

import type { ChartRecipeDefinition, ChartThemeDefinition } from '../contract';
import type { IRChartSource } from '../schemas';
import type { ChartProviderRegistry, ChartRecipeProviderContribution } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { CHART_NAMESPACE } from '../constants';
import { validateChartThemeBases, validateChartThemeDefinition } from './theme';

const invalidRegistry = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidRegistry,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const zodPathOf = (path: ReadonlyArray<PropertyKey>): ReadonlyArray<string | number> =>
  path.map(segment => (typeof segment === 'symbol' ? String(segment) : segment));

const duplicateDefinition = (label: string, key: string): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.DuplicateDefinition,
    message: `${label} "${key}" is registered more than once`,
    details: { path: [label, key] },
  });

const literalStringOf = (schema: z.ZodObject, field: string, path: ReadonlyArray<string | number>): string => {
  const fieldSchema = schema.shape[field];
  if (!(fieldSchema instanceof z.ZodLiteral) || typeof fieldSchema.value !== 'string') {
    throw invalidRegistry(`Chart recipe schema field "${field}" must be a string literal`, [...path, field]);
  }
  return fieldSchema.value;
};

const validateRecipeSchemaIdentity = (
  recipe: ChartRecipeDefinition,
  family: string,
  path: ReadonlyArray<string | number>,
): void => {
  const sourceSchema = recipe.schema;
  if (!(sourceSchema instanceof z.ZodObject)) {
    throw invalidRegistry('Chart recipe schema must be a strict Source object schema', path);
  }
  const namespace = literalStringOf(sourceSchema, 'namespace', path);
  if (namespace !== CHART_NAMESPACE) {
    throw invalidRegistry(`Chart recipe "${recipe.chartType}" schema namespace must be "${CHART_NAMESPACE}"`, [
      ...path,
      'namespace',
    ]);
  }
  const schemaFamily = literalStringOf(sourceSchema, 'type', path);
  if (schemaFamily !== family) {
    throw invalidRegistry(`Chart recipe "${recipe.chartType}" schema family must match "${family}"`, [...path, 'type']);
  }
  const recipeSchema = sourceSchema.shape.recipe;
  if (!(recipeSchema instanceof z.ZodObject)) {
    throw invalidRegistry('Chart recipe schema field "recipe" must be an object schema', [...path, 'recipe']);
  }
  const schemaChartType = literalStringOf(recipeSchema, 'chartType', [...path, 'recipe']);
  if (schemaChartType !== recipe.chartType) {
    throw invalidRegistry(`Chart recipe schema chartType must match "${recipe.chartType}"`, [
      ...path,
      'recipe',
      'chartType',
    ]);
  }
};

const validateSlots = (recipe: ChartRecipeDefinition, path: ReadonlyArray<string | number>): void => {
  for (const [owner, slots] of Object.entries(recipe.consumes)) {
    const seen = new Set<string>();
    for (const [slotIndex, slot] of slots.entries()) {
      if (slot.length === 0 || seen.has(slot)) {
        throw invalidRegistry(`Chart recipe "${recipe.chartType}" contains an invalid or duplicate consumed slot`, [
          ...path,
          'consumes',
          owner,
          slotIndex,
        ]);
      }
      seen.add(slot);
    }
  }

  const kinds = new Set<string>();
  for (const [bindingIndex, binding] of recipe.marks.entries()) {
    const kind = binding.definition.kind;
    if (kind.length === 0 || kinds.has(kind)) {
      throw invalidRegistry(`Chart recipe "${recipe.chartType}" contains an invalid or duplicate mark binding`, [
        ...path,
        'marks',
        bindingIndex,
      ]);
    }
    kinds.add(kind);
    for (const [owner, slots] of Object.entries(binding.inherit)) {
      if (owner !== 'encodings' && owner !== 'properties') {
        throw invalidRegistry(`Chart mark binding has an unknown inherited owner "${owner}"`, [
          ...path,
          'marks',
          bindingIndex,
          'inherit',
          owner,
        ]);
      }
      const seen = new Set<string>();
      for (const [slotIndex, slot] of slots.entries()) {
        if (slot.length === 0 || seen.has(slot)) {
          throw invalidRegistry(`Chart mark binding contains an invalid or duplicate inherited slot "${slot}"`, [
            ...path,
            'marks',
            bindingIndex,
            'inherit',
            owner,
            slotIndex,
          ]);
        }
        seen.add(slot);
      }
    }
  }
};

const validateRecipe = (recipe: ChartRecipeDefinition, family: string, index: number): void => {
  const path = ['recipes', index, recipe.chartType] as const;
  if (recipe.chartType.length === 0) throw invalidRegistry('Chart recipe chartType must be non-empty', path);
  validateRecipeSchemaIdentity(recipe, family, [...path, 'schema']);
  validateSlots(recipe, [...path]);
  try {
    recipe.theme.resolutionSchema.parse(recipe.theme.fallback);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw invalidRegistry(
        `Chart recipe "${recipe.chartType}" has an invalid theme fallback`,
        [...path, 'theme', 'fallback', ...zodPathOf(error.issues[0]?.path ?? [])],
        error,
      );
    }
    throw error;
  }
};

/** 合并当前 Core provider 实际贡献的 recipe 与主题 Definition */
export const resolveChartProviderRegistry = (
  contributions: ReadonlyArray<ChartRecipeProviderContribution>,
): ChartProviderRegistry => {
  if (contributions.length === 0)
    throw invalidRegistry('Chart provider requires at least one active recipe', ['recipes']);
  const family = contributions[0].family;
  if (family.length === 0) throw invalidRegistry('Chart provider family must be non-empty', ['family']);

  const recipes = new Map<string, ChartRecipeDefinition>();
  const themes = new Map<string, ChartThemeDefinition>();
  const seenContributions = new Set<ChartRecipeProviderContribution>();
  for (const [index, contribution] of contributions.entries()) {
    if (seenContributions.has(contribution)) continue;
    seenContributions.add(contribution);
    if (contribution.family !== family) {
      throw invalidRegistry('Chart provider contributions must belong to one family', ['family', contribution.family]);
    }
    validateRecipe(contribution.recipe, family, index);
    const existingRecipe = recipes.get(contribution.recipe.chartType);
    if (existingRecipe !== undefined && existingRecipe !== contribution.recipe) {
      throw duplicateDefinition('recipes', contribution.recipe.chartType);
    }
    recipes.set(contribution.recipe.chartType, contribution.recipe);

    for (const [themeIndex, theme] of contribution.themeDefinitions.entries()) {
      if (theme.name.length === 0)
        throw invalidRegistry('Chart theme name must be non-empty', ['themes', themeIndex, 'name']);
      const existingTheme = themes.get(theme.name);
      if (existingTheme !== undefined && existingTheme !== theme) throw duplicateDefinition('themes', theme.name);
      themes.set(theme.name, theme);
    }
  }

  const recipeMap = createReadonlyMap(recipes);
  for (const theme of themes.values()) validateChartThemeDefinition(theme, recipeMap);
  validateChartThemeBases(themes);

  const schemas = [...recipes.values()].map(recipe => recipe.schema);
  const schema: z.ZodType<IRChartSource> =
    schemas.length === 1
      ? schemas[0]
      : z.union(schemas as [z.ZodType<IRChartSource>, z.ZodType<IRChartSource>, ...Array<z.ZodType<IRChartSource>>]);

  return Object.freeze({
    family,
    recipes: recipeMap,
    themes: createReadonlyMap(themes),
    schema,
  });
};
