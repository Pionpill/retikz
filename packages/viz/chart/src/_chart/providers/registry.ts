import type { ZodType } from 'zod';

import { resolveRowSelectorRegistry, resolveStatisticsReducerRegistry } from '@retikz/data';
import { createReadonlyMap } from '@retikz/foundation';
import { resolveCoordinateRegistry, resolvePlotTransformRegistry, resolveScaleRegistry } from '@retikz/plot';
import { union, ZodError, ZodLiteral, ZodObject } from 'zod';

import type { AnyChartRecipeDefinition, ChartEncodingRuntime, ChartThemeDefinition } from '../contract';
import type { IRChartSource } from '../schemas';
import type {
  ChartProviderRegistry,
  ChartRecipeProviderContribution,
  ChartRecipeProviderContributionInput,
  ChartRuntimeDefinitionOptions,
} from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { CHART_NAMESPACE } from '../constants';
import { eraseChartRecipeDefinition } from '../contract';
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

const literalStringOf = (schema: ZodObject, field: string, path: ReadonlyArray<string | number>): string => {
  const fieldSchema = schema.shape[field];
  if (!(fieldSchema instanceof ZodLiteral) || typeof fieldSchema.value !== 'string') {
    throw invalidRegistry(`Chart recipe schema field "${field}" must be a string literal`, [...path, field]);
  }
  return fieldSchema.value;
};

