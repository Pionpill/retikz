import type { IRNode, IRPath, CompositeCompileScopeProps } from '@retikz/core';
import type { output } from 'zod';

import type { TreeLayoutSchema } from '../schema';

/** 树排列消费的稀疏身份与确定节点配置 */
export type CanonicalTreeItem = {
  /** 直接供 Core 绘制的节点 */ node: IRNode;
  /** 进入此节点的边，根节点不消费 */ connection: CanonicalTreeConnection | false;
  /** 保留空槽的有序后代 */ children: Array<CanonicalTreeItem | null>;
};
/** 合并后的父子连接配置 */
export type CanonicalTreeConnection = {
  /** 路径连接方式 */ route: 'straight' | '-|' | '|-' | '-|-' | '|-|';
  /** 三段折线的中间通道比例 */ fraction?: number;
  /** Core 非结构路径属性 */ path: Omit<IRPath, 'type' | 'id' | 'children' | 'kind' | 'kindOptions'>;
};
/** root 解析后的树 */
export type CanonicalTree = {
  /** 空树或真实根 */ root: CanonicalTreeItem | null;
  /** 空槽使用的根默认空节点 */ emptyNode: IRNode;
  /** 根作用域 */ scope: CompositeCompileScopeProps;
  /** 整体标签 */ label: IRNode['label'];
  /** 物理排列 */ layout: output<typeof TreeLayoutSchema>;
};
