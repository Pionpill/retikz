import type { IRScopeProps } from '@retikz/core';
import type { input } from 'zod';

import type {
  TreeSchema,
  TreeItemFieldsSchema,
  TreeNodeSchema,
  TreeConnectionSchema,
  TreeLayoutSchema,
} from './schema';

/** 文字叶节点或带子节点和局部配置的递归节点 */
export type IRTreeItem =
  | string
  | (input<typeof TreeItemFieldsSchema> & {
      /** 有序子节点；null 保留空子槽 */
      children?: Array<IRTreeItem | null>;
    });
export type IRTreeNode = input<typeof TreeNodeSchema>;
export type IRTreeConnection = input<typeof TreeConnectionSchema>;
export type IRTreeLayout = input<typeof TreeLayoutSchema>;
/** 以 root 描述结构并保留完整 Scope 的静态树 Source */
export type IRTree = Omit<input<typeof TreeSchema>, keyof IRScopeProps> & IRScopeProps;
