import type { AnyCompositeDefinition, CompileOptions } from '@retikz/core';

import {
  DEFAULT_RESOLVED_THEME,
  resolveCompositeDependencies,
  resolveTheme,
  resolveThemeStyleRegistry,
} from '@retikz/core';

import type {
  InputAuthoringSite,
  InputEmbedThemeContext,
  InputEmbedThemeContextResolver,
  InputScene,
} from '../normalize';
import type { PreparedProcessingInput, ProcessingOptions, ProcessingSource } from './types';

import { createEmptyInputRuntimeMetaSnapshot, isInputScene, normalizeScene } from '../normalize';

const EMPTY_AUTHORING_SITES: ReadonlyArray<InputAuthoringSite> = Object.freeze([]);

/** 使用 Core 既有 resolver 准备 InputEmbed 所在 Scope 的有效 Theme */
const createInputEmbedThemeContextResolver = (
  scene: InputScene,
  compile: CompileOptions | undefined,
): InputEmbedThemeContextResolver => {
  const themeStyles = compile?.themeStyles;
  const registry = resolveThemeStyleRegistry(themeStyles);
  const createContext = (theme: InputEmbedThemeContext['theme']): InputEmbedThemeContext =>
    Object.freeze({
      theme,
      ...(themeStyles === undefined ? {} : { themeStyles }),
    });
  return Object.freeze({
    root: createContext(resolveTheme(DEFAULT_RESOLVED_THEME, scene.theme, 'scene.theme', registry)),
    resolveScope: (parent, theme, sourcePath) => createContext(resolveTheme(parent.theme, theme, sourcePath, registry)),
  });
};

/** 合并调用方 compile 选项与唯一的 Composite resolver 输出 */
const resolveCoreOptions = (
  compile: CompileOptions | undefined,
  contributions: Parameters<typeof resolveCompositeDependencies>[0]['contributions'],
): CompileOptions<ReadonlyArray<AnyCompositeDefinition>> =>
  Object.freeze({
    ...compile,
    composites: resolveCompositeDependencies({ contributions, composites: compile?.composites }),
  });

/** 将 typed InputScene 或已类型化 IRScene 准备为 processing 的唯一 Core 输入 */
export const prepareProcessingInput = (
  source: ProcessingSource,
  options: ProcessingOptions,
): PreparedProcessingInput => {
  if (isInputScene(source)) {
    const normalized = normalizeScene(source, {
      adapters: options.adapters,
      embedThemeContext: createInputEmbedThemeContextResolver(source, options.compile),
    });
    return Object.freeze({
      source: normalized.ir,
      coreOptions: resolveCoreOptions(options.compile, normalized.contributions),
      authoringSites: normalized.authoringSites,
      runtimeMeta: normalized.runtimeMeta,
    });
  }
  return Object.freeze({
    source,
    coreOptions: Object.freeze({ ...(options.compile ?? {}) }),
    authoringSites: EMPTY_AUTHORING_SITES,
    runtimeMeta: createEmptyInputRuntimeMetaSnapshot(),
  });
};
