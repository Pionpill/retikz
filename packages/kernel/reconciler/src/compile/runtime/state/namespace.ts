import { RetikzCoreError, RetikzCoreErrorCode, registerFatalProbeError } from '@retikz/core';
import type { CompiledReferenceGeometry, ReferenceReadKind } from '@retikz/core';
import type { PropertyPath, WithOptionalProperties } from '@retikz/foundation';
import { createIdAllocator } from '@retikz/foundation';

import type { CompileNamespaceKey } from '../../provenance';
import type { DuplicateRegisterInfo } from '../../shared';
import { createExecutionInvariantError } from '../errors';

/** namespace 栈当前写入/解析阶段 */
type NamespacePhase = 'registering' | 'resolving';

/** 名称绑定的几何编译产物的编译生命周期状态 */
type NamespaceEntryState = 'resolved' | 'scope-placeholder';

/** namespace 中带生命周期状态的内部条目 */
export type NamespaceEntry = {
  /** 当前名称绑定的来源路径 */
  irPath: PropertyPath;
  /** 当前名称绑定的几何编译产物 */
  geometry: CompiledReferenceGeometry;
  /** 区分已就绪引用与尚未闭合的 Scope 占位引用 */
  state: NamespaceEntryState;
  /** Scope 自身的内部身份，不随占位布局替换或投影改变 */
  scopeId?: string;
};

/** namespace 单次 register 的内部观测信息 */
type NamespaceRegisterInfo = {
  /** 本次注册的 id */
  id: string;
  /** 当前 frame 深度 */
  frameDepth: number;
  /** register 调用方提供的 IR locator */
  irPath: PropertyPath;
  /** 是否覆盖同 frame 既有注册 */
  isOverwrite: boolean;
};

/** NamespaceStack 构造选项 */
type NamespaceStackOptions = {
  /** 根 frame 身份，可与调用方的来源根共享 */
  rootIdentity?: CompileNamespaceKey;
  /** 同 frame 重复 register 时的回调 */
  onDuplicate?: (info: DuplicateRegisterInfo) => void;
  /** 每次 register 完成后的内部观测回调 */
  onRegister?: (info: NamespaceRegisterInfo) => void;
};

/** probe 相对父 namespace 当前 frame 的可提交变更 */
export type NamespaceFrameChange = {
  /** 注册或覆盖的 id */
  id: string;
  /** probe 完成后的 entry */
  entry: NamespaceEntry;
  /** 相对 probe baseline 新增的全部注册位置，按声明顺序排列 */
  irPaths: ReadonlyArray<PropertyPath>;
};

/** 单层命名空间的身份、有效绑定与声明记录 */
type NamespaceFrame = {
  /** 注册覆盖不改变的命名空间身份 */
  identity: CompileNamespaceKey;
  /** 各 id 当前生效的绑定 */
  entryMap: Map<string, NamespaceEntry>;
  /** 各 id 按声明顺序记录的完整 IR 位置，覆盖绑定时仍保留 */
  pathMap: Map<string, ReadonlyArray<PropertyPath>>;
};

/**
 * 栈式 namespace frame
 * @description register 写入栈顶，lookup 按 inside-out 查找；同 frame 重名 last-wins 并触发诊断
 */
export class NamespaceStack {
  /** 当前阶段读取观察器，嵌套阶段退出时恢复 */
  private readonly referenceObservers: Array<
    (name: string, entry: NamespaceEntry | undefined, kind: ReferenceReadKind) => void
  > = [];

  /** 只观察实际引用读取，不改变名称可见性 */
  observeReferences<T>(
    observe: (name: string, entry: NamespaceEntry | undefined, kind: ReferenceReadKind) => void,
    execute: () => T,
  ): T {
    this.referenceObservers.push(observe);
    try {
      return execute();
    } finally {
      this.referenceObservers.pop();
    }
  }

  /** 正在编译的 Scope；匿名 Scope 也分配身份，fork 保留祖先归属 */
  private readonly scopeAncestorStack: Array<{ scopeId: string; id?: string }> = [];
  /** 栈式 frame 容器；栈底为根 frame，栈顶为当前 frame */
  private readonly frameStack: Array<NamespaceFrame>;
  private readonly onDuplicate?: (info: DuplicateRegisterInfo) => void;
  private readonly onRegister?: (info: NamespaceRegisterInfo) => void;
  /** 引用环境的不可变快照身份，fork 未写入时保持一致 */
  private snapshotIdentity: object = {};

