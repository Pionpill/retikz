import type { AnyPathKindDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry/index';
import { BUILTIN_PATH_KINDS } from './definitions';

const keyOfPathKind = (definition: AnyPathKindDefinition): string => definition.schema.shape.kind.value;

/** 解析 path-kind provider 注册表：按 schema kind 合并内置项与自定义项并诊断冲突 */
export const resolvePathKindRegistry = (
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>,
): ReadonlyMap<string, AnyPathKindDefinition> =>
  resolveProviderRegistry({
    capability: 'path kind',
    builtins: BUILTIN_PATH_KINDS,
    custom: pathKinds,
    keyOf: keyOfPathKind,
  });
