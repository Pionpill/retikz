import type { NodeLayout } from './node';

/** namespace 栈当前写入/解析阶段 */
export type NamespacePhase = 'registering' | 'resolving';

/** namespace layout 的编译生命周期状态 */
export type NamespaceEntryState = 'resolved' | 'scope-placeholder';

/** namespace 中带生命周期状态的内部条目 */
export type NamespaceEntry = {
  /** 可供既有引用解析逻辑消费的布局 */
  layout: NodeLayout;
  /** 区分合法已解析布局与尚未闭合的 Scope 占位布局 */
  state: NamespaceEntryState;
};

/** 同一 namespace frame 内重复 id 的诊断载荷 */
export type DuplicateRegisterInfo = {
  /** 同 frame 内重复出现的 id（两次 register 都用此 id） */
  id: string;
  /** 当前 frame 在栈中的深度（0 = 根 frame；每层 pushFrame 自增 1） */
  frameDepth: number;
  /** 先注册的那一条的 IR locator（jq-like 路径），register 时传入；缺失则 undefined */
  firstIrPath?: string;
  /** 后注册（本次触发覆盖）的那一条的 IR locator */
  secondIrPath?: string;
  /** 本次覆盖的 entry 是否来自创建 fork 时的同一 frame baseline */
  overwroteForkBaseline: boolean;
};

/** namespace 单次 register 的内部观测信息 */
export type NamespaceRegisterInfo = {
  /** 本次注册的 id */
  id: string;
  /** 当前 frame 深度 */
  frameDepth: number;
  /** register 调用方提供的 IR locator */
  irPath?: string;
  /** 是否覆盖同 frame 既有注册 */
  wasOverwritten: boolean;
};

/** NamespaceStack 构造选项 */
export type NamespaceStackOptions = {
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
  /** probe 中首次注册该 id 的诊断路径 */
  irPath?: string;
  /** probe 首次注册该 id 时是否已覆盖创建 fork 时的 baseline */
  overwroteBaseline: boolean;
  /** 创建 fork 时顶层 frame 的原始 entry，用于识别 replay 是否仍提交到同一 frame */
  baselineEntry?: NamespaceEntry;
};

/**
 * 栈式 namespace frame
 * @description register 写入栈顶，lookup 按 inside-out 查找；同 frame 重名 last-wins 并触发诊断
 */
export class NamespaceStack {
  /** 栈式 frame 容器；栈底（index 0）= 根 frame，栈顶（last）= 当前 frame */
  private readonly frames: Array<Map<string, NamespaceEntry>>;
  /** 与每个 frame 对应的"已注册 id → 首次 register 时的 irPath"映射，用于 duplicate warn 复述位置 */
  private readonly firstIrPaths: Array<Map<string, string | undefined>>;
  /** fork 创建时的 frame 快照，只用于区分 baseline collision 与 probe 内部 duplicate */
  private forkBaselineFrames?: Array<Map<string, NamespaceEntry>>;
  private readonly onDuplicate?: (info: DuplicateRegisterInfo) => void;
  private readonly onRegister?: (info: NamespaceRegisterInfo) => void;
  /** 当前阶段；registering 允许写入，resolving 只允许 lookup */
  private currentPhase: NamespacePhase = 'registering';

  constructor(options: NamespaceStackOptions = {}) {
    this.frames = [new Map()];
    this.firstIrPaths = [new Map()];
    this.onDuplicate = options.onDuplicate;
    this.onRegister = options.onRegister;
  }

  /**
   * 创建只读快照语义的独立分支
   * @description frame 容器会复制，既有 layout 只共享读取；后续 register / replace 不回写父栈
   */
  fork(options: NamespaceStackOptions = {}): NamespaceStack {
    const fork = new NamespaceStack(options);
    fork.frames.splice(0, fork.frames.length, ...this.frames.map(frame => new Map(frame)));
    fork.firstIrPaths.splice(0, fork.firstIrPaths.length, ...this.firstIrPaths.map(paths => new Map(paths)));
    fork.forkBaselineFrames = this.frames.map(frame => new Map(frame));
    fork.currentPhase = this.currentPhase;
    return fork;
  }

  /** 返回当前顶层 frame 相对 base 的新增或覆盖项 */
  diffTopFrame(base: NamespaceStack): Array<NamespaceFrameChange> {
    if (this.frames.length !== base.frames.length) {
      throw new Error('NamespaceStack.diffTopFrame: frame depth mismatch after isolated layout');
    }
    const frameIndex = this.frames.length - 1;
    const current = this.frames[frameIndex];
    const baseline = base.frames[frameIndex];
    const paths = this.firstIrPaths[frameIndex];
    const changes: Array<NamespaceFrameChange> = [];
    for (const [id, entry] of current) {
      if (baseline.get(id) === entry) continue;
      changes.push({
        id,
        entry,
        ...(paths.get(id) !== undefined ? { irPath: paths.get(id) } : {}),
        overwroteBaseline: baseline.has(id),
        ...(baseline.get(id) === undefined ? {} : { baselineEntry: baseline.get(id) }),
      });
    }
    return changes;
  }

