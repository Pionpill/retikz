import type { MarkDefinition } from '../contract';
import { createProviderRegistry } from './registry';

/** 合并普通标记定义并诊断重复名称 */
export const resolveMarkRegistry = (marks?: ReadonlyArray<MarkDefinition>): ReadonlyMap<string, MarkDefinition> =>
  createProviderRegistry({
    capability: 'mark',
    builtins: new Map(),
    custom: marks,
    keyOf: definition => definition.name,
  });
