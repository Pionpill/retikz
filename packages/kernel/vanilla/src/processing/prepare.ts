import type { AnyCompositeDefinition } from '@retikz/core';
import {
  DEFAULT_RESOLVED_THEME,
  createCompositeInputBindings,
  resolveCoreProviderDependencies,
  resolveTheme,
  resolveThemeRegistry,
} from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type {
  InputAuthoringSite,
  InputLayer,
  InputEmbedThemeContext,
  InputEmbedThemeContextResolver,
  InputScene,
} from '../normalize';
import { createInputSceneTraversal, isInputScene, BuiltinLayerName, normalizeSceneLayer } from '../normalize';
import { assertPreparationActive, prepareAuthoringContributions } from './authoring';
import { createTextMeasurer } from './text-measurement';
import type { AsyncProcessingOptions, InputPreparedProcessing, ProcessingOptions, ProcessingSource } from './types';

/** 单图入口的默认层；显式层必须已经过视口分派 */
const implicitLayer = (source: InputScene): InputLayer => {
  if (source.children === undefined)
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Expected a single scene, received a layer stack');
  return { type: 'layer', name: BuiltinLayerName.Main, children: source.children };
};

const EMPTY_AUTHORING_SITES: ReadonlyArray<InputAuthoringSite> = Object.freeze([]);

/** 使用 Core 既有 resolver 准备 InputEmbed 所在 Scope 的有效 Theme */
const createInputEmbedThemeContextResolver = (
  scene: InputScene,
  compile: CompileOptions | undefined,
): InputEmbedThemeContextResolver => {
  const themeDefinitions = compile?.themeDefinitions;
  const registry = resolveThemeRegistry(themeDefinitions);
  const createContext = (theme: InputEmbedThemeContext['theme']): InputEmbedThemeContext =>
    Object.freeze({
      theme,
      ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    });

  return Object.freeze({
    root: createContext(resolveTheme(DEFAULT_RESOLVED_THEME, scene.theme, 'scene.theme', registry)),
    resolveScope: (parent, theme, sourcePath) => createContext(resolveTheme(parent.theme, theme, sourcePath, registry)),
  });
};

/** 合并调用方 compile 选项与唯一的 Composite resolver 输出 */
const resolveCoreOptions = (
  compile: CompileOptions | undefined,
  contributions: Parameters<typeof resolveCoreProviderDependencies>[0]['contributions'],
  defaultFontFamily?: string,
): CompileOptions<AnyCompositeDefinition> => {
  const resolved = resolveCoreProviderDependencies({
    contributions,
    definitions:
      compile === undefined
        ? undefined
        : {
            shapes: compile.shapes,
            boundaries: compile.boundaries,
            clips: compile.clips,
            arrows: compile.arrows,
            marks: compile.marks,
            patterns: compile.patterns,
            paths: compile.paths,
            composites: compile.composites,
          },
  });
  return Object.freeze({
    ...compile,
    ...resolved,
    measureText: createTextMeasurer(compile?.measureText, defaultFontFamily),
  });
};

/** 将 typed InputScene 或已类型化 IRScene 准备为 processing 的唯一 Core 输入 */
export const prepareProcessingInput = (
  source: ProcessingSource,
  options: ProcessingOptions,
  layer?: InputLayer,
): InputPreparedProcessing => {
  if (isInputScene(source)) {
    const normalized = normalizeSceneLayer(source, layer ?? implicitLayer(source), {
      adapters: options.adapters,
      embedThemeContext: createInputEmbedThemeContextResolver(source, options.compile),
    });
    return Object.freeze({
      source: normalized.ir,
      coreOptions: resolveCoreOptions(
        {
          ...options.compile,
          ...(normalized.runtimeInputs === undefined
            ? {}
            : { compositeInputs: createCompositeInputBindings(normalized.ir, normalized.runtimeInputs) }),
        },
        normalized.contributions,
        options.defaultFontFamily,
      ),
      authoringSites: normalized.authoringSites,
    });
  }

  return Object.freeze({
    source,
    coreOptions: Object.freeze({
      ...options.compile,
      measureText: createTextMeasurer(options.compile?.measureText, options.defaultFontFamily),
    }),
    authoringSites: EMPTY_AUTHORING_SITES,
  });
};

/** 等待完整作者贡献后进入同一同步 normalizer 与 provider graph resolver */
export const prepareProcessingInputAsync = async (
  source: ProcessingSource,
  options: AsyncProcessingOptions,
  signal: AbortSignal,
  layer?: InputLayer,
): Promise<InputPreparedProcessing> => {
  assertPreparationActive(signal);
  if (!isInputScene(source)) return prepareProcessingInput(source, { ...options, adapters: undefined });

  const traversal = createInputSceneTraversal(source, layer ?? implicitLayer(source), {
    embedThemeContext: createInputEmbedThemeContextResolver(source, options.compile),
  });
  const execute = await prepareAuthoringContributions(traversal.sites, options.adapters ?? [], signal);
  assertPreparationActive(signal);
  const contributions = await execute();
  assertPreparationActive(signal);
  const normalized = traversal.normalize(contributions);

  return Object.freeze({
    source: normalized.ir,
    coreOptions: resolveCoreOptions(
      {
        ...options.compile,
        ...(normalized.runtimeInputs === undefined
          ? {}
          : { compositeInputs: createCompositeInputBindings(normalized.ir, normalized.runtimeInputs) }),
      },
      normalized.contributions,
      options.defaultFontFamily,
    ),
    authoringSites: normalized.authoringSites,
  });
};
