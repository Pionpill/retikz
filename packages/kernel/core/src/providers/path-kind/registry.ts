import type { PathKindDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATH_KINDS } from './definitions';

const keyOfPathKind = (definition: PathKindDefinition): string => definition.schema.shape.kind.value;

/** 解析 path-kind provider 注册表：按 schema kind 合并内置项与自定义项并诊断冲突 */
export const resolvePathKindRegistry = (
  pathKinds?: ReadonlyArray<PathKindDefinition>,
): ReadonlyMap<string, PathKindDefinition> =>
  resolveProviderRegistry({
    capability: 'path kind',
    builtins: BUILTIN_PATH_KINDS,
    custom: pathKinds,
    keyOf: keyOfPathKind,
  });