  /**
   * 提交 fork 顶层 frame 的单项变更
   * @description 目标 frame 仍含原 baseline 时静默覆盖；进入其它 frame 时按当地顺序执行普通注册
   * @returns 是否提交到了创建 fork 时的原 baseline
   */
  commitForkChange(change: NamespaceFrameChange): boolean {
    if (this.currentPhase !== 'registering') {
      throw new Error(
        `NamespaceStack.commitForkChange('${change.id}'): only allowed during registering; current phase is '${this.currentPhase}'`,
      );
    }
    const topFrame = this.frames[this.frames.length - 1];
    if (change.overwroteBaseline && topFrame.get(change.id) === change.baselineEntry) {
      topFrame.set(change.id, change.entry);
      return true;
    }
    this.register(change.id, change.entry.layout, change.irPath, change.entry.state);
    return false;
  }

  /** 当前栈深（≥ 1；根 frame 永远存在） */
  get depth(): number {
    return this.frames.length;
  }

  /** 当前阶段 */
  get phase(): NamespacePhase {
    return this.currentPhase;
  }

  /** 推入新 frame；通常对应 `<Scope localNamespace>` 入场 */
  pushFrame(): void {
    this.frames.push(new Map());
    this.firstIrPaths.push(new Map());
    this.forkBaselineFrames?.push(new Map());
  }

  /** 弹出栈顶 frame；根 frame 不可弹出 */
  popFrame(): void {
    if (this.frames.length <= 1) {
      throw new Error('NamespaceStack.popFrame: cannot pop the root frame (internal invariant violated)');
    }
    this.frames.pop();
    this.firstIrPaths.pop();
    this.forkBaselineFrames?.pop();
  }

  /** 切换到 resolving 阶段；切换后 register / replaceLayout 一律抛 internal error */
  enterResolvingPhase(): void {
    this.currentPhase = 'resolving';
  }

  /** 切回 registering 阶段；用于 pending path 解析完成后继续处理上层 scope 子树 */
  exitResolvingPhase(): void {
    this.currentPhase = 'registering';
  }

  /** 注册 id 到栈顶 frame；返回是否覆盖了同 frame 旧值 */
  register(id: string, layout: NodeLayout, irPath?: string, state: NamespaceEntryState = 'resolved'): boolean {
    if (this.currentPhase !== 'registering') {
      throw new Error(
        `NamespaceStack.register('${id}'): only allowed during registering; current phase is '${this.currentPhase}'`,
      );
    }
    const topFrame = this.frames[this.frames.length - 1];
    const topFirstPaths = this.firstIrPaths[this.firstIrPaths.length - 1];
    const wasOverwritten = topFrame.has(id);
    if (wasOverwritten) {
      const baselineFrame = this.forkBaselineFrames?.[this.frames.length - 1];
      this.onDuplicate?.({
        id,
        frameDepth: this.frames.length - 1,
        firstIrPath: topFirstPaths.get(id),
        secondIrPath: irPath,
        overwroteForkBaseline: baselineFrame?.get(id) === topFrame.get(id),
      });
    } else {
      topFirstPaths.set(id, irPath);
    }
    topFrame.set(id, { layout, state });
    this.onRegister?.({
      id,
      frameDepth: this.frames.length - 1,
      ...(irPath === undefined ? {} : { irPath }),
      wasOverwritten,
    });
    return wasOverwritten;
  }

  /** 替换指定 frame 内已注册的 layout；用于 scope 占位升级，不触发重复 id 诊断 */
  replaceLayout(id: string, layout: NodeLayout, frameDepth: number, expectedCurrent?: NodeLayout): boolean {
    if (this.currentPhase !== 'registering') {
      throw new Error(
        `NamespaceStack.replaceLayout('${id}'): only allowed during registering; current phase is '${this.currentPhase}'`,
      );
    }
    if (frameDepth < 0 || frameDepth >= this.frames.length) {
      throw new Error(
        `NamespaceStack.replaceLayout('${id}'): frameDepth ${frameDepth} out of range (stack depth ${this.frames.length})`,
      );
    }
    const targetFrame = this.frames[frameDepth];
    if (!targetFrame.has(id)) {
      throw new Error(
        `NamespaceStack.replaceLayout('${id}'): id not previously registered in frame at depth ${frameDepth}`,
      );
    }
    const current = targetFrame.get(id);
    if (expectedCurrent !== undefined && current?.layout !== expectedCurrent) return false;
    targetFrame.set(id, { layout, state: 'resolved' });
    return true;
  }

  /** 按 inside-out 规则查找 id 对应的 layout */
  lookup(id: string): NodeLayout | undefined {
    return this.lookupEntry(id)?.layout;
  }

  /** 按 inside-out 规则查找 id 对应的 layout 与生命周期状态 */
  lookupEntry(id: string): NamespaceEntry | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const entry = this.frames[i].get(id);
      if (entry !== undefined) return entry;
    }
    return undefined;
  }
}
