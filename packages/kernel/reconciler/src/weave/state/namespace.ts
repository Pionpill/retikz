import type { PropertyPath } from '@retikz/foundation';

import type { NamespaceFrameChange } from '../../compile';
import type { WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import { WeaveLookup } from './lookup';
import { readWeaveCandidate, readWeaveCurrent } from './read';

/** 名称查询保留消费者身份与原有声明阶段，不以队列执行顺序改变可见性 */
export type WeaveNameQuery = Readonly<{
  consumer: WeaveEntry;
  name: string;
  visibility: 'declaration' | 'closed';
}>;

/** 查询命中的作者身份与具体声明；生成名称仍归所属 Composite */
export type WeaveNameBinding = Readonly<{
  entry: WeaveEntry;
  path: PropertyPath;
  generated?: NamespaceFrameChange;
}>;

type CompositeEntry = Extract<WeaveEntry, { type: 'composite' }>;

/** 从候选声明事实建立本批可见性索引，不保存编译栈或领域计算闭包 */
export class WeaveNameIndex {
  /** 名称与可能生成名称的作者声明，结构地址由共享索引提供 */
  private readonly declarations: WeaveLookup<string, ReadonlySet<WeaveEntry>>;
  private readonly composites: WeaveLookup<Extract<WeaveEntry, { type: 'composite' }>, true>;
  private ordered?: Array<{ entry: CompositeEntry; path: PropertyPath }>;
  /** 前一候选声明的反向索引，支持同批连续改名 */
  private readonly memberships: WeaveLookup<WeaveEntry, ReadonlyArray<string>>;

  constructor(
    private readonly paths: ReadonlyMap<WeaveEntry, PropertyPath>,
    previous?: WeaveNameIndex,
    changed: ReadonlySet<WeaveEntry> = new Set(paths.keys()),
    removed: ReadonlySet<WeaveEntry> = new Set(),
  ) {
    this.declarations = new WeaveLookup(previous?.declarations);
    this.composites = new WeaveLookup(previous?.composites);
    this.memberships = new WeaveLookup(previous?.memberships);
    for (const entry of new Set([...changed, ...removed])) {
      const before = entry.current?.origin.own;
      const after = removed.has(entry) ? undefined : readWeaveCandidate(entry).origin.own;
      const names = (own: typeof before): Array<string> =>
        own === undefined || 'namespace' in own
          ? []
          : [...(own.id === undefined ? [] : [own.id]), ...('aliasIds' in own ? (own.aliasIds ?? []) : [])];
      const declarations = names(after);
      const previousNames = this.memberships.get(entry);
      // ⚡无名称时不建立空索引；成员关系未变时复用原声明集合
      if (declarations.length > 0 || previousNames !== undefined) {
        const nextNames = new Set(declarations);
        for (const name of new Set([...(previousNames ?? []), ...nextNames])) {
          const current = this.declarations.get(name);
          const present = nextNames.has(name);
          if ((current?.has(entry) ?? false) === present) continue;
          const entries = new Set(current);
          if (present) entries.add(entry);
          else entries.delete(entry);
          if (entries.size === 0) this.declarations.delete(name);
          else this.declarations.set(name, entries);
        }
        if (nextNames.size === 0) this.memberships.delete(entry);
        else this.memberships.set(entry, [...nextNames]);
      }
      if (entry.type === 'composite') {
        if (removed.has(entry)) this.composites.delete(entry);
        else this.composites.set(entry, true);
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
  namespaceOf(entry: WeaveEntry, committed = false): WeaveRoot | WeaveScopeEntry {
    const read = committed ? readWeaveCurrent : readWeaveCandidate;
    let parent = read(entry).parent;
    while (parent.type !== 'root' && !read(parent).origin.own.localNamespace) parent = read(parent).parent;
    return parent;
  }

  /** 操作寻址使用容器闭合后的最后同名作者，不包含 Composite 生成节点 */
  lastDeclaration(namespace: WeaveRoot | WeaveScopeEntry, name: string): WeaveEntry | undefined {
    let found: WeaveEntry | undefined;
    for (const entry of this.declarations.get(name) ?? []) {
      if (this.namespaceOf(entry) !== namespace) continue;
      if (found === undefined || this.compare(this.paths.get(entry)!, this.paths.get(found)!) > 0) found = entry;
    }
    return found;
  }

  /** 外部生成名称按实例准备结果查询；调用方先完成可见 Composite 的名称发布 */
  lookup(
    query: WeaveNameQuery,
    generatedBindings: (entry: Extract<WeaveEntry, { type: 'composite' }>) => ReadonlyArray<NamespaceFrameChange>,
    committed = false,
    previousCandidate?: (index: number, entry: CompositeEntry) => number,
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
      const withinBoundary = (path: PropertyPath) => {
        if (closed && boundary.every((part, index) => path[index] === part)) return true;
        const order = this.compare(path, boundary);
        return order < 0 || (inclusive && order === 0);
      };
      let authored: WeaveNameBinding | undefined;
      for (const entry of this.declarations.get(query.name) ?? []) {
        if (
          this.namespaceOf(entry, committed) !== namespace ||
          !withinBoundary(this.paths.get(entry)!) ||
          (authored !== undefined && this.compare(this.paths.get(entry)!, this.paths.get(authored.entry)!) <= 0)
        )
          continue;
        const alias = entry.type === 'node' ? (read(entry).origin.own.aliasIds?.indexOf(query.name) ?? -1) : -1;
        authored = { entry, path: [...this.paths.get(entry)!, ...(alias < 0 ? ['id'] : ['aliasIds', alias])] };
      }
      // ⚡地址快照内只排一次声明顺序，二分跳过消费位置之后不可见的生产者
      const ordered = (this.ordered ??= Array.from(this.composites.keys(), entry => ({
        entry,
        path: this.paths.get(entry)!,
      })).sort((left, right) => this.compare(left.path, right.path)));
      let start = 0;
      let end = ordered.length;
      while (start < end) {
        const middle = Math.floor((start + end) / 2);
        if (withinBoundary(ordered[middle].path)) start = middle + 1;
        else end = middle;
      }
      for (let cursor = start - 1; cursor >= 0;) {
        const { entry, path } = ordered[cursor];
        const candidate = previousCandidate?.(cursor, entry) ?? cursor;
        if (candidate < cursor) {
          cursor = candidate;
          continue;
        }
        cursor--;
        if (authored !== undefined && this.compare(path, this.paths.get(authored.entry)!) < 0) break;
        if (this.namespaceOf(entry, committed) !== namespace) continue;
        const bindings = generatedBindings(entry);
        for (let index = bindings.length - 1; index >= 0; index--) {
          const binding = bindings[index];
          if (binding.id === query.name) return { entry, path: binding.entry.irPath, generated: binding };
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
