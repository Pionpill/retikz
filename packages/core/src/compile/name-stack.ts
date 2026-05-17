import type { NodeLayout } from './node';

/**
 * 单条 duplicate warn 由 NameStack 通过 onDuplicate 回调向外发出的载荷
 * @description 由 compile 层把 NameStack 内部 frame depth + 前后两次 IR locator 翻译成 CompileWarning（含可读 message）；NameStack 不知道 CompileWarning 的具体形态，避免反向耦合
 */
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

/** NameStack 构造选项 */
export type NameStackOptions = {
  /**
   * 同 frame 重复 register 时的回调
   * @description 第 N 次 register（N ≥ 2）发一次；first register 不发；NameStack 不直接发 CompileWarning，由 compile 层翻译
   */
  onDuplicate?: (info: DuplicateRegisterInfo) => void;
};

/**
 * 栈式 namespace frame —— 默认全局扁平、`<Scope localNamespace>` 时 pushFrame 隔离
 * @description 内部维护 `Array<Map<string, NodeLayout>>`，栈底是根 frame；
 *   register 写入栈顶 frame；lookup 从栈顶向栈底 inside-out 搜索（内层 shadowing 外层）；
 *   同 frame 同 id 触发 onDuplicate + last-wins 覆盖（不抛错）；跨 frame 同 id 不算 duplicate；
 *   Pass 1 = register-only，Pass 2 = lookup-only，phase 状态守护违规调用
 */
export class NameStack {
  /** 栈式 frame 容器；栈底（index 0）= 根 frame，栈顶（last）= 当前 frame */
  private readonly frames: Array<Map<string, NodeLayout>>;
  /** 与每个 frame 对应的"已注册 id → 首次 register 时的 irPath"映射，用于 duplicate warn 复述位置 */
  private readonly firstIrPaths: Array<Map<string, string | undefined>>;
  private readonly onDuplicate?: (info: DuplicateRegisterInfo) => void;
  /** 当前阶段；compile Pass 1 = 'pass1'（register 合法），Pass 2 = 'pass2'（只能 lookup） */
  private currentPhase: 'pass1' | 'pass2' = 'pass1';

  constructor(options: NameStackOptions = {}) {
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

  /**
   * 弹出栈顶 frame；通常对应 `<Scope localNamespace>` 出场
   * @description 禁止把栈弹空（根 frame 必须始终存在）；意外调用抛 internal error 暴露 bug
   */
  popFrame(): void {
    if (this.frames.length <= 1) {
      throw new Error('NameStack.popFrame: cannot pop the root frame (internal invariant violated)');
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

  /**
   * 注册一条 id → NodeLayout 到栈顶 frame
   * @description 若栈顶 frame 已有同 id：触发 onDuplicate 回调（first register 不触发），用新 layout last-wins 覆盖；返回是否覆盖了已有 entry
   * @param id 要注册的 id（node.id / coordinate.id / scope.id）
   * @param layout 对应的 NodeLayout
   * @param irPath 触发此次 register 的 IR locator（jq-like 路径），用于 duplicate warn
   * @returns true = 当前 frame 已有同 id 被覆盖；false = 新 entry
   */
  register(id: string, layout: NodeLayout, irPath?: string): boolean {
    if (this.currentPhase !== 'pass1') {
      throw new Error(
        `NameStack.register('${id}'): only allowed during pass1; current phase is '${this.currentPhase}'`,
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

  /**
   * inside-out 查找 id 对应的 NodeLayout
   * @description 从栈顶向栈底依次查找；首个命中的 frame 返回；都没命中返回 undefined。内层可见外层（shadowing），外层不可见内层
   */
  lookup(id: string): NodeLayout | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const layout = this.frames[i].get(id);
      if (layout !== undefined) return layout;
    }
    return undefined;
  }
}
