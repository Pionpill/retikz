import { describe, expect, it } from 'vitest';

import type { RuntimeProgramDefinitionInput } from '../../src/program';
import type { RuntimeSessionUpdate } from '../../src/transaction';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const defineOwner = () =>
  defineRuntimeOwner<number, number, number, never>({
    key: 'counter',
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime session malformed JavaScript input', () => {
  it('session options null/foreign registry 不泄漏原生错误', () => {
    const create = createRuntimeSession as (value: unknown) => unknown;

    expect(() => create(null)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_REGISTRY_MISMATCH', phase: 'session-create' }),
    );
    expect(() => create({ owners: {}, programs: {} })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_REGISTRY_MISMATCH', phase: 'session-create' }),
    );
  });

  it('update null/primitive 不泄漏 TypeError', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const update = session.update as (value: unknown) => unknown;

    expect(() => update(null)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_REVISION_INVALID', phase: 'update' }),
    );
    expect(() => update('invalid')).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_REVISION_INVALID', phase: 'update' }),
    );
  });

  it('拒绝 malformed full run result，并保留 Program context', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForProgram: (value: number) => value,
        read: (value: number) => value,
      },
      run: () => null,
    } as unknown as RuntimeProgramDefinitionInput<number, number, number, number>;
    const program = defineRuntimeProgram(input);
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_RUN_FAILED',
        phase: 'run',
        program: { owner: 'counter', key: 'program' },
        cause: null,
      }),
    );
  });

  it('run result 的恶意 getter throw 仍映射为稳定 Program error', () => {
    const getterCause = new Error('run kind getter failed');
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForProgram: (value: number) => value,
        read: (value: number) => value,
      },
      run: () =>
        Object.defineProperty({}, 'kind', {
          get: () => {
            throw getterCause;
          },
        }),
    } as unknown as RuntimeProgramDefinitionInput<number, number, number, number>;
    const program = defineRuntimeProgram(input);
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_RUN_FAILED',
        phase: 'run',
        cause: getterCause,
      }),
    );
  });

  it('update result 只读取一次 author 属性，后续 getter throw 不会逃逸', () => {
    const getterCause = new Error('update kind getter replayed');
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    let kindReads = 0;
    const input = {
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForProgram: (value: number) => value,
        read: (value: number) => value,
      },
      run: (view: Parameters<RuntimeProgramDefinitionInput<number, number, number, number>['run']>[0]) => ({
        kind: 'full',
        artifact: view.snapshot(owner).value,
      }),
      update: () =>
        Object.defineProperties(
          {},
          {
            kind: {
              get: () => {
                kindReads += 1;
                if (kindReads > 1) throw getterCause;
                return 'incremental';
              },
            },
            artifact: { value: 2 },
          },
        ),
    } as unknown as RuntimeProgramDefinitionInput<number, number, number, number>;
    const program = defineRuntimeProgram(input);
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toEqual(expect.objectContaining({ revision: 1, outcome: 'incremental' }));
    expect(kindReads).toBe(1);
    expect(session.revision()).toBe(1);
  });

  it.each([
    { name: 'unknown kind', result: { kind: 'unknown' } },
    { name: 'malformed fallback diagnostics', result: { kind: 'fallback', diagnostics: [null] } },
  ])('拒绝 $name update result，不把它误判为合法 fallback', testCase => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForProgram: (value: number) => value,
        read: (value: number) => value,
      },
      run: (view: Parameters<RuntimeProgramDefinitionInput<number, number, number, number>['run']>[0]) => ({
        kind: 'full',
        artifact: view.snapshot(owner).value,
      }),
      update: () => testCase.result,
    } as unknown as RuntimeProgramDefinitionInput<number, number, number, number>;
    const program = defineRuntimeProgram(input);
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_UPDATE_FAILED',
        phase: 'update',
        program: { owner: 'counter', key: 'program' },
        cause: testCase.result,
      }),
    );
    expect(session.revision()).toBe(0);
  });

  it('缺少 owners 的 update envelope 使用稳定 command error', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const malformed = { baseRevision: session.revision() } as unknown as RuntimeSessionUpdate;

    expect(() => session.update(malformed)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID', phase: 'update' }),
    );
  });

  it('拒绝 malformed context diagnostic，不提交不完整 warning', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForProgram: (value: number) => value,
        read: (value: number) => value,
      },
      run: view => ({
        kind: 'full',
        artifact: view.snapshot(owner).value,
      }),
      update: (_previous, _view, context) => {
        const diagnose = context.diagnose as (value: unknown) => void;
        diagnose({ code: 'BROKEN', phase: 'update' });
        return { kind: 'bailout' as const };
      },
    } satisfies RuntimeProgramDefinitionInput<number, number, number, number>;
    const program = defineRuntimeProgram(input);
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_UPDATE_FAILED',
        phase: 'update',
      }),
    );
    expect(session.diagnostics()).toEqual([]);
  });

  it('context diagnostic 只读取一次 author 属性', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    let codeReads = 0;
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: (view, context) => {
        const diagnostic = Object.defineProperties(
          {},
          {
            code: { get: () => (++codeReads === 1 ? 'PROGRAM_WARNING' : null), enumerable: true },
            phase: { value: 'run', enumerable: true },
            message: { value: 'warning', enumerable: true },
          },
        ) as Readonly<{ code: string; phase: string; message: string }>;
        context.diagnose(diagnostic);
        return { kind: 'full', artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(codeReads).toBe(1);
    expect(session.diagnostics()).toEqual([expect.objectContaining({ code: 'PROGRAM_WARNING', severity: 'warning' })]);
  });

  it('Program trace facade 不允许 callback drain reporter diagnostics', () => {
    const owner = defineOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [{ phase: 'update', unit: 'program', outcomes: ['full'] }],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: (view, context) => {
        context.trace.report({
          phase: 'update',
          unit: 'program',
          outcome: 'full',
          visited: 0,
          reused: 1,
          changed: 0,
        });
        const drain = Reflect.get(context.trace, 'diagnostics');
        if (typeof drain === 'function') Reflect.apply(drain, context.trace, []);
        return { kind: 'full', artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(session.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RUNTIME_TRACE_INVALID_RECORD', severity: 'error' }),
    ]);
  });
});
