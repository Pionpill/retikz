import type { IRTree } from '@retikz/standard/collection';
import { createTree, treeProvider } from '@retikz/standard/collection';
import type { InputEmbed, SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { standardTreeEmbedKind } from '../shared/constants';

/** Tree 的 root 输入，保留节点配置与作用域属性 */
export type InputTree = Omit<IRTree, 'namespace' | 'type'>;
/** Tree 通过同一 Standard composite 下沉 */
export const treeInputEmbedAdapter: SynchronousInputEmbedAdapter<InputTree> = {
  kind: standardTreeEmbedKind,
  lower: props => ({
    node: createTree({ namespace: 'standard', type: 'tree', ...props }),
    providerDependencies: { roots: [treeProvider.key], providers: [treeProvider] },
  }),
};
/** 创建保持稀疏输入的 Tree embed */
export const tree = (input: InputTree): InputEmbed<InputTree> => ({
  type: 'embed',
  kind: standardTreeEmbedKind,
  ...(input.id === undefined ? {} : { id: input.id }),
  props: input,
});
