import type { PropertyPath } from '@retikz/foundation';

import type { NamespaceFrameChange } from '../../compile/runtime';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from '../shared';
import type { WeaveTransaction } from './transaction';

/** 名称查询保留消费者身份与原有声明阶段，不以队列执行顺序改变可见性 */
export type WeaveNameQuery = Readonly<{
  consumer: WeaveNode;
  name: string;
  visibility: 'declaration' | 'closed';
}>;

/** 查询命中的作者身份与具体声明；生成名称仍归所属 Composite */
export type WeaveNameBinding = Readonly<{
  node: WeaveNode;
  path: PropertyPath;
  generated?: NamespaceFrameChange;
}>;

/** 从候选声明事实建立本批可见性索引，不保存编译栈或领域计算闭包 */
export class WeaveNameIndex {
  /** 声明顺序只在本批存在；结构改变不改变节点身份 */
  private readonly order = new Map<WeaveNode, number>();
  /** 每个容器闭合时可见的最后声明 */
  private readonly ends = new Map<WeaveRoot | WeaveScopeNode, number>();
  /** 按名称索引作者声明，查询不扫描同空间内的无关元素 */
  private readonly declarations = new Map<WeaveRoot | WeaveScopeNode, Map<string, Array<WeaveNameBinding>>>();
  /** 生成名称必须在实例准备后取得，只保留可能发布名称的实例 */
  private readonly composites = new Map<WeaveRoot | WeaveScopeNode, Array<Extract<WeaveNode, { type: 'composite' }>>>();

  constructor(
    private readonly transaction: WeaveTransaction,
    paths: ReadonlyMap<WeaveNode, PropertyPath>,
  ) {
    let order = 0;
    for (const node of paths.keys()) {
      this.order.set(node, order);
      const namespace = this.namespaceOf(node);
      if (node.type === 'composite') {
        let composites = this.composites.get(namespace);
        if (composites === undefined) this.composites.set(namespace, (composites = []));
        composites.push(node);
      } else if (node.type !== 'path') {
        const own = transaction.readNode(node).input.own;
        if (own.id !== undefined) {
          let declarations = this.declarations.get(namespace);
          if (declarations === undefined) this.declarations.set(namespace, (declarations = new Map()));
          const add = (name: string, path: PropertyPath) => {
            let bindings = declarations.get(name);
            if (bindings === undefined) declarations.set(name, (bindings = []));
            bindings.push({ node, path });
          };
          add(own.id, [...paths.get(node)!, 'id']);
          if (own.type === 'node')
            own.aliasIds?.forEach((name, index) => add(name, [...paths.get(node)!, 'aliasIds', index]));
        }
      }
      let parent = transaction.readNode(node).parent;
      for (;;) {
        this.ends.set(parent, order);
        if (parent.type === 'root') break;
        parent = transaction.readNode(parent).parent;
      }
      if (node.type === 'scope' && !this.ends.has(node)) this.ends.set(node, order);
      order++;
    }
  }

  /** 取得所属局部命名空间；Scope 自身的名称仍写入父空间 */
  namespaceOf(node: WeaveNode): WeaveRoot | WeaveScopeNode {
    let parent = this.transaction.readNode(node).parent;
    while (parent.type !== 'root' && !this.transaction.readNode(parent).input.own.localNamespace)
      parent = this.transaction.readNode(parent).parent;
    return parent;
  }

  /** 外部生成名称按实例准备结果查询；调用方先完成可见 Composite 的名称发布 */
  lookup(
    query: WeaveNameQuery,
    generatedBindings: (node: Extract<WeaveNode, { type: 'composite' }>) => ReadonlyArray<NamespaceFrameChange>,
  ): WeaveNameBinding | undefined {
    let namespace = this.namespaceOf(query.consumer);
    let boundary =
      query.visibility === 'closed'
        ? (this.ends.get(this.transaction.readNode(query.consumer).parent) ?? -1)
        : this.order.get(query.consumer)! - 1;
    for (;;) {
      const declarations = this.declarations.get(namespace)?.get(query.name) ?? [];
      const authored = declarations.findLast(binding => this.order.get(binding.node)! <= boundary);
      const composites = this.composites.get(namespace) ?? [];
      for (let index = composites.length - 1; index >= 0; index--) {
        const node = composites[index];
        if (this.order.get(node)! > boundary) continue;
        if (authored !== undefined && this.order.get(node)! < this.order.get(authored.node)!) break;
        {
          const bindings = generatedBindings(node);
          for (let bindingIndex = bindings.length - 1; bindingIndex >= 0; bindingIndex--) {
            const binding = bindings[bindingIndex];
            if (binding.id === query.name) return { node, path: binding.entry.irPath, generated: binding };
          }
          continue;
        }
      }
      if (authored !== undefined) return authored;
      if (namespace.type === 'root') return;
      boundary = this.order.get(namespace)!;
      namespace = this.namespaceOf(namespace);
    }
  }
}
