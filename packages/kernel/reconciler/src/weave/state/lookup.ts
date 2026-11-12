/** 索引树的只读分支；写入仅复制搜索路径 */
type LookupBranch<TKey, TValue> = Readonly<{
  key: TKey;
  value: TValue;
  left?: LookupBranch<TKey, TValue>;
  right?: LookupBranch<TKey, TValue>;
  height: number;
  size: number;
}>;

/** 对象键的进程内比较顺序；弱引用不延长作者节点生命周期 */
const identities = new WeakMap<object, number>();
let nextIdentity = 0;
const identityOf = (key: object): number => {
  let identity = identities.get(key);
  if (identity === undefined) identities.set(key, (identity = ++nextIdentity));
  return identity;
};

/** ⚡可共享快照的 Weave 寻址表，候选只复制 AVL 搜索路径而非整张 Map */
export class WeaveLookup<TKey extends string | object, TValue> extends Map<TKey, TValue> {
  private branch: LookupBranch<TKey, TValue> | undefined;

  override get size(): number {
    return this.branch?.size ?? 0;
  }

  constructor(previous?: WeaveLookup<TKey, TValue>) {
    super();
    this.branch = previous?.branch;
  }

  /** 常数时间创建隔离视图；后续写入不会改变前一版本 */
  fork(): WeaveLookup<TKey, TValue> {
    return new WeaveLookup(this);
  }

  override get(key: TKey): TValue | undefined {
    return this.find(key)?.value;
  }
  override has(key: TKey): boolean {
    return this.find(key) !== undefined;
  }
  override clear(): void {
    this.branch = undefined;
  }
  override set(key: TKey, value: TValue): this {
    this.branch = this.change(this.branch, key, { value });
    return this;
  }
  override delete(key: TKey): boolean {
    if (!this.has(key)) return false;
    this.branch = this.change(this.branch, key);
    return true;
  }
  override *entries(): MapIterator<[TKey, TValue]> {
    const visit = function* (branch: LookupBranch<TKey, TValue> | undefined): Generator<[TKey, TValue]> {
      if (branch === undefined) return;
      yield* visit(branch.left);
      yield [branch.key, branch.value];
      yield* visit(branch.right);
    };
    yield* visit(this.branch);
  }
  override *keys(): MapIterator<TKey> {
    for (const [key] of this.entries()) yield key;
  }
  override *values(): MapIterator<TValue> {
    for (const [, value] of this.entries()) yield value;
  }
  override [Symbol.iterator](): MapIterator<[TKey, TValue]> {
    return this.entries();
  }
  override forEach(callback: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: unknown): void {
    for (const [key, value] of this.entries()) callback.call(thisArg, value, key, this);
  }

  /** 索引不依赖 Map 插入顺序；声明顺序由作者地址决定 */
  private compare(left: TKey, right: TKey): number {
    if (left === right) return 0;
    if (typeof left === 'string') return typeof right === 'string' ? (left < right ? -1 : 1) : -1;
    if (typeof right === 'string') return 1;
    return identityOf(left) - identityOf(right);
  }
  private find(key: TKey): LookupBranch<TKey, TValue> | undefined {
    let branch = this.branch;
    while (branch !== undefined) {
      const direction = this.compare(key, branch.key);
      if (direction === 0) return branch;
      branch = direction < 0 ? branch.left : branch.right;
    }
  }
  private create(
    key: TKey,
    value: TValue,
    left?: LookupBranch<TKey, TValue>,
    right?: LookupBranch<TKey, TValue>,
  ): LookupBranch<TKey, TValue> {
    return {
      key,
      value,
      left,
      right,
      height: 1 + Math.max(left?.height ?? 0, right?.height ?? 0),
      size: 1 + (left?.size ?? 0) + (right?.size ?? 0),
    };
  }
  private balance(branch: LookupBranch<TKey, TValue>): LookupBranch<TKey, TValue> {
    const { left, right } = branch;
    if ((left?.height ?? 0) - (right?.height ?? 0) > 1) {
      const pivot = left!;
      if ((pivot.left?.height ?? 0) >= (pivot.right?.height ?? 0))
        return this.create(
          pivot.key,
          pivot.value,
          pivot.left,
          this.create(branch.key, branch.value, pivot.right, right),
        );
      const middle = pivot.right!;
      return this.create(
        middle.key,
        middle.value,
        this.create(pivot.key, pivot.value, pivot.left, middle.left),
        this.create(branch.key, branch.value, middle.right, right),
      );
    }
    if ((right?.height ?? 0) - (left?.height ?? 0) > 1) {
      const pivot = right!;
      if ((pivot.right?.height ?? 0) >= (pivot.left?.height ?? 0))
        return this.create(
          pivot.key,
          pivot.value,
          this.create(branch.key, branch.value, left, pivot.left),
          pivot.right,
        );
      const middle = pivot.left!;
      return this.create(
        middle.key,
        middle.value,
        this.create(branch.key, branch.value, left, middle.left),
        this.create(pivot.key, pivot.value, middle.right, pivot.right),
      );
    }
    return branch;
  }
  /** 插入、替换与删除共享同一平衡操作，旧分支始终只读 */
  private change(
    branch: LookupBranch<TKey, TValue> | undefined,
    key: TKey,
    entry?: { value: TValue },
  ): LookupBranch<TKey, TValue> | undefined {
    if (branch === undefined) return entry === undefined ? undefined : this.create(key, entry.value);
    const direction = this.compare(key, branch.key);
    if (direction < 0)
      return this.balance(this.create(branch.key, branch.value, this.change(branch.left, key, entry), branch.right));
    if (direction > 0)
      return this.balance(this.create(branch.key, branch.value, branch.left, this.change(branch.right, key, entry)));
    if (entry !== undefined) return this.create(key, entry.value, branch.left, branch.right);
    if (branch.left === undefined) return branch.right;
    if (branch.right === undefined) return branch.left;
    let successor = branch.right;
    while (successor.left !== undefined) successor = successor.left;
    return this.balance(
      this.create(successor.key, successor.value, branch.left, this.change(branch.right, successor.key)),
    );
  }
}
