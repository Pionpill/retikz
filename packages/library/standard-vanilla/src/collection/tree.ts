import type { IRTree } from '@retikz/standard/collection';
import { createTree, TreeProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { StandardTreeEmbedKind } from '../shared/constants';

/** Tree 的 root 输入，保留节点配置与作用域属性 */
export type InputTree = Omit<IRTree, 'namespace' | 'type'>;
/** Tree 通过同一 Standard composite 下沉 */
export const TreeInputEmbedAdapter: SynchronousInputEmbedAdapter<InputTree> = {
  kind: StandardTreeEmbedKind,
  lower: props => ({
    node: createTree({ namespace: 'standard', type: 'tree', ...props }),
    providerDependencies: { roots: [TreeProvider.key], providers: [TreeProvider] },
  }),
};
/** 创建保持稀疏输入的 Tree embed */
export const tree = (input: InputTree): InputEmbed<InputTree> => ({
  type: 'embed',
  kind: StandardTreeEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
