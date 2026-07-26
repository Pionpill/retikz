import { describe, expect, it, vi } from 'vitest';

import type { RuntimeChangeSet, RuntimeRevision } from '../../src/owner';
import type { RuntimeOwnerInput, RuntimeOwnerUpdate } from '../../src/transaction';

import { defineRuntimeOwner } from '../../src/owner';
import {
  createRuntimeChangeSet,
  createRuntimeOwnerInput,
  createRuntimeOwnerUpdate,
  getRuntimeOwnerCommandExecutor,
} from '../../src/transaction';

const owner = defineRuntimeOwner<number, number, number, { delta: number }>({
  key: 'counter',
  value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
});

describe('runtime revision and owner commands', () => {
  it('change set factory 校验 revision、复制并冻结 changes', () => {
    const changes = [{ delta: 1 }];
    const changeSet = createRuntimeChangeSet(0 as RuntimeRevision, changes);
    changes.push({ delta: 2 });

    expect(changeSet).toEqual({ baseRevision: 0, changes: [{ delta: 1 }] });
    expect(Object.isFrozen(changeSet)).toBe(true);
    expect(Object.isFrozen(changeSet.changes)).toBe(true);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'change set 拒绝无效 revision：%s',
    revision => {
      expect(() => createRuntimeChangeSet(revision as RuntimeRevision, [])).toThrowError(
        expect.objectContaining({ code: 'RUNTIME_REVISION_INVALID' }),
      );
    },
  );

  it('builder 创建 opaque initial/update command，并复制 change envelope', () => {
    const changeSet = createRuntimeChangeSet(0 as RuntimeRevision, [{ delta: 1 }]);
    const initial = createRuntimeOwnerInput(owner, 1);
    const update = createRuntimeOwnerUpdate(owner, 2, changeSet);

    expect(initial).toMatchObject({ owner, kind: 'initial' });
    expect(update).toMatchObject({ owner, kind: 'update' });
    expect(initial).not.toHaveProperty('value');
    expect(update).not.toHaveProperty('value');
  });

  it('拒绝伪造 change set 与 owner command', () => {
    const forgedChangeSet = { baseRevision: 0, changes: [] } as unknown as RuntimeChangeSet<{ delta: number }>;
    expect(() => createRuntimeOwnerUpdate(owner, 2, forgedChangeSet)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_CHANGESET_INVALID' }),
    );

    const forgedInput = { owner, kind: 'initial' } as unknown as RuntimeOwnerInput;
    const forgedUpdate = { owner, kind: 'update' } as unknown as RuntimeOwnerUpdate;
    expect(() => getRuntimeOwnerCommandExecutor(forgedInput)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }),
    );
    expect(() => getRuntimeOwnerCommandExecutor(forgedUpdate)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }),
    );
  });

  it('拒绝 foreign module ChangeSet 与 owner command', async () => {
    vi.resetModules();
    const { createRuntimeChangeSet: createForeignChangeSet, createRuntimeOwnerInput: createForeignOwnerInput } =
      await import('../../src/transaction/factories');
    const foreignChangeSet = createForeignChangeSet(0 as RuntimeRevision, [{ delta: 1 }]);
    const foreignInput = createForeignOwnerInput(owner, 1);

    expect(() => createRuntimeOwnerUpdate(owner, 2, foreignChangeSet)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_CHANGESET_INVALID' }),
    );
    expect(() => getRuntimeOwnerCommandExecutor(foreignInput)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }),
    );
  });
});