const validateRecipeSchemaIdentity = (
  recipe: AnyChartRecipeDefinition,
  family: string,
  path: ReadonlyArray<string | number>,
): void => {
  const sourceSchema = recipe.schema;
  if (!(sourceSchema instanceof ZodObject)) {
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
  if (!(recipeSchema instanceof ZodObject)) {
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

const validateSlots = (recipe: AnyChartRecipeDefinition, path: ReadonlyArray<string | number>): void => {
  const encodingSlots = new Set<string>();
  for (const [slotIndex, slot] of recipe.encodingSlots.entries()) {
    if (slot.length === 0 || encodingSlots.has(slot)) {
      throw invalidRegistry(`Chart recipe "${recipe.chartType}" contains an invalid or duplicate encoding slot`, [
        ...path,
        'encodingSlots',
        slotIndex,
      ]);
    }
    encodingSlots.add(slot);
  }

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
      if (owner === 'encodings' && !encodingSlots.has(slot)) {
        throw invalidRegistry(`Chart recipe "${recipe.chartType}" consumes unknown encoding slot "${slot}"`, [
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
        if (owner === 'encodings' && !encodingSlots.has(slot)) {
          throw invalidRegistry(`Chart mark binding inherits unknown recipe encoding slot "${slot}"`, [
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

const validateRecipe = (recipe: AnyChartRecipeDefinition, family: string, index: number): void => {
  const path = ['recipes', index, recipe.chartType] as const;
  if (recipe.chartType.length === 0) throw invalidRegistry('Chart recipe chartType must be non-empty', path);
  validateRecipeSchemaIdentity(recipe, family, [...path, 'schema']);
  validateSlots(recipe, [...path]);
  try {
    recipe.theme.resolutionSchema.parse(recipe.theme.fallback);
  } catch (error) {
    if (error instanceof ZodError) {
      throw invalidRegistry(
        `Chart recipe "${recipe.chartType}" has an invalid theme fallback`,
        [...path, 'theme', 'fallback', ...zodPathOf(error.issues[0]?.path ?? [])],
        error,
      );
    }
    throw error;
  }
};

const runtimeDefinitionKeys = [
  'coordinates',
  'transformDefinitions',
  'statisticsReducerDefinitions',
  'rowSelectorDefinitions',
  'scaleDefinitions',
] as const satisfies ReadonlyArray<keyof ChartRuntimeDefinitionOptions>;

/** 确保同一Chart provider中的recipe共享同一组Plot lowering runtime Definition */
const sharedRuntimeDefinitionsOf = (
  contributions: ReadonlyArray<Pick<ChartRecipeProviderContribution, 'runtimeDefinitions'>>,
): ChartRuntimeDefinitionOptions => {
  const shared: Partial<ChartRuntimeDefinitionOptions> = {};
  for (const key of runtimeDefinitionKeys) {
    const values = contributions.map(contribution => contribution.runtimeDefinitions?.[key]);
    const first = values[0];
    if (values.some(value => value !== first)) {
      throw invalidRegistry(`Chart provider contributions must share the same ${key} array`, [
        'runtimeDefinitions',
        key,
      ]);
    }
    if (first !== undefined) Object.assign(shared, { [key]: first });
  }
  return shared;
};

/** 复用Data / Plot owner registry resolver建立Chart encoding runtime sidecar */
const resolveEncodingRuntime = (definitions: ChartRuntimeDefinitionOptions): ChartEncodingRuntime => {
  try {
    return Object.freeze({
      transforms: createReadonlyMap(resolvePlotTransformRegistry(definitions.transformDefinitions)),
      reducers: createReadonlyMap(resolveStatisticsReducerRegistry(definitions.statisticsReducerDefinitions)),
      selectors: createReadonlyMap(resolveRowSelectorRegistry(definitions.rowSelectorDefinitions)),
      scales: createReadonlyMap(resolveScaleRegistry(definitions.scaleDefinitions)),
      coordinates: createReadonlyMap(resolveCoordinateRegistry(definitions.coordinates)),
    });
  } catch (error) {
    throw invalidRegistry('Chart provider contains invalid runtime Definitions', ['runtimeDefinitions'], error);
  }
};

/** 合并当前 Core provider 实际贡献的 recipe 与主题 Definition */
export const resolveChartProviderRegistry = <TSource extends IRChartSource>(
  contributions: ReadonlyArray<ChartRecipeProviderContributionInput<TSource>>,
): ChartProviderRegistry => {
  if (contributions.length === 0)
    throw invalidRegistry('Chart provider requires at least one active recipe', ['recipes']);
  const family = contributions[0].family;
  if (family.length === 0) throw invalidRegistry('Chart provider family must be non-empty', ['family']);

  const recipes = new Map<string, AnyChartRecipeDefinition>();
  const themes = new Map<string, ChartThemeDefinition>();
  const themeDefinitions: Array<ChartThemeDefinition> = [];
  const seenContributions = new Set<ChartRecipeProviderContributionInput<TSource>>();
  for (const [index, contribution] of contributions.entries()) {
    if (seenContributions.has(contribution)) continue;
    seenContributions.add(contribution);
    if (contribution.family !== family) {
      throw invalidRegistry('Chart provider contributions must belong to one family', ['family', contribution.family]);
    }
    const recipe = eraseChartRecipeDefinition(contribution.recipe);
    validateRecipe(recipe, family, index);
    const existingRecipe = recipes.get(recipe.chartType);
    if (existingRecipe !== undefined && existingRecipe !== recipe) {
      throw duplicateDefinition('recipes', recipe.chartType);
    }
    recipes.set(recipe.chartType, recipe);

    for (const theme of contribution.themeDefinitions) themeDefinitions.push(theme);
  }

  const recipeMap = createReadonlyMap(recipes);
  for (const theme of themeDefinitions) {
    validateChartThemeDefinition(theme, recipeMap);
    const existingTheme = themes.get(theme.name);
    if (existingTheme !== undefined && existingTheme !== theme) throw duplicateDefinition('themes', theme.name);
    themes.set(theme.name, theme);
  }
  validateChartThemeBases(themes);

  const runtime = resolveEncodingRuntime(sharedRuntimeDefinitionsOf([...seenContributions]));

  const schemas = [...recipes.values()].map(recipe => recipe.schema);
  const schema: ZodType<IRChartSource> =
    schemas.length === 1
      ? schemas[0]
      : union(schemas as [ZodType<IRChartSource>, ZodType<IRChartSource>, ...Array<ZodType<IRChartSource>>]);

  return Object.freeze({
    family,
    recipes: recipeMap,
    themes: createReadonlyMap(themes),
    schema,
    runtime,
  });
};
