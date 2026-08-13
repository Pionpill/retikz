import type { AnyCompositeDefinition, CompileOptions } from '@retikz/core';

import { resolveCompositeDependencies } from '@retikz/core';

import type { InputAuthoringSite } from '../normalize';
import type { PreparedProcessingInput, ProcessingOptions, ProcessingSource } from './types';

import { createEmptyInputRuntimeMetaSnapshot, isInputScene, normalizeScene } from '../normalize';

const EMPTY_AUTHORING_SITES: ReadonlyArray<InputAuthoringSite> = Object.freeze([]);

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
    const normalized = normalizeScene(source, { adapters: options.adapters });
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
