export * from './definitions';
export * from './registry';
export * from './stroke-path';

import type { AnyInspectorDefinition } from '../../shared';

import { BUILTIN_INSPECTORS } from './definitions';
import { createInspectorRegistry } from './registry';

/** 创建内置优先、第三方同路的默认 Inspector registry */
export const createDefaultInspectorRegistry = (definitions: ReadonlyArray<AnyInspectorDefinition> = []) =>
  createInspectorRegistry([...BUILTIN_INSPECTORS, ...definitions]);
