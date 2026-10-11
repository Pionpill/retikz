import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeSourceLifecycleDiagnostic } from '../error';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeSourceRegistry } from '../registry';
import type { RuntimeRevision, RuntimeSourceExecutor, RuntimeSourceToken } from '../source';
import type { RuntimeSourceCommandExecutor, RuntimeUpdate } from '../transaction';
import { getRuntimeSourceCommandExecutor } from '../transaction';
import {
  createRuntimeContractError,
  isRuntimeExecutionDiagnostic,
  readRuntimeErrorDiagnostics,
  withRuntimeFailureDiagnostics,
} from './error';
import type { RuntimeSourceState, RuntimeSourceUpdateContext } from './state';
import type { RuntimeOptions } from './types';

/** 把 Source cleanup diagnostic 归一为 runtime diagnostic */
export const mapRuntimeSourceLifecycleDiagnostic = (diagnostic: RuntimeSourceLifecycleDiagnostic): RuntimeDiagnostic =>
  Object.freeze({
    ...diagnostic,
    severity: 'error',
  });

/** 校验 registry identity 并按 Source 顺序准备初始 values */
export const prepareRuntimeInitialSources = (
  sources: RuntimeSourceRegistry,
  initialSnapshots: RuntimeOptions['initialSnapshots'],
  executor: RuntimeSourceExecutor,
): Map<RuntimeSourceToken, RuntimeSourceState> => {
  const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();

  for (const command of initialSnapshots) {
    const commandExecutor = getRuntimeSourceCommandExecutor(command);
    if (sources.find(command.source.key) !== command.source || commands.has(command.source)) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.InitialSourceMismatch,
        'initial',
        command,
        command.source.key,
      );
    }

    commands.set(command.source, commandExecutor);
  }

  if (commands.size !== sources.definitions().length) {
    throw createRuntimeContractError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', initialSnapshots);
  }

  const states = new Map<RuntimeSourceToken, RuntimeSourceState>();

  try {
    for (const source of sources.definitions()) {
      const command = commands.get(source);
      if (command === undefined) {
        throw createRuntimeContractError(RetikzRuntimeErrorCode.InitialSourceMismatch, 'initial', source, source.key);
      }

      states.set(source, Object.freeze({ command, prepared: command.prepare(executor).value }));
    }
  } catch (cause) {
    const diagnostics = [...readRuntimeErrorDiagnostics(cause)];

    for (const source of [...sources.definitions()].reverse()) {
      const sourceState = states.get(source);
      if (sourceState === undefined) continue;

      diagnostics.push(
        ...sourceState.command
          .retire(executor, sourceState.prepared)
          .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
      );
    }

    throw withRuntimeFailureDiagnostics(cause, Object.freeze(diagnostics));
  }

  return states;
};

/** 校验更新命令的身份、Source 归属与唯一性，并收集对应执行器 */
export const collectRuntimeSourceCommands = (
  sourceCommands: RuntimeUpdate['sources'],
  sources: RuntimeSourceRegistry,
): Map<RuntimeSourceToken, RuntimeSourceCommandExecutor> => {
  const commands = new Map<RuntimeSourceToken, RuntimeSourceCommandExecutor>();

  for (const command of sourceCommands) {
    const executor = getRuntimeSourceCommandExecutor(command);
    if (sources.find(command.source.key) !== command.source) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.SourceCommandInvalid,
        'update',
        command,
        command.source.key,
      );
    }

    if (commands.has(command.source)) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.SourceCommandInvalid,
        'update',
        command,
        command.source.key,
      );
    }

    commands.set(command.source, executor);
  }
  return commands;
};

/** 断言所有变更提示均基于本次更新的原版本 */
export const assertRuntimeChangeSetRevisions = (
  commands: ReadonlyMap<RuntimeSourceToken, RuntimeSourceCommandExecutor>,
  baseRevision: RuntimeRevision,
): void => {
  for (const [source, executor] of commands) {
    if (executor.changeSetBaseRevision !== undefined && executor.changeSetBaseRevision !== baseRevision) {
      throw createRuntimeContractError(
        RetikzRuntimeErrorCode.ChangeSetRevisionMismatch,
        'change-set',
        executor.changeSetBaseRevision,
        source.key,
      );
    }
  }
};

/** 准备独立 Source 候选并比较实际变化，失败时回收已捕获候选 */
export const prepareRuntimeSourceCandidates = (
  sources: RuntimeSourceRegistry,
  sourceExecutor: RuntimeSourceExecutor,
  sourceStates: ReadonlyMap<RuntimeSourceToken, RuntimeSourceState>,
  commands: ReadonlyMap<RuntimeSourceToken, RuntimeSourceCommandExecutor>,
  context: RuntimeSourceUpdateContext,
): void => {
  /** compare 抛错时仍需回收刚捕获的候选；相等且已退役的项立即移除 */
  const preparedSourceCandidates = new Map<RuntimeSourceToken, RuntimeSourceState>();
  try {
    for (const source of sources.definitions()) {
      const command = commands.get(source);
      if (command === undefined) continue;

      const previous = sourceStates.get(source);
      if (previous === undefined) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.InternalInvariant,
          message: `runtime: missing source state "${source.key}"`,
          phase: 'source-update',
          cause: source,
        });
      }

      const candidate = command.prepare(sourceExecutor, previous.prepared).value;
      const candidateState = Object.freeze({ command, prepared: candidate });
      preparedSourceCandidates.set(source, candidateState);
      if (command.compare(sourceExecutor, previous.prepared, candidate).value) {
        context.candidateDiagnostics.push(
          ...command.retire(sourceExecutor, candidate).diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
        );
        preparedSourceCandidates.delete(source);
        continue;
      }

      if (command.changeSetBaseRevision !== undefined) context.changeSets.set(source, command);

      context.nextSourceStates.set(source, candidateState);
      context.changedSources.add(source);
    }
  } catch (cause) {
    const failedDiagnostics = [
      ...context.candidateDiagnostics.filter(isRuntimeExecutionDiagnostic),
      ...readRuntimeErrorDiagnostics(cause),
    ];

    for (const source of [...sources.definitions()].reverse()) {
      const candidate = preparedSourceCandidates.get(source);
      if (candidate === undefined) continue;

      failedDiagnostics.push(
        ...candidate.command
          .retire(sourceExecutor, candidate.prepared)
          .diagnostics.map(mapRuntimeSourceLifecycleDiagnostic),
      );
    }

    const frozenFailedDiagnostics = Object.freeze(failedDiagnostics);
    // 即使原始异常不能携带诊断，也由调用方把清理诊断写入 Runtime 队列
    context.candidateDiagnostics.splice(0, context.candidateDiagnostics.length, ...frozenFailedDiagnostics);
    throw withRuntimeFailureDiagnostics(cause, frozenFailedDiagnostics);
  }
};
