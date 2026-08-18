import { describe, expect, it } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram, RuntimeProgramKind } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

describe('runtime session rollback', () => {
  it('initial owner prepare 失败时反向释放此前已捕获 value', () => {
    const retired: Array<string> = [];
    const first = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`a:${value.value}`),
      },
    });
    const second = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'b',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`b:${value.value}`),
      },
    });
    const cause = new Error('capture failed');
    const third = defineRuntimeOwner<number, number, number, never>({
      key: 'c',
      value: {
        capture: () => {
          throw cause;
        },
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [third, second, first] });
    const programs = createRuntimeProgramRegistry({ owners });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [
          createRuntimeOwnerInput(first, 1),
          createRuntimeOwnerInput(second, 2),
          createRuntimeOwnerInput(third, 3),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.CaptureFailed, cause }));
    expect(retired).toEqual(['b:2', 'a:1']);
  });

  it('owner update prepare 失败时回滚此前 candidate，current 保持不变', () => {
    const retired: Array<string> = [];
    const first = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`a:${value.value}`),
      },
    });
    const cause = new Error('capture failed');
    const second = defineRuntimeOwner<number, number, number, never>({
      key: 'b',
      value: {
        capture: value => {
          if (value === 2) throw cause;
          return value;
        },
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [second, first] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(first, 1), createRuntimeOwnerInput(second, 1)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(first, 2), createRuntimeOwnerUpdate(second, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.CaptureFailed, cause }));
    expect(retired).toEqual(['a:2']);
    expect(session.revision()).toBe(0);
    expect(session.snapshot(first)).toEqual({ revision: 0, value: 1 });
    expect(session.snapshot(second)).toEqual({ revision: 0, value: 1 });
  });

  it('Program prepare 失败时先反向释放 artifact，再反向释放 owner candidates', () => {
    const retired: Array<string> = [];
    const firstOwner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:a:${value.value}`),
      },
    });
    const secondOwner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'b',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:b:${value.value}`),
      },
    });
    const thirdOwner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'c',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:c:${value.value}`),
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [thirdOwner, secondOwner, firstOwner] });
    const firstProgram = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'a', key: 'program' },
      owners: [firstOwner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => ({ value }),
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: value => retired.push(`artifact:a:${value.value}`),
      },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(firstOwner).value }),
      update: (_previous, view) => ({
        kind: RuntimeProgramKind.Incremental,
        artifact: view.snapshot(firstOwner).value,
      }),
    });
    const secondProgram = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'b', key: 'program' },
      owners: [secondOwner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => ({ value }),
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: value => retired.push(`artifact:b:${value.value}`),
      },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(secondOwner).value }),
      update: (_previous, view) => ({
        kind: RuntimeProgramKind.Incremental,
        artifact: view.snapshot(secondOwner).value,
      }),
    });
    const cause = new Error('downstream failed');
    const downstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'c', key: 'program' },
      owners: [thirdOwner],
      programs: [firstProgram, secondProgram],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(thirdOwner).value }),
      update: () => {
        throw cause;
      },
    });
    const programs = createRuntimeProgramRegistry({
      owners,
      builtins: [downstream, secondProgram, firstProgram],
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [
        createRuntimeOwnerInput(firstOwner, 1),
        createRuntimeOwnerInput(secondOwner, 1),
        createRuntimeOwnerInput(thirdOwner, 1),
      ],
    });
    retired.length = 0;

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [
          createRuntimeOwnerUpdate(firstOwner, 2),
          createRuntimeOwnerUpdate(secondOwner, 2),
          createRuntimeOwnerUpdate(thirdOwner, 2),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ProgramUpdateFailed, cause }));
    expect(retired).toEqual(['artifact:b:2', 'artifact:a:2', 'owner:c:2', 'owner:b:2', 'owner:a:2']);
    expect(session.revision()).toBe(0);
    expect(session.snapshot(firstOwner)).toEqual({ revision: 0, value: 1 });
    expect(session.snapshot(secondOwner)).toEqual({ revision: 0, value: 1 });
    expect(session.snapshot(thirdOwner)).toEqual({ revision: 0, value: 1 });
    expect(session.artifact(firstProgram)).toEqual({ revision: 0, value: 1 });
    expect(session.artifact(secondProgram)).toEqual({ revision: 0, value: 1 });
    expect(session.artifact(downstream)).toEqual({ revision: 0, value: 1 });
  });
});
