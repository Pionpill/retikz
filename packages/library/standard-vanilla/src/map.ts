import type { IRMap } from '@retikz/standard';
import { createMap, MapProvider } from '@retikz/standard';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import type { InputCell } from './cell';
import { normalizeCells } from './cell';
import { StandardMapEmbedKind } from './constants';

/** Map 的 Vanilla authoring 输入；键值角色覆盖统一位于 style.key/value 与 layout.key/value */
export type InputMap = Omit<IRMap, 'namespace' | 'type' | 'entries'> & {
  entries: Array<{ key: string | InputCell; value: string | InputCell }>;
};

/** 将 Map 输入与嵌套内容交给根级 traversal */
export const MapInputEmbedAdapter: InputEmbedAdapter<InputMap> = {
  kind: StandardMapEmbedKind,
  lower: (props, context) => {
    const { entries, ...input } = props;
    const normalized = normalizeCells(
      entries.flatMap(entry =>
        [entry.key, entry.value].map(cell => (typeof cell === 'string' ? { content: cell } : cell)),
      ),
      context,
      MapProvider,
    );
    return {
      node: createMap({
        namespace: 'standard',
        type: 'map',
        ...input,
        entries: entries.map((_, index) => ({
          key: typeof entries[index].key === 'string' ? entries[index].key : normalized.cells[index * 2],
          value: typeof entries[index].value === 'string' ? entries[index].value : normalized.cells[index * 2 + 1],
        })),
      }),
      providerDependencies: normalized.providerDependencies,
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建 Map embed；参数 id 是 authoring 身份，持久化身份使用 input.id */
export const map = (id: string, input: InputMap): InputEmbed<InputMap> => ({
  type: 'embed',
  kind: StandardMapEmbedKind,
  id,
  props: input,
});