  /** 供同次编译尺寸查询区分可见引用状态 */
  get measurementIdentity(): object {
    return this.snapshotIdentity;
  }

  /** 当前阶段；registering 允许写入，resolving 只允许 lookup */
  private currentPhase: NamespacePhase = 'registering';

  constructor(
    options: NamespaceStackOptions = {},
    private readonly scopeIds = createIdAllocator('compile/scope'),
  ) {
    this.frameStack = [
      {
        identity: options.rootIdentity ?? (Object.freeze({}) as CompileNamespaceKey),
        entryMap: new Map(),
        pathMap: new Map(),
      },
    ];
    this.onDuplicate = options.onDuplicate;
    this.onRegister = options.onRegister;
  }

  /**
   * 创建只读快照语义的独立分支
   * @description frame 容器会复制，既有 layout 只共享读取；后续 register / replace 不回写父栈
   */
  fork(options: NamespaceStackOptions = {}): NamespaceStack {
    const fork = new NamespaceStack(options, this.scopeIds);
    fork.frameStack.splice(
      0,
      fork.frameStack.length,
      ...this.frameStack.map(frame => ({
        identity: frame.identity,
        entryMap: new Map(frame.entryMap),
        pathMap: new Map(frame.pathMap),
      })),
    );
    fork.scopeAncestorStack.push(...this.scopeAncestorStack);
    fork.currentPhase = this.currentPhase;
    fork.snapshotIdentity = this.snapshotIdentity;

    return fork;
  }

  /** 返回当前顶层 frame 相对 base 的新增或覆盖项 */
  diffTopFrame(base: NamespaceStack): Array<NamespaceFrameChange> {
    if (this.frameStack.length !== base.frameStack.length) {
      throw createExecutionInvariantError('NamespaceStack.diffTopFrame: frame depth mismatch after isolated layout');
    }

    const frameIndex = this.frameStack.length - 1;
    const current = this.frameStack[frameIndex].entryMap;
    const baseline = base.frameStack[frameIndex].entryMap;
    const paths = this.frameStack[frameIndex].pathMap;
    const changes: Array<NamespaceFrameChange> = [];

    for (const [id, entry] of current) {
      if (baseline.get(id) === entry) continue;

      changes.push({
        id,
        entry,
        irPaths: paths.get(id)!.slice(base.frameStack[frameIndex].pathMap.get(id)?.length ?? 0),
      });
    }

    return changes;
  }

  /** 将 probe 的全部新增声明提交到实际目标 frame，按当地历史重新生成重名诊断 */
  commitForkChange(change: NamespaceFrameChange): void {
    for (const irPath of change.irPaths) {
      this.register(change.id, { ...change.entry, irPath });
    }
  }

  /** 当前栈深（≥ 1；根 frame 永远存在） */
  get depth(): number {
    return this.frameStack.length;
  }

  /** 当前作用域身份；注册覆盖不改变身份，fork 共享已有 frame 的身份 */
  get identity(): CompileNamespaceKey {
    return this.frameStack[this.frameStack.length - 1].identity;
  }

  /** 推入新 frame；通常对应 `<Scope localNamespace>` 入场 */
  pushFrame(): void {
    this.snapshotIdentity = {};
    this.frameStack.push({
      identity: Object.freeze({}) as CompileNamespaceKey,
      entryMap: new Map(),
      pathMap: new Map(),
    });
  }

  /** 弹出栈顶 frame；根 frame 不可弹出 */
  popFrame(): void {
    if (this.frameStack.length <= 1) {
      throw createExecutionInvariantError(
        'NamespaceStack.popFrame: cannot pop the root frame (internal invariant violated)',
      );
    }

    this.snapshotIdentity = {};
    this.frameStack.pop();
  }

  /** 设置名称处理阶段并更新快照身份；resolving 阶段禁止 register / replaceGeometry */
  setPhase(phase: NamespacePhase): void {
    this.snapshotIdentity = {};
    this.currentPhase = phase;
  }

