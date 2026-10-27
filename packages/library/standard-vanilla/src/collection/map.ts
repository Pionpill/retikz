import { pathClipProvider } from '@retikz/extension';
import type { IRMap } from '@retikz/standard/collection';
import { createMap, mapProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { standardMapEmbedKind } from '../shared/constants';
import type { InputCell } from './cell';
import { dataCellDependencies, normalizeCells } from './cell';

/** Map 的 Vanilla authoring 输入；键值角色覆盖统一位于 defaultCell.key/value */
export type InputMap = Omit<IRMap, 'namespace' | 'type' | 'entries' | 'data' | 'dataExpand' | 'skeleton'> &
  (
    | {
        /** 按顺序提供的显式键值对，与数据和骨架入口互斥 */
        entries: Array<{
          /** 键侧文本或可包含绘制内容的单元格 */
          key: string | InputCell;
          /** 值侧文本或可包含绘制内容的单元格 */
          value: string | InputCell;
        }>;
        data?: never;
        skeleton?: never;
        dataExpand?: never;
      }
    | {
        /** 用于展开键值对的数据，与其它内容入口互斥 */
        data: NonNullable<IRMap['data']>;
        skeleton?: never;
        entries?: never;
        /** 仅用于数据入口的展开策略 */
        dataExpand?: IRMap['dataExpand'];
      }
    | {
        /** 用于构造空键值对的结构声明，与其它内容入口互斥 */
        skeleton: NonNullable<IRMap['skeleton']>;
        entries?: never;
        data?: never;
        dataExpand?: never;
      }
  );

/** 将 Map 输入与嵌套内容交给根级 traversal */
export const mapInputEmbedAdapter: SynchronousInputEmbedAdapter<InputMap> = {
  kind: standardMapEmbedKind,
  lower: (props, context) => {
    if (props.skeleton !== undefined)
      return {
        node: createMap({ namespace: 'standard', type: 'map', ...props }),
        providerDependencies: { roots: [mapProvider.key], providers: [mapProvider, pathClipProvider] },
      };

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
      mapProvider,
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
  kind: standardMapEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
