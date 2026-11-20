import type { PropertyPath } from '@retikz/foundation';
import { isPropertyPathEqual } from '@retikz/foundation';

import { createCompileChildPath } from '../../compile';
import type { WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import { WeaveLookup } from './lookup';
import { WeaveNameIndex } from './namespace';
import type { WeaveTransaction } from './transaction';

/** 作者声明的派生寻址索引；普通属性更新保持索引身份，结构变动才重建 */
export class WeaveAddressIndex {
  /** 条目到当前作者声明地址的派生映射 */
  readonly paths: WeaveLookup<WeaveEntry, PropertyPath>;
  /** 编译阶段地址到作者身份的反向映射 */
  readonly entries: WeaveLookup<string, WeaveEntry>;
  /** 保留声明阶段可见性的名称查询 */
  readonly names: WeaveNameIndex;

  constructor(
    root: WeaveRoot,
    transaction: WeaveTransaction,
    previous?: WeaveAddressIndex,
    changed: ReadonlySet<WeaveEntry> = new Set(),
    removed: ReadonlySet<WeaveEntry> = new Set(),
    structure?: { parent: WeaveRoot | WeaveScopeEntry; index: number },
    moved?: (entry: WeaveEntry) => void,
  ) {
    this.paths = new WeaveLookup(previous?.paths);
    this.entries = new WeaveLookup(previous?.entries);
    const touched = new Set(changed);
    for (const entry of removed) {
      this.entries.delete(JSON.stringify(this.paths.get(entry)));
      this.paths.delete(entry);
    }
    const visit = (parent: WeaveRoot | WeaveScopeEntry, prefix: PropertyPath) => {
      for (const [index, entry] of transaction.readState(parent).children.entries()) {
        const path = createCompileChildPath(prefix, index);
        if (!isPropertyPathEqual(previous?.paths.get(entry) ?? [], path)) moved?.(entry);
        this.paths.set(entry, path);
        this.entries.set(JSON.stringify(path), entry);
        touched.add(entry);
        if (entry.type === 'scope') visit(entry, path);
      }
    };
    if (previous === undefined) visit(root, []);
    else if (structure !== undefined) {
      const prefix = structure.parent.type === 'root' ? [] : this.paths.get(structure.parent)!;
      const children = transaction.readState(structure.parent).children;
      const clear = (entry: WeaveEntry) => {
        this.entries.delete(JSON.stringify(this.paths.get(entry)));
        if (entry.type === 'scope') for (const child of transaction.readState(entry).children) clear(child);
      };
      for (let index = structure.index; index < children.length; index++) clear(children[index]);
      for (let index = structure.index; index < children.length; index++) {
        const entry = children[index];
        const path = createCompileChildPath(prefix, index);
        if (!isPropertyPathEqual(previous.paths.get(entry) ?? [], path)) moved?.(entry);
        this.paths.set(entry, path);
        this.entries.set(JSON.stringify(path), entry);
        touched.add(entry);
        if (entry.type === 'scope') visit(entry, path);
      }
    }
    this.names = new WeaveNameIndex(this.paths, previous?.names, touched, removed);
  }
}
