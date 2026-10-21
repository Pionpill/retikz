import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import type { WeaveNode, WeaveRoot } from './types';

/** 状态槽的稳定所有者 */
type WeaveStateOwner = WeaveNode | WeaveRoot;

/** 从具体节点类别保留其状态类型 */
type WeaveStateOf<TNode extends WeaveStateOwner> = NonNullable<TNode['current']>;

/** 支持按需浅拷贝的状态属性 */
type WeaveAttribute = ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | ReadonlyArray<unknown>;

/** 仅允许节点状态中实际存在的可复制属性 */
type WeaveAttributeKey<TState> = TState extends object
  ? {
      [TKey in keyof TState]-?: [NonNullable<TState[TKey]>] extends [never]
        ? never
        : NonNullable<TState[TKey]> extends WeaveAttribute
          ? TKey
          : never;
    }[keyof TState]
  : never;

/** 内部属性访问视图；具体字段与返回类型由 editNodeAttribute 的调用签名约束 */
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

/** 读取已提交状态，不把候选当作当前结果 */
export const readWeaveCurrent = <TNode extends WeaveStateOwner>(node: TNode): Readonly<WeaveStateOf<TNode>> => {
  if (node.current === null)
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no committed state');
  // 状态只能从同一所有者读取，类别关联由节点联合保证
  return node.current as Readonly<WeaveStateOf<TNode>>;
};

/** 每棵树同时只有一个候选工作区 */
const activeRoots = new WeakSet<WeaveRoot>();

/** 单批状态隔离与提交恢复，不负责输入操作或计算调度 */
export class WeaveTransaction {
  /** key 为本事务修改的节点或根，value 为修改前的 current 引用；新节点为 null，用于提交与回滚 */
  private readonly previous = new Map<WeaveStateOwner, WeaveStateOwner['current']>();
  /** 本事务拥有的外层 Map、Set、Array 副本，避免重复浅拷贝；不表示拥有集合内部成员 */
  private readonly ownedCollections = new WeakSet<object>();
  /** preparing 允许编辑，committed 保留回滚依据，closed 表示事务已结束 */
  private phase: 'preparing' | 'committed' | 'closed' = 'preparing';

  constructor(private readonly root: WeaveRoot) {
    if (activeRoots.has(root))
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave tree already has a candidate');
    activeRoots.add(root);
  }

  /** 获取某个节点的状态 (pending 或 current) */
  readNode<TNode extends WeaveStateOwner>(node: TNode): Readonly<WeaveStateOf<TNode>> {
    this.assertPreparing();
    const state = node.pending ?? node.current;
    if (state === null)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no readable state');
    return state as Readonly<WeaveStateOf<TNode>>;
  }

  /** 首次写入仅复制状态壳；共享字段仍保持只读 */
  editNode<TNode extends WeaveStateOwner>(node: TNode): WeaveStateOf<TNode> {
    this.assertPreparing();
    if (!this.previous.has(node)) this.previous.set(node, node.current);
    if (node.pending === null) {
      if (node.current === null)
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no readable state');
      node.pending = { ...node.current };
    }
    return node.pending;
  }

  /**
   * 获取候选状态中可安全修改的属性；同批首次写入浅拷贝，之后复用副本
   * @remarks 仅支持 Map、Set、Array；内部成员仍只读共享，可选属性不存在时不自动创建
   */
  editNodeAttribute<
    TNode extends WeaveStateOwner,
    TKey extends keyof WeaveStateOf<TNode> & WeaveAttributeKey<WeaveStateOf<TNode>>,
  >(node: TNode, key: TKey): EditableWeaveAttribute<NonNullable<WeaveStateOf<TNode>[TKey]>>;
  editNodeAttribute(node: WeaveStateOwner, key: keyof WeaveAttributeState): WeaveAttribute {
    const state: WeaveAttributeState = this.editNode(node);
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
  discardNode(node: WeaveNode): void {
    this.assertPreparing();
    if (this.previous.has(node)) {
      node.pending = null;
      this.previous.delete(node);
    }
  }

  /** 同步提交触及状态，保留恢复指针直到事务最终确认 */
  commit(): void {
    this.assertPreparing();
    // 先验证全部状态，避免检查失败时产生部分切换
    for (const node of this.previous.keys()) {
      if (node.pending === null || (node.type !== 'root' && node.pending.compiled === null))
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Compile, 'Cannot commit unfinished Weave state');
    }
    for (const node of this.previous.keys()) {
      node.current = node.pending;
      node.pending = null;
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
    for (const [node, previous] of this.previous) {
      node.current = previous;
      node.pending = null;
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
    if (source instanceof Map) return new Map(source);
    if (source instanceof Set) return new Set(source);
    // 三种内置容器穷尽后只剩数组，ReadonlyArray 无法通过 instanceof 收窄
    return [...(source as ReadonlyArray<unknown>)];
  }
}
