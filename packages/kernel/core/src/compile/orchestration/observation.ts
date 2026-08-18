import type {
  CompileObservation,
  CompileObservationContext,
  CompileObservationSite,
  CompileObserverDefinition,
  CompileObserverOutput,
  CompileObserverSession,
} from '../../contract';

import { defineCompileObserver } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

type RuntimeObserverEntry = Readonly<{
  definition: CompileObserverDefinition;
  session: CompileObserverSession;
}>;

/** 校验 observer factory 返回的 session 形状 */
const isCompileObserverSession = (value: unknown): value is CompileObserverSession => {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Readonly<{
    select?: unknown;
    observe?: unknown;
    complete?: unknown;
  }>;
  return (
    typeof candidate.select === 'function' &&
    typeof candidate.observe === 'function' &&
    typeof candidate.complete === 'function'
  );
};

/** 一次 observed compile 独占的 observer session 集合 */
export type CompileObservationRuntime = Readonly<{
  /** 本次 compile 是否存在 observer */
  hasObservers: boolean;
  /** 向当前 authored owner site 请求按需产物 */
  select: (site: CompileObservationSite) => ReadonlyArray<string>;
  /** 把最终 observation dispatch 到被 site 选中的 sessions */
  dispatch: (observation: CompileObservation, keys: ReadonlyArray<string>, context: CompileObservationContext) => void;
  /** 完成所有 session 并按 definition 顺序返回 outputs */
  complete: () => ReadonlyArray<CompileObserverOutput>;
}>;

/** 创建一次 observed compile 的 session，并在 traversal 前校验 observer key */
export const createCompileObservationRuntime = (
  definitions: ReadonlyArray<CompileObserverDefinition>,
): CompileObservationRuntime => {
  const seen = new Set<string>();
  const entries: Array<RuntimeObserverEntry> = definitions.map((definition, index) => {
    const normalized = defineCompileObserver(definition);
    if (seen.has(normalized.key)) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `observeCompileToScene: duplicate observer key '${normalized.key}' at index ${index}.`,
      );
    }
    seen.add(normalized.key);
    const session: unknown = normalized.createSession();
    if (!isCompileObserverSession(session)) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `observeCompileToScene: observer '${normalized.key}' created an invalid session.`,
      );
    }
    return { definition: normalized, session };
  });
  const byKey = new Map(entries.map(entry => [entry.definition.key, entry] as const));

  return {
    hasObservers: entries.length > 0,
    select: (site: CompileObservationSite): ReadonlyArray<string> => {
      const selected: Array<string> = [];
      for (const entry of entries) {
        const value = entry.session.select(Object.freeze({ owner: site.owner, sourcePath: site.sourcePath }));
        if (typeof value !== 'boolean') {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            `observeCompileToScene: observer '${entry.definition.key}' select() must return boolean.`,
          );
        }
        if (value) selected.push(entry.definition.key);
      }
      return selected;
    },
    dispatch: (
      observation: CompileObservation,
      keys: ReadonlyArray<string>,
      context: CompileObservationContext,
    ): void => {
      for (const key of keys) {
        const entry = byKey.get(key);
        if (entry === undefined)
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            `observeCompileToScene: unknown selected observer key '${key}'.`,
          );
        entry.session.observe(observation, context);
      }
    },
    complete: (): ReadonlyArray<CompileObserverOutput> =>
      Object.freeze(
        entries.map(entry =>
          Object.freeze({
            key: entry.definition.key,
            value: freezeObserverOutput(entry.session.complete()),
          }),
        ),
      ),
  };
};

/** observer output 只做 compile 生命周期内的递归冻结，不复制用户定义的 canonical value */
const freezeObserverOutput = <T>(value: T): T => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeObserverOutput(child);
  return Object.freeze(value);
};
