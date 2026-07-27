import { describe, expect, it, vi } from 'vitest';

import type { RuntimeChangeSet, RuntimeOwnerDefinition, RuntimeOwnerToken } from '../../src';

import { createRuntimeIdentity, createRuntimeOwnerRegistry, defineRuntimeOwner, RuntimeOwnerError } from '../../src';
import { createRuntimeOwnerExecutor } from '../../src/owner/executor';

type Input = Readonly<{ values: Array<number> }>;
type Value = Readonly<{ values: ReadonlyArray<number>; handle: Readonly<{ dispose: () => void }> }>;

const defineFixtureOwner = (
  overrides: Partial<Parameters<typeof defineRuntimeOwner<Input, Value, ReadonlyArray<number>, string>>[0]['value']> &
    Pick<
      Parameters<typeof defineRuntimeOwner<Input, Value, ReadonlyArray<number>, string>>[0],
      'collectIdentities'
    > = {},
): RuntimeOwnerDefinition<Input, Value, ReadonlyArray<number>, string> =>
  defineRuntimeOwner({
    key: 'fixture',
    value: {
      capture: input =>
        Object.freeze({ values: Object.freeze([...input.values]), handle: Object.freeze({ dispose: vi.fn() }) }),
      read: value => Object.freeze([...value.values]),
      equals: (left, right) => left.values.join(',') === right.values.join(','),
      dispose: value => value.handle.dispose(),
      ...overrides,
    },
    collectIdentities: overrides.collectIdentities,
  });

const createExecutor = (...definitions: Array<RuntimeOwnerToken>) =>
  createRuntimeOwnerExecutor(createRuntimeOwnerRegistry({ custom: definitions }));

