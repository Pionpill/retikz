import type {
  AnyCompositeDefinition,
  CompileObserverDefinition,
  CompileObserverOutput,
  CompileOptions,
  CoreProgramOutput,
  IRScene,
} from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { compileToScene, observeCompileToScene } from '@retikz/core';
import { EMPTY_READONLY_LAYERS, validateReadonlyLayers } from '@retikz/render/runtime';

import type { VanillaAuthoringSite } from '../spec';

type VanillaCoreProgramOutput = CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>;

const EMPTY_OBSERVERS: ReadonlyArray<CompileObserverDefinition> = Object.freeze([]);
const EMPTY_OBSERVER_OUTPUTS: ReadonlyArray<CompileObserverOutput> = Object.freeze([]);
const EMPTY_DIAGNOSTICS: ReadonlyArray<never> = Object.freeze([]);

/** 编译驱动解析边界的结构化错误，retained host 可据此保留上一帧 */
export class VanillaCompileDriverError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VanillaCompileDriverError';
  }
}

/** 创建 Vanilla 编译驱动 session 时可读取的领域中立宿主输入 */
export type VanillaCompileDriverInput = Readonly<{
  /** 区分复用同一驱动对象的多个运行实例的稳定 identity */
  instance: object;
  /** 本次执行的 canonical Core IR */
  source: IRScene;
  /** normalizer 按 authored 顺序报告的运行时 sites */
  authoringSites: ReadonlyArray<VanillaAuthoringSite>;
  /** 普通 Core compile 与 retained Program 共用的固定配置 */
  coreOptions: CompileOptions;
}>;

/** 同 revision 的 Core primary、observer outputs、只读图层与扩展诊断 */
export type VanillaCompileOutput = Readonly<{
  /** Core 同次 compile 的 primary result */
  primary: VanillaCoreProgramOutput['result'];
  /** Core 同次 compile 的完整 observer outputs */
  observerOutputs: ReadonlyArray<CompileObserverOutput>;
  /** 在 primary 后执行的领域中立只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
  /** 驱动拥有并在成功提交后发布的诊断 */
  diagnostics: ReadonlyArray<unknown>;
}>;

/** 一次 source/authoring 配置独占的 Vanilla 编译驱动 session */
export type VanillaCompileDriverSession = Readonly<{
  /** 注入 retained Core Program 或 static observed compile 的 observers */
  observers: ReadonlyArray<CompileObserverDefinition>;
  /** 从同一 Core output 原子解析 primary、图层与扩展诊断 */
  resolve: (coreOutput: VanillaCoreProgramOutput) => VanillaCompileOutput;
  /** 整帧成功提交后的可选通知 */
  commit?: (output: VanillaCompileOutput) => void;
}>;

/** Vanilla 的领域中立可选编译驱动 */
export type VanillaCompileDriver = Readonly<{
  /** 根据当前 source、authored sites 与 Core options 创建隔离 session */
  create: (input: VanillaCompileDriverInput) => VanillaCompileDriverSession;
}>;

/** 保持同一驱动原始 session 在多次执行间具有稳定的规范化 identity */
const NORMALIZED_VANILLA_COMPILE_SESSIONS = new WeakMap<object, VanillaCompileDriverSession>();
const RESOLVED_VANILLA_COMPILE_OUTPUTS = new WeakMap<
  VanillaCompileDriverSession,
  WeakMap<VanillaCoreProgramOutput, VanillaCompileOutput>
>();

