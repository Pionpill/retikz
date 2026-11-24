import { createCompositeInputBindings, fallbackMeasurer, resolveCoreProviderDependencies } from '@retikz/core';
import type { IRScene, TextMeasurer } from '@retikz/core';
import type {
  CompileOptions,
  CompileResult,
  FullSceneReconcilerOptions,
  IncrementalSceneReconcilerOptions,
  ReconcilerCommitTarget,
  ReconcilerResult,
  WeaveBatch,
} from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene, SceneNormalizationResult } from '../normalize';
import { isInputScene, normalizeScene } from '../normalize';
import { renderToSvg } from './svg-output';
import type { RenderToStringOptions } from './svg-output';

/** 部分浏览器只提供字宽，不提供实际字形上下边界 */
type BrowserTextMetrics = Pick<TextMetrics, 'width'> &
  Partial<Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent'>>;

/** 为本次编译提供惰性文字测量器；无法获取 Canvas 上下文时使用估算值 */
export const createDefaultTextMeasurer = (): TextMeasurer => {
  let context: CanvasRenderingContext2D | null | undefined;
  return (text, font) => {
    if (context === undefined) {
      try {
        context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
      } catch {
        context = null;
      }
    }
    if (context === null) return fallbackMeasurer(text, font);

    const body = document.querySelector('body');
    const family =
      font.family ??
      (typeof getComputedStyle === 'undefined' || body === null
        ? undefined
        : getComputedStyle(body).fontFamily.trim() || undefined) ??
      'sans-serif';
    context.font = `${font.style ?? 'normal'} ${font.weight ?? 'normal'} ${font.size}px ${family}`;
    const metrics: BrowserTextMetrics = context.measureText(text);
    const ascent = Math.max(0, metrics.actualBoundingBoxAscent ?? font.size * 0.8);
    const descent = Math.max(0, metrics.actualBoundingBoxDescent ?? font.size * 0.2);
    return { width: metrics.width, height: ascent + descent || font.size * 1.2, ascent, descent };
  };
};

/** 单图的编译与协调器配置 */
export type ProcessOptions = Readonly<{
  /** 编译选项 */
  compile?: CompileOptions;
  /** 协调器执行选项；提交目标由宿主接入 */
  reconciler?: Omit<FullSceneReconcilerOptions, 'target'> | Omit<IncrementalSceneReconcilerOptions, 'target'>;
}>;

/** 单场景的处理配置与可选宿主接线 */
type SceneRuntimeOptions = ProcessOptions & {
  /** 在首次提交时创建渲染目标，后续提交复用该目标 */
  readonly createTarget?: () => ReconcilerCommitTarget;
};

/** 只属于当前 IR 的嵌入定义来源及实例数据 */
export type SceneInputBindings = Pick<SceneNormalizationResult, 'contributions' | 'runtimeInputs'>;

/** 将作者贡献和实例输入绑定到本次归一化的 IR，不改变会话默认配置 */
export const bindInputCompileOptions = (
  ir: IRScene,
  bindings: SceneInputBindings | undefined,
  compileOptions: CompileOptions = {},
): CompileOptions => {
  if (!bindings) return compileOptions;
  const definitions = resolveCoreProviderDependencies({
    contributions: bindings.contributions,
    definitions: compileOptions,
  });
  const options = { ...compileOptions, ...definitions };
  if (bindings.runtimeInputs !== undefined) {
    options.compositeInputs = createCompositeInputBindings(ir, bindings.runtimeInputs);
  }
  return options;
};

/** 单场景会话：将输入交给协调器，并在渲染目标提交成功后发布结果 */
export class SceneRuntime {
  private readonly baseCompile: CompileOptions;
  private readonly listeners = new Set<(result: ReconcilerResult) => void>();
  private readonly failures: Array<unknown> = [];
  private readonly reconciler: SceneReconciler;
  /** 构造时随首次成功 mount 发布，之后只在底层提交成功后替换 */
  private committedResult!: ReconcilerResult;
  private disposed = false;

  /** 最后一次成功提交的结果 */
  get current(): ReconcilerResult {
    return this.committedResult;
  }

  /** 从已类型化的 Core IR 建立会话并提交首帧 */
  constructor(ir: IRScene, options: SceneRuntimeOptions & { bindings?: SceneInputBindings } = {}) {
    this.baseCompile = options.compile ?? {};
    this.reconciler = new SceneReconciler(undefined, {
      ...options.reconciler,
      captureProvenance: options.createTarget !== undefined || options.reconciler?.captureProvenance,
      target: this.createCommitTarget(options.createTarget),
    });
    try {
      this.compileIR(ir, bindInputCompileOptions(ir, options.bindings, this.baseCompile));
    } catch (cause) {
      this.reconciler.dispose();
      throw cause;
    }
  }