  /** 注册 id 到栈顶 frame；返回是否覆盖了同 frame 旧值 */
  register(id: string, entry: WithOptionalProperties<NamespaceEntry, 'state'>): boolean {
    const { geometry: layout, irPath, state = 'resolved', scopeId } = entry;
    if (this.currentPhase !== 'registering') {
      throw createExecutionInvariantError(
        `NamespaceStack.register('${id}'): only allowed during registering; current phase is '${this.currentPhase}'`,
      );
    }

    const topFrame = this.frameStack[this.frameStack.length - 1].entryMap;
    const paths = this.frameStack[this.frameStack.length - 1].pathMap;
    const isOverwrite = topFrame.has(id);
    const duplicateIrPaths = [...(paths.get(id) ?? []), irPath];
    paths.set(id, duplicateIrPaths);
    if (isOverwrite) {
      this.onDuplicate?.({
        id,
        frameDepth: this.frameStack.length - 1,
        namespace: this.identity,
        duplicateIrPaths,
      });
    }

    this.snapshotIdentity = {};
    topFrame.set(id, { geometry: layout, irPath, state, ...(scopeId === undefined ? {} : { scopeId }) });
    this.onRegister?.({
      id,
      frameDepth: this.frameStack.length - 1,
      irPath,
      isOverwrite,
    });

    return isOverwrite;
  }

  /** 替换指定 frame 内已注册的几何编译产物；用于 Scope 占位升级，不触发重复 id 诊断 */
  replaceGeometry(
    id: string,
    layout: CompiledReferenceGeometry,
    frameDepth: number,
    expectedScopeId?: string,
  ): boolean {
    if (this.currentPhase !== 'registering') {
      throw createExecutionInvariantError(
        `NamespaceStack.replaceGeometry('${id}'): only allowed during registering; current phase is '${this.currentPhase}'`,
      );
    }

    if (frameDepth < 0 || frameDepth >= this.frameStack.length) {
      throw createExecutionInvariantError(
        `NamespaceStack.replaceGeometry('${id}'): frameDepth ${frameDepth} out of range (stack depth ${this.frameStack.length})`,
      );
    }

    const targetFrame = this.frameStack[frameDepth].entryMap;
    if (!targetFrame.has(id)) {
      throw createExecutionInvariantError(
        `NamespaceStack.replaceGeometry('${id}'): id not previously registered in frame at depth ${frameDepth}`,
      );
    }

    const current = targetFrame.get(id)!;
    if (expectedScopeId !== undefined && current.scopeId !== expectedScopeId) return false;

    this.snapshotIdentity = {};
    targetFrame.set(id, { ...current, geometry: layout, state: 'resolved' });

    return true;
  }

  /** 用新的投影替换本次名称绑定，不原位修改上下文或 fork 共享的条目 */
  replacePublishedGeometry(previous: CompiledReferenceGeometry, next: CompiledReferenceGeometry): void {
    if (previous === next) return;
    for (const { entryMap: frame } of this.frameStack) {
      for (const [id, entry] of frame) {
        if (entry.geometry !== previous) continue;
        frame.set(id, { ...entry, geometry: next });
        this.snapshotIdentity = {};
      }
    }
  }

  /** 为新 Scope 分配内部身份并进入其后代求值区间，作者 id 仅用于诊断 */
  enterScope(id?: string): string {
    const scopeId = this.scopeIds.next();
    this.scopeAncestorStack.push({ scopeId, id });
    return scopeId;
  }

  /** 离开当前 Scope 的后代求值区间 */
  leaveScope(): void {
    this.scopeAncestorStack.pop();
  }

  /** 解析作者几何引用，拒绝实际绑定到祖先 Scope 的目标 */
  lookupReference(id: string, kind: ReferenceReadKind = 'boundary'): NamespaceEntry | undefined {
    const entry = this.lookupEntry(id);
    for (const observe of this.referenceObservers) observe(id, entry, kind);
    if (entry?.scopeId !== undefined && this.scopeAncestorStack.some(ancestor => ancestor.scopeId === entry.scopeId)) {
      const source = this.scopeAncestorStack.findLast(ancestor => ancestor.id !== undefined)?.id;
      const error = new RetikzCoreError({
        code: RetikzCoreErrorCode.Compile,
        message: `Geometry reference from a descendant of Scope '${source}' cannot target ancestor Scope '${id}'`,
        details: { sourceScopeId: source, targetId: id },
      });
      registerFatalProbeError(error);
      throw error;
    }
    return entry;
  }

  /** 按 inside-out 规则查找 id 对应的 layout 与生命周期状态 */
  private lookupEntry(id: string): NamespaceEntry | undefined {
    for (let i = this.frameStack.length - 1; i >= 0; i--) {
      const entry = this.frameStack[i].entryMap.get(id);
      if (entry !== undefined) return entry;
    }

    return undefined;
  }
}
