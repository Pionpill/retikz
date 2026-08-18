import type {
  RuntimeCommitParticipant,
  RuntimeCommitParticipantDefinitionInput,
  RuntimeCommitParticipantExecutor,
  RuntimeCommitParticipantToken,
} from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import { createRuntimeTraceReporter } from '../trace';

const runtimeCommitParticipants = new WeakSet<object>();
const participantExecutors = new WeakMap<object, RuntimeCommitParticipantExecutor>();
const participantOwnership = new WeakMap<object, 'unowned' | 'owned' | 'consumed'>();

/** 创建 participant definition 输入错误 */
const invalidParticipant = (cause: unknown) =>
  new RetikzRuntimeError({
    code: RetikzRuntimeErrorCode.ParticipantTokenInvalid,
    phase: 'participant-definition',
    cause,
  });

/** 定义 nominal Runtime commit participant */
export const defineRuntimeCommitParticipant = <TRead>(
  input: RuntimeCommitParticipantDefinitionInput<TRead>,
): RuntimeCommitParticipant<TRead> => {
  const candidate: unknown = input;
  if (typeof candidate !== 'object' || candidate === null) throw invalidParticipant(input);
  const keyCandidate: unknown = Reflect.get(candidate, 'key');
  const owners: unknown = Reflect.get(candidate, 'owners');
  const programs: unknown = Reflect.get(candidate, 'programs');
  const revisionPolicy: unknown = Reflect.get(candidate, 'revisionPolicy');
  const tracePhasesCandidate: unknown = Reflect.get(candidate, 'tracePhases');
  const prepare: unknown = Reflect.get(candidate, 'prepare');
  const read: unknown = Reflect.get(candidate, 'read');
  const dispose: unknown = Reflect.get(candidate, 'dispose');
  if (
    typeof keyCandidate !== 'string' ||
    keyCandidate.length === 0 ||
    !Array.isArray(owners) ||
    !Array.isArray(programs) ||
    (revisionPolicy !== 'affected' && revisionPolicy !== 'continuous') ||
    !Array.isArray(tracePhasesCandidate) ||
    typeof prepare !== 'function' ||
    typeof read !== 'function' ||
    typeof dispose !== 'function'
  ) {
    throw invalidParticipant(input);
  }
  const key = input.key;
  const tracePhases = input.tracePhases;
  try {
    createRuntimeTraceReporter({ owner: key, phases: tracePhases, sink: () => undefined });
  } catch (cause) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
      phase: 'participant-definition',
      cause,
    });
  }
  const copiedTracePhases = Object.freeze(
    tracePhases.map(({ phase, unit, outcomes }) =>
      Object.freeze({ phase, unit, outcomes: Object.freeze([...outcomes]) }),
    ),
  );
  const token = Object.freeze({
    key,
    owners: Object.freeze([...owners]),
    programs: Object.freeze([...programs]),
    revisionPolicy,
    tracePhases: copiedTracePhases,
  }) as RuntimeCommitParticipant<TRead>;
  participantExecutors.set(token, Object.freeze({ prepare, read, dispose }) as RuntimeCommitParticipantExecutor);
  participantOwnership.set(token, 'unowned');
  runtimeCommitParticipants.add(token);
  return token;
};

/** 判断动态值是否是当前 Runtime 实例创建的 participant token */
export const isRuntimeCommitParticipant = (value: unknown): value is RuntimeCommitParticipantToken =>
  typeof value === 'object' && value !== null && runtimeCommitParticipants.has(value);

/** 读取 nominal participant 的私有 executor */
export const getRuntimeCommitParticipantExecutor = (
  participant: RuntimeCommitParticipantToken,
): RuntimeCommitParticipantExecutor | undefined => participantExecutors.get(participant);

/** 对完整 participant 集合执行 all-or-nothing ownership claim */
export const claimRuntimeCommitParticipants = (
  participants: ReadonlyArray<RuntimeCommitParticipantToken>,
): RuntimeCommitParticipantToken | undefined => {
  const unavailable = participants.find(participant => participantOwnership.get(participant) !== 'unowned');
  if (unavailable !== undefined) return unavailable;
  for (const participant of participants) participantOwnership.set(participant, 'owned');
  return undefined;
};

/** 把已接管 participant 永久标记为 consumed */
export const consumeRuntimeCommitParticipant = (participant: RuntimeCommitParticipantToken): void => {
  participantOwnership.set(participant, 'consumed');
};