  /** 从单图作者声明及其嵌入贡献建立会话 */
  static fromInput(input: InputScene, options: SceneRuntimeOptions = {}) {
    const normalized = normalizeScene(input);
    return new SceneRuntime(normalized.ir, { ...options, bindings: normalized });
  }

  /** 导出最后一次成功提交的场景，不重新编译或发送通知 */
  renderToSvg(options?: RenderToStringOptions) {
    return renderToSvg(this.current.compilation.result.scene, options);
  }

  /** 订阅后续成功提交 */
  subscribe(listener: (result: ReconcilerResult) => void) {
    this.assertActive();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 原子替换完整 IR；省略配置时使用会话基础配置，显式配置仅对本次替换生效 */
  replace(ir: IRScene, compile: CompileOptions = this.baseCompile) {
    this.compileIR(ir, compile);
  }

  /** 归一化作者输入并完整替换；本次绑定不影响后续 IR 或作者输入 */
  replaceInput(input: InputScene, compile: CompileOptions = this.baseCompile) {
    this.assertActive();
    let normalized: SceneNormalizationResult;
    try {
      normalized = normalizeScene(input);
      compile = bindInputCompileOptions(normalized.ir, normalized, compile);
    } catch (cause) {
      this.failures.push(cause);
      throw cause;
    }
    this.replace(normalized.ir, compile);
  }

  /** 使用已编译结果刷新提交目标并发布新版本，不重新编译场景 */
  updateTarget() {
    this.publish(() => this.reconciler.updateTarget());
  }

  /** 读取指定版本的 scope 地址 */
  getScopeId(path: ReadonlyArray<number>, expected: ReconcilerResult) {
    this.assertActive();
    return this.reconciler.getScopeId(path, expected);
  }

  /** 将变更批次应用到指定的已提交版本 */
  update(batch: WeaveBatch, expected?: ReconcilerResult) {
    this.publish(() => this.reconciler.update(batch, expected));
  }

  /** 读取并清空本会话的诊断 */
  diagnostics(): ReadonlyArray<unknown> {
    const diagnostics = this.reconciler.diagnostics();
    if (this.failures.length === 0) return diagnostics;
    const failures = this.failures.splice(0);
    for (const diagnostic of diagnostics) failures.push(diagnostic);
    return failures;
  }

  /** 释放会话并禁止后续写入 */
  dispose() {
    this.reconciler.dispose();
    this.disposed = true;
    this.listeners.clear();
  }

  /** 将本次输入交给同一个协调器：首帧挂载，后续完整替换 */
  private compileIR(ir: IRScene, compileOptions: CompileOptions) {
    const options =
      compileOptions.measureText === undefined
        ? { ...compileOptions, measureText: createDefaultTextMeasurer() }
        : compileOptions;
    this.publish(() => this.reconciler.replace(ir, options));
  }

  /** 首次提交时接入宿主目标；实际提交与回滚由目标执行 */
  private createCommitTarget(createTarget?: () => ReconcilerCommitTarget): ReconcilerCommitTarget {
    let target: ReconcilerCommitTarget | undefined;
    return {
      prepare: (candidate, previous) => {
        this.assertActive();
        target ??= createTarget?.();
        this.assertActive();
        const token = target?.prepare(candidate, previous);
        return {
          commit: () => {
            this.assertActive();
            token?.commit();
            this.assertActive();
          },
          rollback: () => token?.rollback(),
          dispose: () => token?.dispose(),
        };
      },
      dispose: () => target?.dispose?.(),
    };
  }

  /** 只发布协调器实际提交的新结果 */
  private publish(commit: () => ReconcilerResult) {
    this.assertActive();
    let committed: ReconcilerResult;
    try {
      committed = commit();
    } catch (cause) {
      this.failures.push(cause);
      throw cause;
    }
    if (committed === this.committedResult) return;
    this.committedResult = committed;
    for (const listener of this.listeners) {
      try {
        listener(committed);
      } catch (cause) {
        this.failures.push(cause);
      }
    }
  }

  private assertActive() {
    if (this.disposed)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing controller is disposed');
  }
}

/** 同步编译作者输入或 IR，返回 Scene 与 artifacts */
export const compileToScene = (source: InputScene | IRScene, options: ProcessOptions = {}): CompileResult => {
  const runtime = isInputScene(source) ? SceneRuntime.fromInput(source, options) : new SceneRuntime(source, options);
  try {
    return runtime.current.compilation.result;
  } finally {
    runtime.dispose();
  }
};
