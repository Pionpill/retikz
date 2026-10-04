import { describe, expect, it } from 'vitest';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeOwner,
  defineRuntimeProgram,
  RetikzRuntimeErrorCode,
} from '../../src';

const counter = defineRuntimeOwner<number, number, number, never>({
  key: 'counter',
  value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
});
const owners = createRuntimeOwnerRegistry({ builtins: [counter] });

describe('Program artifact defaults', () => {
  it('省略配置后发布完整结果，并向增量更新和 observer 提供数值', () => {
    const observed: Array<number> = [];
    const program = defineRuntimeProgram({
      id: { owner: 'counter', key: 'default' },
      owners: [counter],
      run: view => ({ kind: 'full', artifact: view.snapshot(counter).value * 2 }),
      update: (previous, view) => ({ kind: 'incremental', artifact: previous + view.snapshot(counter).value }),
      observeCommit: event => observed.push(event.artifact.value),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({ owners, programs, initialSnapshots: [createRuntimeOwnerInput(counter, 1)] });
    try {
      expect(session.artifact(program).value.toFixed()).toBe('2');
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(counter, 3)] });
      expect(session.artifact(program)).toEqual({ revision: 1, value: 5 });
      expect(observed).toEqual([2, 5]);
    } finally {
      session.dispose();
    }
  });

  it('独立应用 capture、private read 和 public read，省略的 read 始终读取内部 artifact', () => {
    const captured = defineRuntimeProgram<number, string>({
      id: { owner: 'counter', key: 'captured' },
      owners: [counter],
      artifact: { capture: value => `value:${value}` },
      run: view => ({ kind: 'full', artifact: view.snapshot(counter).value }),
    });
    const privateRead = defineRuntimeProgram<number, number, string>({
      id: { owner: 'counter', key: 'private' },
      owners: [counter],
      artifact: { readForProgram: value => String(value) },
      run: view => ({ kind: 'full', artifact: view.snapshot(counter).value }),
      update: previous => ({ kind: 'incremental', artifact: Number(previous) + 10 }),
    });
    const publicRead = defineRuntimeProgram<number, number, number, string>({
      id: { owner: 'counter', key: 'public' },
      owners: [counter],
      artifact: { read: value => `public:${value}` },
      run: view => ({ kind: 'full', artifact: view.snapshot(counter).value }),
      update: previous => ({ kind: 'incremental', artifact: previous + 20 }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [captured, privateRead, publicRead] });
    const session = createRuntimeSession({ owners, programs, initialSnapshots: [createRuntimeOwnerInput(counter, 1)] });
    try {
      expect(session.artifact(captured).value).toBe('value:1');
      expect(session.artifact(privateRead).value.toFixed()).toBe('1');
      expect(session.artifact(publicRead).value).toBe('public:1');
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(counter, 2)] });
      expect(session.artifact(captured).value).toBe('value:2');
      expect(session.artifact(privateRead).value).toBe(11);
      expect(session.artifact(publicRead).value).toBe('public:21');
    } finally {
      session.dispose();
    }
  });

  it('默认转换不复制或冻结引用，允许复用无 dispose 的不可变 artifact', () => {
    const value = { count: 1 };
    const program = defineRuntimeProgram({
      id: { owner: 'counter', key: 'reference' },
      owners: [counter],
      artifact: {},
      run: () => ({ kind: 'full', artifact: value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({ owners, programs, initialSnapshots: [createRuntimeOwnerInput(counter, 1)] });
    try {
      expect(session.artifact(program).value).toBe(value);
      expect(Object.isFrozen(value)).toBe(false);
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(counter, 2)] });
      expect(session.artifact(program).value).toBe(value);
    } finally {
      session.dispose();
    }
  });

  it('仅提供 dispose 时仍拒绝 current alias，并在替换和退出时释放资源', () => {
    const first = { count: 1 };
    const second = { count: 2 };
    let candidate = first;
    const disposed: Array<{ count: number }> = [];
    const program = defineRuntimeProgram<{ count: number }>({
      id: { owner: 'counter', key: 'resource' },
      owners: [counter],
      artifact: { dispose: value => disposed.push(value) },
      run: () => ({ kind: 'full', artifact: candidate }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({ owners, programs, initialSnapshots: [createRuntimeOwnerInput(counter, 1)] });
    try {
      expect(() =>
        session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(counter, 2)] }),
      ).toThrow(expect.objectContaining({ code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias }));
      expect(session.artifact(program)).toEqual({ revision: 0, value: first });
      expect(disposed).toEqual([]);
      candidate = second;
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(counter, 2)] });
      expect(disposed).toEqual([first]);
      expect(session.artifact(program).value).toBe(second);
    } finally {
      session.dispose();
    }
    expect(disposed).toEqual([first, second]);
  });
});
