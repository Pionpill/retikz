import type { IRMap } from '@retikz/standard/container';
import { createMap, MapProvider } from '@retikz/standard/container';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';

import { StandardMapEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/** Map 的 Vanilla authoring 输入；键值角色覆盖统一位于 style.key/value 与 layout.key/value */
export type InputMap = Omit<IRMap, 'namespace' | 'type' | 'entries' | 'data' | 'dataObjectDisplay'> &
  (
    | { entries: Array<{ key: string | InputCell; value: string | InputCell }>; data?: never; dataObjectDisplay?: never }
    | { data: NonNullable<IRMap['data']>; entries?: never; dataObjectDisplay?: IRMap['dataObjectDisplay'] }
  );

/** 将 Map 输入与嵌套内容交给根级 traversal */
export const MapInputEmbedAdapter: InputEmbedAdapter<InputMap> = {
  kind: StandardMapEmbedKind,
  lower: (props, context) => {
    if (props.data !== undefined)
      return {
        node: createMap({ namespace: 'standard', type: 'map', ...props }),
        providerDependencies: dataCellDependencies,
      };
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

/** 创建 Map embed；显式 input.id 同时用作领域与 embed 身份 */
export const map = (input: InputMap): InputEmbed<InputMap> => ({
  type: 'embed',
  kind: StandardMapEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