describe('runtime owner executor', () => {
  it('prepare 隔离 mutable input/read alias 并建立 identity index', () => {
    const input = { values: [1, 2] };
    const definition = defineFixtureOwner({
      collectIdentities: value => value.values.map(item => createRuntimeIdentity('fixture', [item.toString()])),
    });
    const executor = createExecutor(definition);
    const prepared = executor.prepare(definition, input).value;
    input.values.push(3);

    expect(prepared.read).toEqual([1, 2]);
    expect(Object.isFrozen(prepared.read)).toBe(true);
    expect(prepared.identities?.values().map(identity => identity.path)).toEqual([['1'], ['2']]);
  });

  it('没有 collector 时不自动建立 identity index', () => {
    const definition = defineFixtureOwner();
    const prepared = createExecutor(definition).prepare(definition, { values: [] }).value;
    expect(prepared.identities).toBeUndefined();
  });

  it.each([
    {
      name: 'owner mismatch',
      collectIdentities: () => [createRuntimeIdentity('other', ['a'])],
    },
    {
      name: 'duplicate',
      collectIdentities: () => [createRuntimeIdentity('fixture', ['a']), createRuntimeIdentity('fixture', ['a'])],
    },
    {
      name: 'sparse',
      collectIdentities: () => Array(2) as Array<ReturnType<typeof createRuntimeIdentity>>,
    },
    {
      name: 'throw',
      collectIdentities: () => {
        throw new Error('collector failed');
      },
    },
    {
      name: 'non-array',
      collectIdentities: (() => null) as unknown as () => ReadonlyArray<ReturnType<typeof createRuntimeIdentity>>,
    },
  ])('collector $name 失败时具名报错并清理 candidate', ({ collectIdentities }) => {
    const disposed = vi.fn();
    const definition = defineFixtureOwner({
      capture: input => Object.freeze({ values: [...input.values], handle: Object.freeze({ dispose: disposed }) }),
      collectIdentities,
    });

    expect(() => createExecutor(definition).prepare(definition, { values: [1] })).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED',
        owner: 'fixture',
        phase: 'collect-identities',
      }),
    );
    expect(disposed).toHaveBeenCalledTimes(1);
  });

  it('capture/read 失败保留 cause、code、phase，并把 dispose secondary 附到 primary', () => {
    const captureCause = new Error('capture failed');
    const readCause = new Error('read failed');
    const disposeCause = new Error('dispose failed');
    const captureDefinition = defineFixtureOwner({
      capture: () => {
        throw captureCause;
      },
    });
    const readDefinition = defineFixtureOwner({
      read: () => {
        throw readCause;
      },
      dispose: () => {
        throw disposeCause;
      },
    });
    const captureExecutor = createExecutor(captureDefinition);
    const readExecutor = createExecutor(readDefinition);

    expect(() => captureExecutor.prepare(captureDefinition, { values: [] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_CAPTURE_FAILED', phase: 'capture', cause: captureCause }),
    );
    try {
      readExecutor.prepare(readDefinition, { values: [] });
      throw new Error('expected read failure');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeOwnerError);
      expect(error).toMatchObject({ code: 'RUNTIME_OWNER_READ_FAILED', phase: 'read', cause: readCause });
      expect((error as RuntimeOwnerError).diagnostics).toEqual([
        expect.objectContaining({ code: 'RUNTIME_OWNER_DISPOSE_FAILED', cause: disposeCause }),
      ]);
    }
  });

  it('compare 使用完整 captured value，并稳定包装 equals throw', () => {
    const equalDefinition = defineFixtureOwner();
    const compareCause = new Error('compare failed');
    const failingDefinition = defineFixtureOwner({
      equals: () => {
        throw compareCause;
      },
    });
    const equalExecutor = createExecutor(equalDefinition);
    const failingExecutor = createExecutor(failingDefinition);
    const left = equalExecutor.prepare(equalDefinition, { values: [1] }).value;
    const same = equalExecutor.prepare(equalDefinition, { values: [1] }).value;
    const changed = equalExecutor.prepare(equalDefinition, { values: [2] }).value;
    expect(equalExecutor.compare(equalDefinition, left, same).value).toBe(true);
    expect(equalExecutor.compare(equalDefinition, left, changed).value).toBe(false);

    const failingLeft = failingExecutor.prepare(failingDefinition, { values: [1] }).value;
    const failingRight = failingExecutor.prepare(failingDefinition, { values: [2] }).value;
    expect(() => failingExecutor.compare(failingDefinition, failingLeft, failingRight)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_COMPARE_FAILED', phase: 'compare', cause: compareCause }),
    );
  });

  it('executor 只执行绑定 registry 中的 Definition', () => {
    const registered = defineFixtureOwner();
    const unknown = defineRuntimeOwner<number, number, number, never>({
      key: 'unknown',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const executor = createExecutor(registered);

    expect(() => executor.prepare(unknown, 1)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_UNKNOWN', owner: 'unknown' }),
    );
  });

  it('retire 后禁止再次 compare 或 validate disposed value', () => {
    const definition = defineFixtureOwner();
    const executor = createExecutor(definition);
    const retired = executor.prepare(definition, { values: [1] }).value;
    const active = executor.prepare(definition, { values: [2] }).value;
    executor.retire(definition, retired);
    const changeSet = { baseRevision: 0, changes: ['change'] } as unknown as RuntimeChangeSet<string>;

    expect(() => executor.compare(definition, retired, active)).toThrow(/already retired/i);
    expect(() => executor.validateChangeSet(definition, active, retired, changeSet)).toThrow(/already retired/i);
  });

  it('Definition author 可隔离 nested Map/Set alias，persistent immutable value 可安全复用引用', () => {
    const input = { map: new Map([['a', 1]]), set: new Set(['x']) };
    const aliasSafe = defineRuntimeOwner<
      typeof input,
      Readonly<{ map: ReadonlyMap<string, number>; set: ReadonlySet<string> }>,
      Readonly<{ entries: ReadonlyArray<readonly [string, number]>; values: ReadonlyArray<string> }>,
      never
    >({
      key: 'alias-safe',
      value: {
        capture: source => Object.freeze({ map: new Map(source.map), set: new Set(source.set) }),
        read: value =>
          Object.freeze({
            entries: Object.freeze([...value.map.entries()].map(entry => Object.freeze(entry))),
            values: Object.freeze([...value.set.values()]),
          }),
        equals: (left, right) => left.map.get('a') === right.map.get('a') && left.set.has('x') === right.set.has('x'),
      },
    });
    const persistentValue = Object.freeze({ value: 1 });
    const persistent = defineRuntimeOwner<
      typeof persistentValue,
      typeof persistentValue,
      typeof persistentValue,
      never
    >({
      key: 'persistent',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const executor = createExecutor(aliasSafe, persistent);
    const aliasPrepared = executor.prepare(aliasSafe, input).value;
    input.map.set('a', 2);
    input.set.add('y');

    expect(aliasPrepared.read).toEqual({ entries: [['a', 1]], values: ['x'] });
    expect(executor.prepare(persistent, persistentValue).value.read).toBe(persistentValue);
  });

  it('validator throw 会 retire candidate，并把 dispose secondary 附到 validation error', () => {
    const validationCause = new Error('validation failed');
    const disposeCause = new Error('dispose failed');
    const definition = defineRuntimeOwner<number, number, number, string>({
      key: 'validator',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: () => {
          throw disposeCause;
        },
      },
      validateChangeSet: () => {
        throw validationCause;
      },
    });
    const executor = createExecutor(definition);
    const previous = executor.prepare(definition, 1).value;
    const candidate = executor.prepare(definition, 2).value;
    const changeSet = { baseRevision: 0, changes: ['change'] } as unknown as RuntimeChangeSet<string>;

    try {
      executor.validateChangeSet(definition, previous, candidate, changeSet);
      throw new Error('expected validation failure');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED',
        phase: 'validate-change-set',
        cause: validationCause,
      });
      expect((error as RuntimeOwnerError).diagnostics).toEqual([
        expect.objectContaining({ code: 'RUNTIME_OWNER_DISPOSE_FAILED', cause: disposeCause }),
      ]);
    }
  });

  it('validator 成功返回 valid，缺省 validator 允许 Program 继续校验', () => {
    const validating = defineRuntimeOwner<number, number, number, string>({
      key: 'validating',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
      validateChangeSet: (previous, next, changeSet) =>
        previous === 1 && next === 2 && changeSet.changes[0] === 'change' ? 'valid' : 'fallback',
    });
    const withoutValidator = defineRuntimeOwner<number, number, number, string>({
      key: 'without-validator',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const executor = createExecutor(validating, withoutValidator);
    const changeSet = { baseRevision: 0, changes: ['change'] } as unknown as RuntimeChangeSet<string>;

    expect(
      executor.validateChangeSet(
        validating,
        executor.prepare(validating, 1).value,
        executor.prepare(validating, 2).value,
        changeSet,
      ).value,
    ).toBe('valid');
    expect(
      executor.validateChangeSet(
        withoutValidator,
        executor.prepare(withoutValidator, 1).value,
        executor.prepare(withoutValidator, 2).value,
        changeSet,
      ).value,
    ).toBe('valid');
  });

  it('retire 隔离 dispose throw 并拒绝重复 retire', () => {
    const disposeCause = new Error('dispose failed');
    const definition = defineFixtureOwner({
      dispose: () => {
        throw disposeCause;
      },
    });
    const executor = createExecutor(definition);
    const prepared = executor.prepare(definition, { values: [] }).value;

    expect(executor.retire(definition, prepared).diagnostics).toEqual([
      expect.objectContaining({ code: 'RUNTIME_OWNER_DISPOSE_FAILED', cause: disposeCause }),
    ]);
    expect(() => executor.retire(definition, prepared)).toThrow(/already retired/i);
  });
});
