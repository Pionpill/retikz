import { createReadonlyMap } from '@retikz/foundation';

import type { InputLayerMeta, InputRuntimeMeta } from './types';

/** 复制并冻结输入 runtime metadata */
export const createInputRuntimeMetaSnapshot = (input: InputRuntimeMeta): InputRuntimeMeta => {
  const layers = Object.freeze(
    input.layers.map(
      (layer): InputLayerMeta =>
        Object.freeze({
          ...layer,
          childIds: Object.freeze([...layer.childIds]),
        }),
    ),
  );
  const identityIndex = createReadonlyMap(
    Array.from(input.identityIndex, ([identity, path]) => [identity, Object.freeze([...path])] as const),
  );
  const parentIndex = createReadonlyMap(input.parentIndex);
  return Object.freeze({ layers, identityIndex, parentIndex });
};

/** 创建独立的空输入 runtime metadata */
export const createEmptyInputRuntimeMetaSnapshot = (): InputRuntimeMeta =>
  createInputRuntimeMetaSnapshot({ layers: [], identityIndex: new Map(), parentIndex: new Map() });
