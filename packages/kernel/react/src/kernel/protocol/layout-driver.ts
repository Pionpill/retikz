import type {
  AnyCompositeDefinition,
  CompileObserverDefinition,
  CompileObserverOutput,
  CoreProgramOptions,
  CoreProgramOutput,
  IRScene,
} from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { compileToScene, observeCompileToScene } from '@retikz/core';
import { EMPTY_READONLY_LAYERS, validateReadonlyLayers } from '@retikz/render/runtime';

import type { LayoutAuthoringSite } from './authoring-site';

type LayoutCoreProgramOutput = CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>;

const EMPTY_OBSERVERS: ReadonlyArray<CompileObserverDefinition> = Object.freeze([]);
const EMPTY_OBSERVER_OUTPUTS: ReadonlyArray<CompileObserverOutput> = Object.freeze([]);
const EMPTY_DIAGNOSTICS: ReadonlyArray<never> = Object.freeze([]);

/** driver create/resolve 边界的结构化错误，用于 retained host 区分已回滚的扩展失败 */
export class LayoutCompileDriverError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LayoutCompileDriverError';
  }
}

/** 创建 compile driver session 时可读取的领域中立宿主输入 */
export type LayoutCompileDriverInput = Readonly<{
  /** 区分复用同一 driver object 的多个 Layout 实例的稳定 identity */
  instance: object;
  /** 本次 Layout 的 canonical Core IR */
  source: IRScene;
  /** builder 按 authored 顺序报告的 runtime-only sites */
  authoringSites: ReadonlyArray<LayoutAuthoringSite>;
  /** 普通 Core compile 与 retained Program 共用的固定配置 */
  coreOptions: CoreProgramOptions;
}>;

/** 同 revision 的 Core primary、observer outputs、只读 layers 与扩展诊断 */
export type LayoutCompileOutput = Readonly<{
  /** Core 同次 compile 的 primary result */
  primary: LayoutCoreProgramOutput['result'];
  /** Core 同次 compile 的完整 observer outputs */
  observerOutputs: ReadonlyArray<CompileObserverOutput>;
  /** 在 primary 后执行的领域中立只读 layers */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** driver 拥有并在成功 commit 后发布的诊断 */
  diagnostics: ReadonlyArray<unknown>;
}>;

/** 一次 source/authoring 配置独占的 compile driver session */
export type LayoutCompileDriverSession = Readonly<{
  /** 注入 retained Core Program 或 static observed compile 的 observers */
  observers: ReadonlyArray<CompileObserverDefinition>;
  /** 从同一 Core output 原子解析 primary、layers 与扩展诊断 */
  resolve: (coreOutput: LayoutCoreProgramOutput) => LayoutCompileOutput;
  /** 整帧成功提交后的可选通知 */
  commit?: (output: LayoutCompileOutput) => void;
}>;

/** React Layout 的领域中立可选编译驱动 */
export type LayoutCompileDriver = Readonly<{
  /** 根据当前 source、authored sites 与 Core options 创建隔离 session */
  create: (input: LayoutCompileDriverInput) => LayoutCompileDriverSession;
}>;

/** 保持同一 driver 原始 session 在多次 React render 间具有稳定的规范化 identity */
const NORMALIZED_LAYOUT_COMPILE_SESSIONS = new WeakMap<object, LayoutCompileDriverSession>();

/** 校验 driver session，避免无效扩展推迟到 renderer prepare */
export const createLayoutCompileDriverSession = (
  driver: LayoutCompileDriver,
  input: LayoutCompileDriverInput,
): LayoutCompileDriverSession => {
  const candidate: unknown = driver.create(input);
  if (typeof candidate !== 'object' || candidate === null) {
    throw new Error('Layout compile driver must return a session object');
  }
  const cached = NORMALIZED_LAYOUT_COMPILE_SESSIONS.get(candidate);
  if (cached !== undefined) return cached;
  const session = candidate as LayoutCompileDriverSession;
  if (!Array.isArray(session.observers)) {
    throw new Error('Layout compile driver must return an observers array');
  }
  if (typeof session.resolve !== 'function') throw new Error('Layout compile driver must provide resolve(coreOutput)');
  if (session.commit !== undefined && typeof session.commit !== 'function') {
    throw new Error('Layout compile driver commit must be a function');
  }
  const normalized = Object.freeze({
    observers: Object.freeze([...session.observers]),
    resolve: session.resolve,
    ...(session.commit === undefined ? {} : { commit: session.commit }),
  });
  NORMALIZED_LAYOUT_COMPILE_SESSIONS.set(candidate, normalized);
  return normalized;
};

/** 规范化并校验 driver 对同 revision Core output 的解析结果 */
export const resolveLayoutCompileOutput = (
  session: LayoutCompileDriverSession,
  coreOutput: LayoutCoreProgramOutput,
): LayoutCompileOutput => {
  try {
    const candidate: unknown = session.resolve(coreOutput);
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error('Layout compile driver output must be an object');
    }
    const output = candidate as LayoutCompileOutput;
    if (output.primary !== coreOutput.result || output.observerOutputs !== coreOutput.observerOutputs) {
      throw new Error('Layout compile driver must preserve the same-revision Core primary and observer outputs');
    }
    if (!Array.isArray(output.diagnostics)) throw new Error('Layout compile driver diagnostics must be an array');
    return Object.freeze({
      primary: output.primary,
      observerOutputs: output.observerOutputs,
      layers: validateReadonlyLayers(output.layers),
      diagnostics: Object.freeze([...output.diagnostics]),
    });
  } catch (cause) {
    if (cause instanceof LayoutCompileDriverError) throw cause;
    throw new LayoutCompileDriverError('Layout compile driver resolve failed', { cause });
  }
};

/** 为 static/SSR 执行与 retained Program 同构的一次 driver compile */
export const compileLayoutWithDriver = (
  input: LayoutCompileDriverInput,
  session: LayoutCompileDriverSession,
): LayoutCompileOutput => {
  const coreOutput: LayoutCoreProgramOutput =
    session.observers.length === 0
      ? Object.freeze({
          result: compileToScene(input.source, input.coreOptions),
          diagnostics: EMPTY_DIAGNOSTICS,
          observerOutputs: EMPTY_OBSERVER_OUTPUTS,
        })
      : (() => {
          const observed = observeCompileToScene(input.source, input.coreOptions, session.observers);
          return Object.freeze({
            result: observed.primary,
            diagnostics: EMPTY_DIAGNOSTICS,
            observerOutputs: observed.observerOutputs,
          });
        })();
  return resolveLayoutCompileOutput(session, coreOutput);
};

const DEFAULT_LAYOUT_COMPILE_SESSION: LayoutCompileDriverSession = Object.freeze({
  observers: EMPTY_OBSERVERS,
  resolve: coreOutput =>
    Object.freeze({
      primary: coreOutput.result,
      observerOutputs: coreOutput.observerOutputs,
      layers: EMPTY_READONLY_LAYERS,
      diagnostics: EMPTY_DIAGNOSTICS,
    }),
});

/** 缺省 driver：普通 Core compile、零 observers、零 readonly layers */
export const defaultLayoutCompileDriver: LayoutCompileDriver = Object.freeze({
  create: () => DEFAULT_LAYOUT_COMPILE_SESSION,
});
