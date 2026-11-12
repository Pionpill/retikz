import type { PropertyPath } from '@retikz/foundation';

import type { NamespaceFrameChange } from '../../compile/runtime';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from '../shared';
import { WeaveLookup } from './lookup';
import { readWeaveCandidate, readWeaveCurrent } from './transaction';

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
  /** 名称与可能生成名称的作者声明，结构地址由共享索引提供 */
  private readonly declarations: WeaveLookup<string, ReadonlySet<WeaveNode>>;
  private readonly composites: WeaveLookup<Extract<WeaveNode, { type: 'composite' }>, true>;
  /** 前一候选声明的反向索引，支持同批连续改名 */
  private readonly memberships: WeaveLookup<WeaveNode, ReadonlyArray<string>>;

  constructor(
    private readonly paths: ReadonlyMap<WeaveNode, PropertyPath>,
    previous?: WeaveNameIndex,
    changed: ReadonlySet<WeaveNode> = new Set(paths.keys()),
    removed: ReadonlySet<WeaveNode> = new Set(),
  ) {
    this.declarations = new WeaveLookup(previous?.declarations);
    this.composites = new WeaveLookup(previous?.composites);
    this.memberships = new WeaveLookup(previous?.memberships);
    for (const node of new Set([...changed, ...removed])) {
      const before = node.current?.input.own;
      const after = removed.has(node) ? undefined : readWeaveCandidate(node).input.own;
      const names = (own: typeof before): Array<string> =>
        own === undefined || 'namespace' in own
          ? []
          : [...(own.id === undefined ? [] : [own.id]), ...('aliasIds' in own ? (own.aliasIds ?? []) : [])];
      const nextNames = new Set(names(after));
      for (const name of new Set([...(this.memberships.get(node) ?? []), ...nextNames])) {
        const entries = new Set(this.declarations.get(name));
        if (nextNames.has(name)) entries.add(node);
        else entries.delete(node);
        if (entries.size === 0) this.declarations.delete(name);
        else this.declarations.set(name, entries);
      }
      if (removed.has(node)) this.memberships.delete(node);
      else this.memberships.set(node, [...nextNames]);
      if (node.type === 'composite') {
        if (removed.has(node)) this.composites.delete(node);
        else this.composites.set(node, true);
      }
    }
  }

  /** 用真实地址比较声明顺序，插入不重编号整棵树 */
  private compare(left: PropertyPath, right: PropertyPath): number {
    for (let index = 1; index < Math.min(left.length, right.length); index += 2) {
      const difference = (left[index] as number) - (right[index] as number);
      if (difference !== 0) return difference;
    }
    return left.length - right.length;
  }

  /** 取得所属局部命名空间；Scope 自身的名称仍写入父空间 */
  namespaceOf(node: WeaveNode, committed = false): WeaveRoot | WeaveScopeNode {
    const read = committed ? readWeaveCurrent : readWeaveCandidate;
    let parent = read(node).parent;
    while (parent.type !== 'root' && !read(parent).input.own.localNamespace) parent = read(parent).parent;
    return parent;
  }

  /** 操作寻址使用容器闭合后的最后同名作者，不包含 Composite 生成节点 */
  lastDeclaration(namespace: WeaveRoot | WeaveScopeNode, name: string): WeaveNode | undefined {
    let found: WeaveNode | undefined;
    for (const node of this.declarations.get(name) ?? []) {
      if (this.namespaceOf(node) !== namespace) continue;
      if (found === undefined || this.compare(this.paths.get(node)!, this.paths.get(found)!) > 0) found = node;
    }
    return found;
  }

  /** 外部生成名称按实例准备结果查询；调用方先完成可见 Composite 的名称发布 */
  lookup(
    query: WeaveNameQuery,
    generatedBindings: (node: Extract<WeaveNode, { type: 'composite' }>) => ReadonlyArray<NamespaceFrameChange>,
    committed = false,
  ): WeaveNameBinding | undefined {
    const read = committed ? readWeaveCurrent : readWeaveCandidate;
    let namespace = this.namespaceOf(query.consumer, committed);
    const parent = read(query.consumer).parent;
    let boundary =
      query.visibility === 'closed'
        ? parent.type === 'root'
          ? []
          : this.paths.get(parent)!
        : this.paths.get(query.consumer)!;
    let closed = query.visibility === 'closed';
    let inclusive = false;
    for (;;) {
      const visible = (node: WeaveNode) => {
        if (this.namespaceOf(node, committed) !== namespace) return false;
        const path = this.paths.get(node)!;
        if (closed && boundary.every((part, index) => path[index] === part)) return true;
        const order = this.compare(path, boundary);
        return order < 0 || (inclusive && order === 0);
      };
      let authored: WeaveNameBinding | undefined;
      for (const node of this.declarations.get(query.name) ?? []) {
        if (
          !visible(node) ||
          (authored !== undefined && this.compare(this.paths.get(node)!, this.paths.get(authored.node)!) <= 0)
        )
          continue;
        const alias = node.type === 'node' ? (read(node).input.own.aliasIds?.indexOf(query.name) ?? -1) : -1;
        authored = { node, path: [...this.paths.get(node)!, ...(alias < 0 ? ['id'] : ['aliasIds', alias])] };
      }
      const composites = [...this.composites.keys()]
        .filter(visible)
        .sort((left, right) => this.compare(this.paths.get(right)!, this.paths.get(left)!));
      for (const node of composites) {
        if (authored !== undefined && this.compare(this.paths.get(node)!, this.paths.get(authored.node)!) < 0) break;
        const bindings = generatedBindings(node);
        for (let index = bindings.length - 1; index >= 0; index--) {
          const binding = bindings[index];
          if (binding.id === query.name) return { node, path: binding.entry.irPath, generated: binding };
        }
      }
      if (authored !== undefined) return authored;
      if (namespace.type === 'root') return;
      boundary = this.paths.get(namespace)!;
      closed = false;
      inclusive = true;
      namespace = this.namespaceOf(namespace, committed);
    }
  }
}