/** 校验并脱离驱动返回的 session */
export const createVanillaCompileDriverSession = (
  driver: VanillaCompileDriver,
  input: VanillaCompileDriverInput,
): VanillaCompileDriverSession => {
  try {
    const candidate: unknown = driver.create(input);
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error('Vanilla compile driver must return a session object');
    }
    const cached = NORMALIZED_VANILLA_COMPILE_SESSIONS.get(candidate);
    if (cached !== undefined) return cached;
    const session = candidate as VanillaCompileDriverSession;
    if (!Array.isArray(session.observers)) {
      throw new Error('Vanilla compile driver must return an observers array');
    }
    if (typeof session.resolve !== 'function') {
      throw new Error('Vanilla compile driver must provide resolve(coreOutput)');
    }
    if (session.commit !== undefined && typeof session.commit !== 'function') {
      throw new Error('Vanilla compile driver commit must be a function');
    }
    const normalized = Object.freeze({
      observers: Object.freeze([...session.observers]),
      resolve: session.resolve,
      ...(session.commit === undefined ? {} : { commit: session.commit }),
    });
    NORMALIZED_VANILLA_COMPILE_SESSIONS.set(candidate, normalized);
    return normalized;
  } catch (cause) {
    if (cause instanceof VanillaCompileDriverError) throw cause;
    throw new VanillaCompileDriverError('Vanilla compile driver session creation failed', { cause });
  }
};

/** 规范化并校验驱动对同 revision Core output 的解析结果 */
export const resolveVanillaCompileOutput = (
  session: VanillaCompileDriverSession,
  coreOutput: VanillaCoreProgramOutput,
): VanillaCompileOutput => {
  const cached = RESOLVED_VANILLA_COMPILE_OUTPUTS.get(session)?.get(coreOutput);
  if (cached !== undefined) return cached;
  try {
    const candidate: unknown = session.resolve(coreOutput);
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error('Vanilla compile driver output must be an object');
    }
    const output = candidate as VanillaCompileOutput;
    if (output.primary !== coreOutput.result || output.observerOutputs !== coreOutput.observerOutputs) {
      throw new Error('Vanilla compile driver must preserve the same-revision Core primary and observer outputs');
    }
    if (!Array.isArray(output.diagnostics)) throw new Error('Vanilla compile driver diagnostics must be an array');
    const normalized = Object.freeze({
      primary: output.primary,
      observerOutputs: output.observerOutputs,
      layers: validateReadonlyLayers(output.layers),
      diagnostics: Object.freeze([...output.diagnostics]),
    });
    let sessionOutputs = RESOLVED_VANILLA_COMPILE_OUTPUTS.get(session);
    if (sessionOutputs === undefined) {
      sessionOutputs = new WeakMap();
      RESOLVED_VANILLA_COMPILE_OUTPUTS.set(session, sessionOutputs);
    }
    sessionOutputs.set(coreOutput, normalized);
    return normalized;
  } catch (cause) {
    if (cause instanceof VanillaCompileDriverError) throw cause;
    throw new VanillaCompileDriverError('Vanilla compile driver resolve failed', { cause });
  }
};

/** 为 static/SSR 执行与 retained Program 同构的一次驱动编译 */
export const compileVanillaWithDriver = (
  input: VanillaCompileDriverInput,
  session: VanillaCompileDriverSession,
): VanillaCompileOutput => {
  const coreOutput: VanillaCoreProgramOutput =
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
  return resolveVanillaCompileOutput(session, coreOutput);
};

/** 在编译结果提交后隔离通知失败，避免回滚已经提交的宿主帧 */
export const commitVanillaCompileOutput = (
  session: VanillaCompileDriverSession,
  output: VanillaCompileOutput,
): void => {
  try {
    session.commit?.(output);
  } catch (cause) {
    if (process.env.NODE_ENV !== 'production') console.warn('[retikz] Vanilla compile driver commit failed', cause);
  }
};

const DEFAULT_VANILLA_COMPILE_SESSION: VanillaCompileDriverSession = Object.freeze({
  observers: EMPTY_OBSERVERS,
  resolve: coreOutput =>
    Object.freeze({
      primary: coreOutput.result,
      observerOutputs: coreOutput.observerOutputs,
      layers: EMPTY_READONLY_LAYERS,
      diagnostics: EMPTY_DIAGNOSTICS,
    }),
});

/** 缺省驱动：普通 Core compile、零 observers、零只读图层 */
export const defaultVanillaCompileDriver: VanillaCompileDriver = Object.freeze({
  create: () => DEFAULT_VANILLA_COMPILE_SESSION,
});
