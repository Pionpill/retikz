import type { IRChild, IRScene } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { isPropertyPathEqual } from '@retikz/foundation';

import { createCompileChildPath } from '../../compile/shared';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from '../shared';
import { WeaveLookup } from './lookup';
import { WeaveNameIndex } from './namespace';
import type { WeaveTransaction } from './transaction';

/** 作者声明的派生寻址索引；普通属性更新保持索引身份，结构变动才重建 */
export class WeaveAddressIndex {
  /** 节点到当前作者声明地址的派生映射 */
  readonly paths: WeaveLookup<WeaveNode, PropertyPath>;
  /** 编译阶段地址到作者身份的反向映射 */
  readonly nodes: WeaveLookup<string, WeaveNode>;
  /** 保留声明阶段可见性的名称查询 */
  readonly names: WeaveNameIndex;

  constructor(
    root: WeaveRoot,
    transaction: WeaveTransaction,
    previous?: WeaveAddressIndex,
    changed: ReadonlySet<WeaveNode> = new Set(),
    removed: ReadonlySet<WeaveNode> = new Set(),
    structure?: { parent: WeaveRoot | WeaveScopeNode; index: number },
    moved?: (node: WeaveNode) => void,
  ) {
    this.paths = new WeaveLookup(previous?.paths);
    this.nodes = new WeaveLookup(previous?.nodes);
    const touched = new Set(changed);
    for (const node of removed) {
      this.nodes.delete(JSON.stringify(this.paths.get(node)));
      this.paths.delete(node);
    }
    const visit = (parent: WeaveRoot | WeaveScopeNode, prefix: PropertyPath) => {
      for (const [index, node] of transaction.readNode(parent).children.entries()) {
        const path = createCompileChildPath(prefix, index);
        if (!isPropertyPathEqual(previous?.paths.get(node) ?? [], path)) moved?.(node);
        this.paths.set(node, path);
        this.nodes.set(JSON.stringify(path), node);
        touched.add(node);
        if (node.type === 'scope') visit(node, path);
      }
    };
    if (previous === undefined) visit(root, []);
    else if (structure !== undefined) {
      const prefix = structure.parent.type === 'root' ? [] : this.paths.get(structure.parent)!;
      const children = transaction.readNode(structure.parent).children;
      const clear = (node: WeaveNode) => {
        this.nodes.delete(JSON.stringify(this.paths.get(node)));
        if (node.type === 'scope') for (const child of transaction.readNode(node).children) clear(child);
      };
      for (let index = structure.index; index < children.length; index++) clear(children[index]);
      for (let index = structure.index; index < children.length; index++) {
        const node = children[index];
        const path = createCompileChildPath(prefix, index);
        if (!isPropertyPathEqual(previous.paths.get(node) ?? [], path)) moved?.(node);
        this.paths.set(node, path);
        this.nodes.set(JSON.stringify(path), node);
        touched.add(node);
        if (node.type === 'scope') visit(node, path);
      }
    }
    this.names = new WeaveNameIndex(this.paths, previous?.names, touched, removed);
  }

  /** 读取旧声明快照；结构编辑只重新拼接变动容器，不序列化清洁子树 */
  declaration(source: IRScene, node: WeaveNode): IRChild | undefined {
    const path = this.paths.get(node);
    if (path === undefined) return;
    let children = source.children;
    for (let depth = 0; depth < path.length; depth += 2) {
      const child = children[path[depth + 1] as number];
      if (depth + 2 === path.length) return child;
      if ('namespace' in child || child.type !== 'scope') return;
      children = child.children;
    }
  }

  /** 仅复制变更地址的祖先数组，清洁兄弟继续共享声明 */
  replaceDeclaration(
    source: IRScene,
    node: WeaveNode,
    transaction: WeaveTransaction,
    childrenOverride?: Array<IRChild>,
  ): IRScene {
    const path = this.paths.get(node)!;
    const replace = (children: Array<IRChild>, depth: number): Array<IRChild> => {
      const index = path[depth + 1] as number;
      const next = children.slice();
      const previous = children[index];
      if (depth + 2 === path.length) {
        const own = transaction.readNode(node).input.own;
        next[index] =
          !('namespace' in previous) && previous.type === 'scope'
            ? ({ ...own, type: 'scope', children: childrenOverride ?? previous.children } as IRChild)
            : (own as IRChild);
      } else if (!('namespace' in previous) && previous.type === 'scope') {
        next[index] = { ...previous, children: replace(previous.children, depth + 2) };
      }
      return next;
    };
    return { ...source, children: replace(source.children, 0) };
  }
}
