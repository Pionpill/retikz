import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';
import type { WeaveEntry, WeaveRoot } from '../shared';
import { WeaveLookup } from './lookup';
import type { WeaveStateOf, WeaveStateOwner } from './read';

/** 支持按需浅拷贝的状态属性 */
type WeaveAttribute = ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | ReadonlyArray<unknown>;

/** 仅允许条目状态中实际存在的可复制属性 */
type WeaveAttributeKey<TState> = TState extends object
  ? {
      [TKey in keyof TState]-?: [NonNullable<TState[TKey]>] extends [never]
        ? never
        : NonNullable<TState[TKey]> extends WeaveAttribute
          ? TKey
          : never;
    }[keyof TState]
  : never;

/** 内部属性访问视图；具体字段与返回类型由 editStateAttribute 的调用签名约束 */
type WeaveAttributeState = Partial<Record<WeaveAttributeKey<WeaveStateOf<WeaveStateOwner>>, WeaveAttribute>>;

/** 保留属性成员类型，仅将外层容器转为可写 */
type EditableWeaveAttribute<TAttribute> =
  TAttribute extends ReadonlyMap<infer TKey, infer TValue>
    ? Map<TKey, TValue>
    : TAttribute extends ReadonlySet<infer TElement>
      ? Set<TElement>
      : TAttribute extends ReadonlyArray<infer TElement>
        ? Array<TElement>
        : never;

/** 每棵树同时只有一个候选工作区 */
const activeRoots = new WeakSet<WeaveRoot>();

/** 单批状态隔离与提交恢复，不负责输入操作或计算调度 */
export class WeaveTransaction {
  /** key 为本事务修改的条目或根，value 为修改前的 current 引用；新条目为 null，用于提交与回滚 */
  private readonly previous = new Map<WeaveStateOwner, WeaveStateOwner['current']>();
  /** 本事务拥有的外层 Map、Set、Array 副本，避免重复浅拷贝；不表示拥有集合内部成员 */
  private readonly ownedCollections = new WeakSet<WeaveAttribute>();
  /** preparing 允许编辑，committed 保留回滚依据，closed 表示事务已结束 */
  private phase: 'preparing' | 'committed' | 'closed' = 'preparing';

  constructor(private readonly root: WeaveRoot) {
    if (activeRoots.has(root))
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave tree already has a candidate');
    activeRoots.add(root);
  }

  /** 获取状态所有者的候选或当前状态 */
  readState<TOwner extends WeaveStateOwner>(owner: TOwner): Readonly<WeaveStateOf<TOwner>> {
    this.assertPreparing();
    const state = owner.pending ?? owner.current;
    if (state === null)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no readable state');
    return state as Readonly<WeaveStateOf<TOwner>>;
  }

  /** 首次写入仅复制状态壳；共享字段仍保持只读 */
  editState<TOwner extends WeaveStateOwner>(owner: TOwner): WeaveStateOf<TOwner> {
    this.assertPreparing();
    if (!this.previous.has(owner)) this.previous.set(owner, owner.current);
    if (owner.pending === null) {
      if (owner.current === null)
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no readable state');
      owner.pending = { ...owner.current };
    }
    return owner.pending;
  }

  /**
   * 获取候选状态中可安全修改的属性；同批首次写入浅拷贝，之后复用副本
   * @remarks 仅支持 Map、Set、Array；内部成员仍只读共享，可选属性不存在时不自动创建
   */
  editStateAttribute<
    TOwner extends WeaveStateOwner,
    TKey extends keyof WeaveStateOf<TOwner> & WeaveAttributeKey<WeaveStateOf<TOwner>>,
  >(owner: TOwner, key: TKey): EditableWeaveAttribute<NonNullable<WeaveStateOf<TOwner>[TKey]>>;
  editStateAttribute(owner: WeaveStateOwner, key: keyof WeaveAttributeState): WeaveAttribute {
    const state: WeaveAttributeState = this.editState(owner);
    const source = state[key];
    if (source === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave state attribute is absent', {
        details: { attribute: key },
      });
    const attribute = this.ownedCollections.has(source) ? source : this.copyAttribute(source);
    this.ownedCollections.add(attribute);
    // 拷贝保持原属性的容器种类和成员类型，只写回同一字段
    state[key] = attribute;
    return attribute;
  }

  /** 删除成员不再提交其候选状态；已提交对象留给回滚结构引用 */
  discardEntry(entry: WeaveEntry): void {
    this.assertPreparing();
    if (this.previous.has(entry)) {
      entry.pending = null;
      this.previous.delete(entry);
    }
  }

  /** 同步提交触及状态，保留恢复指针直到事务最终确认 */
  commit(): void {
    this.assertPreparing();
    // 先验证全部状态，避免检查失败时产生部分切换
    for (const entry of this.previous.keys()) {
      if (
        entry.pending === null ||
        (entry.type !== 'root' && entry.type !== 'composite' && entry.pending.compile === undefined)
      )
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Compile, 'Cannot commit unfinished Weave state');
    }
    for (const entry of this.previous.keys()) {
      entry.current = entry.pending;
      entry.pending = null;
    }
    this.phase = 'committed';
  }

  /** 最终确认成功，释放恢复依据与树级占用 */
  finish(): void {
    if (this.phase !== 'committed')
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave transaction is not committed');
    this.closeTransaction();
  }

  /** 放弃候选，或恢复已切换但尚未确认的状态 */
  rollback(): void {
    if (this.phase === 'closed') return;
    for (const [entry, previous] of this.previous) {
      entry.current = previous;
      entry.pending = null;
    }
    this.closeTransaction();
  }

  /** 准备状态检测 */
  private assertPreparing(): void {
    if (this.phase !== 'preparing')
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave transaction is not preparing');
  }

  /** 清除恢复引用并释放本树的事务占用 */
  private closeTransaction(): void {
    this.previous.clear();
    this.phase = 'closed';
    activeRoots.delete(this.root);
  }

  /** 根据属性的容器类型浅拷贝，成员对象继续共享 */
  private copyAttribute(source: WeaveAttribute): WeaveAttribute {
    if (source instanceof WeaveLookup) return source.fork();
    if (source instanceof Map) return new Map(source);
    if (source instanceof Set) return new Set(source);
    // 三种内置容器穷尽后只剩数组，ReadonlyArray 无法通过 instanceof 收窄
    return [...(source as ReadonlyArray<unknown>)];
  }
}
