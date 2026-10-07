import { TreeInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { InputTree } from '@retikz/standard-vanilla/collection';
import type { FC } from 'react';

import type { StandardEmbeddableComponent } from '../../shared';

/** Tree 使用 root 递归描述文字叶节点与对象配置 */
export type TreeProps = InputTree & { children?: never };
const TreeComponent: FC<TreeProps> = () => null;

/** 静态树结构，节点与连接交由 Standard 编译 */
export const Tree = TreeComponent as StandardEmbeddableComponent<TreeProps>;
Tree.displayName = 'Tree';
Tree.isTier2Embeddable = true;
Tree.inputEmbedAdapter = TreeInputEmbedAdapter;
