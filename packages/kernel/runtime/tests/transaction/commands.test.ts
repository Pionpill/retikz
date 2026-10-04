import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import type { RuntimeRevision } from '../../src/source';
import { defineRuntimeSource } from '../../src/source';
import {
  createRuntimeChangeSet,
  createRuntimeSourceInput,
  createRuntimeSourceUpdate,
  getRuntimeSourceCommandExecutor,
} from '../../src/transaction';

const source = defineRuntimeSource<number, number, number, { delta: number }>({
  key: 'counter',
  value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
});

describe('runtime revision and source commands', () => {
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
        expect.objectContaining({ code: RetikzRuntimeErrorCode.RevisionInvalid }),
      );
    },
  );

  it('builder 创建 opaque initial/update command，并复制 change envelope', () => {
    const changeSet = createRuntimeChangeSet(0 as RuntimeRevision, [{ delta: 1 }]);
    const initial = createRuntimeSourceInput(source, 1);
    const update = createRuntimeSourceUpdate(source, 2, changeSet);

    expect(initial).toMatchObject({ source, kind: 'initial' });
    expect(update).toMatchObject({ source, kind: 'update' });
    expect(initial).not.toHaveProperty('value');
    expect(update).not.toHaveProperty('value');
  });

  it('拒绝 foreign module ChangeSet 与 source command', async () => {
    vi.resetModules();
    const { createRuntimeChangeSet: createForeignChangeSet, createRuntimeSourceInput: createForeignSourceInput } =
      await import('../../src/transaction/factories');
    const foreignChangeSet = createForeignChangeSet(0 as RuntimeRevision, [{ delta: 1 }]);
    const foreignInput = createForeignSourceInput(source, 1);

    expect(() => createRuntimeSourceUpdate(source, 2, foreignChangeSet)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ChangeSetInvalid }),
    );
    expect(() => getRuntimeSourceCommandExecutor(foreignInput)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceCommandInvalid }),
    );
  });
});
