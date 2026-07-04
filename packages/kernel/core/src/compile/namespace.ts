import type { NodeLayout } from './node';

/** 同一 namespace frame 内重复 id 的诊断载荷。 */
export type DuplicateRegisterInfo = {
  /** 同 frame 内重复出现的 id（两次 register 都用此 id） */
  id: string;
  /** 当前 frame 在栈中的深度（0 = 根 frame；每层 pushFrame 自增 1） */
  frameDepth: number;
  /** 先注册的那一条的 IR locator（jq-like 路径），register 时传入；缺失则 undefined */
  firstIrPath?: string;
  /** 后注册（本次触发覆盖）的那一条的 IR locator */
  secondIrPath?: string;
};

/** NamespaceStack 构造选项 */
export type NamespaceStackOptions = {
  /** 同 frame 重复 register 时的回调。 */
  onDuplicate?: (info: DuplicateRegisterInfo) => void;
};

/**
 * 栈式 namespace frame。
 * @description register 写入栈顶，lookup 按 inside-out 查找；同 frame 重名 last-wins 并触发诊断。
 */
export class NamespaceStack {
  /** 栈式 frame 容器；栈底（index 0）= 根 frame，栈顶（last）= 当前 frame */
  private readonly frames: Array<Map<string, NodeLayout>>;
  /** 与每个 frame 对应的"已注册 id → 首次 register 时的 irPath"映射，用于 duplicate warn 复述位置 */
  private readonly firstIrPaths: Array<Map<string, string | undefined>>;
  private readonly onDuplicate?: (info: DuplicateRegisterInfo) => void;
  /** 当前阶段；compile Pass 1 = 'pass1'（register 合法），Pass 2 = 'pass2'（只能 lookup） */
  private currentPhase: 'pass1' | 'pass2' = 'pass1';

  constructor(options: NamespaceStackOptions = {}) {
    this.frames = [new Map()];
    this.firstIrPaths = [new Map()];
    this.onDuplicate = options.onDuplicate;
  }

  /** 当前栈深（≥ 1；根 frame 永远存在） */
  get depth(): number {
    return this.frames.length;
  }

  /** 当前阶段（'pass1' / 'pass2'） */
  get phase(): 'pass1' | 'pass2' {
    return this.currentPhase;
  }

  /** 推入新 frame；通常对应 `<Scope localNamespace>` 入场 */
  pushFrame(): void {
    this.frames.push(new Map());
    this.firstIrPaths.push(new Map());
  }

  /** 弹出栈顶 frame；根 frame 不可弹出。 */
  popFrame(): void {
    if (this.frames.length <= 1) {
      throw new Error('NamespaceStack.popFrame: cannot pop the root frame (internal invariant violated)');
    }
    this.frames.pop();
    this.firstIrPaths.pop();
  }

  /** 切换到 Pass 2（lookup-only）阶段；切换后 register 调用一律抛 internal error */
  enterLookupPhase(): void {
    this.currentPhase = 'pass2';
  }

  /** 切回 Pass 1（register + lookup 均可）阶段；用于嵌套 path-resolve 完成后继续处理上层 scope 子树 */
  exitLookupPhase(): void {
    this.currentPhase = 'pass1';
  }

  /** 注册 id 到栈顶 frame；返回是否覆盖了同 frame 旧值。 */
  register(id: string, layout: NodeLayout, irPath?: string): boolean {
    if (this.currentPhase !== 'pass1') {
      throw new Error(
        `NamespaceStack.register('${id}'): only allowed during pass1; current phase is '${this.currentPhase}'`,
      );
    }
    const topFrame = this.frames[this.frames.length - 1];
    const topFirstPaths = this.firstIrPaths[this.firstIrPaths.length - 1];
    const wasOverwritten = topFrame.has(id);
    if (wasOverwritten) {
      this.onDuplicate?.({
        id,
        frameDepth: this.frames.length - 1,
        firstIrPath: topFirstPaths.get(id),
        secondIrPath: irPath,
      });
    } else {
      topFirstPaths.set(id, irPath);
    }
    topFrame.set(id, layout);
    return wasOverwritten;
  }

  /** 替换指定 frame 内已注册的 layout；用于 scope 占位升级，不触发重复 id 诊断。 */
  replaceLayout(id: string, layout: NodeLayout, frameDepth: number, expectedCurrent?: NodeLayout): boolean {
    if (this.currentPhase !== 'pass1') {
      throw new Error(
        `NamespaceStack.replaceLayout('${id}'): only allowed during pass1; current phase is '${this.currentPhase}'`,
      );
    }
    if (frameDepth < 0 || frameDepth >= this.frames.length) {
      throw new Error(
        `NamespaceStack.replaceLayout('${id}'): frameDepth ${frameDepth} out of range (stack depth ${this.frames.length})`,
      );
    }
    const targetFrame = this.frames[frameDepth];
    if (!targetFrame.has(id)) {
      throw new Error(`NamespaceStack.replaceLayout('${id}'): id not previously registered in frame at depth ${frameDepth}`);
    }
    if (expectedCurrent !== undefined && targetFrame.get(id) !== expectedCurrent) return false;
    targetFrame.set(id, layout);
    return true;
  }

  /** 按 inside-out 规则查找 id 对应的 layout。 */
  lookup(id: string): NodeLayout | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const layout = this.frames[i].get(id);
      if (layout !== undefined) return layout;
    }
    return undefined;
  }
}
