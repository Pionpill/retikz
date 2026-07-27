import {
  createRuntimeChangeSet,
  createRuntimeIdentity,
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import type { CoreChange, IRScene } from '../../../src';

import { CORE_OWNER_KEY, CoreOwnerDefinition, createCoreProgram } from '../../../src';

const rootIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root']);
const nodeIdentity = (id: string) => createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', id]);
const scopeIdentity = (id: string) => createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'scope', id]);
const scopedNodeIdentity = (scopeId: string, id: string) =>
  createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'scope', scopeId, 'node', id]);

const scene = (...nodes: Array<Readonly<{ id: string; text: string }>>): IRScene => ({
  version: 1,
  type: 'scene',
  children: nodes.map(node => ({
    type: 'node',
    id: node.id,
    position: [(node.id.charCodeAt(0) - 'a'.charCodeAt(0)) * 80, 0],
    text: node.text,
  })),
});

const updateWithHint = (initial: IRScene, next: IRScene, changes: ReadonlyArray<CoreChange>) => {
  const program = createCoreProgram({ onWarn: () => {} });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
  });
  const baseRevision = session.revision();
  return session.update({
    baseRevision,
    owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next, createRuntimeChangeSet(baseRevision, changes))],
  });
};

const expectMatched = (initial: IRScene, next: IRScene, changes: ReadonlyArray<CoreChange>) => {
  expect(updateWithHint(initial, next, changes).diagnostics).toEqual([]);
};

const expectMismatch = (initial: IRScene, next: IRScene, changes: ReadonlyArray<CoreChange>) => {
  expect(updateWithHint(initial, next, changes).diagnostics).toEqual([
    expect.objectContaining({ code: 'CORE_CHANGESET_MISMATCH' }),
  ]);
};

describe('Core stable-root structural Snapshot Diff', () => {
  it('接受与 next root order 一致的 add hint，并拒绝错误 before', () => {
    const initial = scene({ id: 'a', text: 'A' });
    const next = scene({ id: 'b', text: 'B' }, { id: 'a', text: 'A' });
    const addB: CoreChange = {
      kind: 'add',
      identity: nodeIdentity('b'),
      parent: rootIdentity,
      before: nodeIdentity('a'),
    };

    expectMatched(initial, next, [addB]);
    expectMismatch(initial, next, [{ ...addB, before: undefined }]);
  });

  it('接受完整 remove hint，拒绝漏报被移除实体', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' });
    const next = scene({ id: 'a', text: 'A' });

    expectMatched(initial, next, [{ kind: 'remove', identity: nodeIdentity('b') }]);
    expectMismatch(initial, next, []);
  });

  it('接受能重建 next order 的等价 move hint', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' });
    const next = scene({ id: 'b', text: 'B' }, { id: 'a', text: 'A' });

    expectMatched(initial, next, [{ kind: 'move', identity: nodeIdentity('a'), parent: rootIdentity }]);
    expectMatched(initial, next, [
      { kind: 'move', identity: nodeIdentity('b'), parent: rootIdentity, before: nodeIdentity('a') },
    ]);
  });

  it('接受包含 common index 不变实体的等价最小 move 集合', () => {
    const initial = scene(
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    );
    const next = scene({ id: 'c', text: 'C' }, { id: 'b', text: 'B' }, { id: 'a', text: 'A' }, { id: 'd', text: 'D' });

    expectMatched(initial, next, [
      { kind: 'move', identity: nodeIdentity('a'), parent: rootIdentity, before: nodeIdentity('d') },
      { kind: 'move', identity: nodeIdentity('b'), parent: rootIdentity, before: nodeIdentity('a') },
    ]);
  });

  it('只接受最小 move 集合，拒绝用多个冗余 move 表达一次轮转', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' });
    const next = scene({ id: 'b', text: 'B' }, { id: 'c', text: 'C' }, { id: 'a', text: 'A' });

    expectMatched(initial, next, [{ kind: 'move', identity: nodeIdentity('a'), parent: rootIdentity }]);
    expectMismatch(initial, next, []);
    expectMismatch(initial, next, [
      { kind: 'move', identity: nodeIdentity('b'), parent: rootIdentity, before: nodeIdentity('c') },
      { kind: 'move', identity: nodeIdentity('c'), parent: rootIdentity, before: nodeIdentity('a') },
    ]);
  });

  it('实体同时 move 与 update 时要求两类 hint 都完整', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' });
    const next = scene({ id: 'b', text: 'B2' }, { id: 'a', text: 'A' });
    const move: CoreChange = { kind: 'move', identity: nodeIdentity('a'), parent: rootIdentity };
    const update: CoreChange = { kind: 'update', identity: nodeIdentity('b') };

    expectMatched(initial, next, [move, update]);
    expectMismatch(initial, next, [move]);
    expectMismatch(initial, next, [update]);
  });

  it('结构 hint 按集合校验，不依赖 add 或 move 在数组中的先后顺序', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'd', text: 'D' });
    const withAdds = scene(
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'a', text: 'A' },
      { id: 'd', text: 'D' },
    );
    const addB: CoreChange = {
      kind: 'add',
      identity: nodeIdentity('b'),
      parent: rootIdentity,
      before: nodeIdentity('c'),
    };
    const addC: CoreChange = {
      kind: 'add',
      identity: nodeIdentity('c'),
      parent: rootIdentity,
      before: nodeIdentity('a'),
    };
    expectMatched(initial, withAdds, [addB, addC]);
    expectMatched(initial, withAdds, [addC, addB]);

    const withMoveAndAdd = scene({ id: 'd', text: 'D' }, { id: 'a', text: 'A' }, { id: 'c', text: 'C' });
    const moveA: CoreChange = {
      kind: 'move',
      identity: nodeIdentity('a'),
      parent: rootIdentity,
      before: nodeIdentity('c'),
    };
    const addTailC: CoreChange = { kind: 'add', identity: nodeIdentity('c'), parent: rootIdentity };
    expectMatched(initial, withMoveAndAdd, [moveA, addTailC]);
    expectMatched(initial, withMoveAndAdd, [addTailC, moveA]);
  });

  it('拒绝字段可伪装成有效 move 的未知 kind', () => {
    const initial = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' });
    const next = scene({ id: 'b', text: 'B' }, { id: 'a', text: 'A' });
    const unknownMove = {
      kind: 'unknown',
      identity: nodeIdentity('a'),
      parent: rootIdentity,
    } as unknown as CoreChange;

    expectMismatch(initial, next, [unknownMove]);
  });

  it.each([
    {
      name: 'anonymous child',
      initial: {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', position: [0, 0], text: 'A' }],
      },
      next: {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', position: [0, 0], text: 'B' }],
      },
    },
    {
      name: 'duplicate id',
      initial: {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'duplicate', position: [0, 0], text: 'A' },
          { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        ],
      },
      next: {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'duplicate', position: [0, 0], text: 'A2' },
          { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        ],
      },
    },
    {
      name: 'Scope boundary',
      initial: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            id: 'scope-a',
            children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'A' }],
          },
        ],
      },
      next: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            id: 'scope-a',
            children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'B' }],
          },
        ],
      },
    },
  ] satisfies Array<{ name: string; initial: IRScene; next: IRScene }>)(
    '$name 保持 conservative mismatch',
    ({ initial, next }) => {
      expectMismatch(initial, next, []);
    },
  );

  it('拒绝 foreign parent、重复结构 hint 与 document root 结构操作', () => {
    const initial = scene({ id: 'a', text: 'A' });
    const next = scene({ id: 'a', text: 'A' }, { id: 'b', text: 'B' });
    const addB: CoreChange = {
      kind: 'add',
      identity: nodeIdentity('b'),
      parent: createRuntimeIdentity(CORE_OWNER_KEY, ['root', 'node', 'a']),
    };
    const validAddB: CoreChange = { ...addB, parent: rootIdentity };

    expectMismatch(initial, next, [addB]);
    expectMismatch(initial, next, [addB, addB]);
    expectMismatch(initial, next, [{ kind: 'remove', identity: rootIdentity }]);
    expectMismatch(initial, next, [validAddB, { kind: 'add', identity: rootIdentity, parent: rootIdentity }]);
    expectMismatch(initial, next, [validAddB, { kind: 'move', identity: rootIdentity, parent: rootIdentity }]);
  });
});

describe('Core nested stable Scope structural Snapshot Diff', () => {
  const scopedScene = (
    scopeId: string,
    nodes: Array<Readonly<{ id: string; text: string }>>,
    options: Readonly<{ localNamespace?: boolean; zIndex?: number }> = {},
  ): IRScene => ({
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'scope',
        id: scopeId,
        ...options,
        children: nodes.map(node => ({
          type: 'node',
          id: node.id,
          position: [(node.id.charCodeAt(0) - 'a'.charCodeAt(0)) * 80, 0],
          text: node.text,
        })),
      },
    ],
  });

  it('用 nested identity 精确校验 Scope 内实体更新', () => {
    const initial = scopedScene('group', [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);
    const next = scopedScene('group', [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B2' },
    ]);
    const update: CoreChange = { kind: 'update', identity: scopedNodeIdentity('group', 'b') };

    expectMatched(initial, next, [update]);
    expectMismatch(initial, next, []);
    expectMismatch(initial, next, [{ kind: 'update', identity: nodeIdentity('b') }]);
  });

  it('按 Scope parent 校验 nested add、remove 与最小 reorder', () => {
    const initial = scopedScene('group', [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);
    const withAdd = scopedScene('group', [
      { id: 'c', text: 'C' },
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);
    const addC: CoreChange = {
      kind: 'add',
      identity: scopedNodeIdentity('group', 'c'),
      parent: scopeIdentity('group'),
      before: scopedNodeIdentity('group', 'a'),
    };
    expectMatched(initial, withAdd, [addC]);
    expectMismatch(initial, withAdd, [{ ...addC, parent: rootIdentity }]);

    const reordered = scopedScene('group', [
      { id: 'b', text: 'B' },
      { id: 'a', text: 'A' },
    ]);
    expectMatched(initial, reordered, [
      {
        kind: 'move',
        identity: scopedNodeIdentity('group', 'a'),
        parent: scopeIdentity('group'),
      },
    ]);

    expectMatched(withAdd, initial, [{ kind: 'remove', identity: scopedNodeIdentity('group', 'c') }]);
  });

  it('跨 Scope 移动形成旧 identity remove 与新 identity add', () => {
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'scope', id: 'left', children: [{ type: 'node', id: 'item', position: [0, 0], text: 'A' }] },
        { type: 'scope', id: 'right', children: [] },
      ],
    };
    const next: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'scope', id: 'left', children: [] },
        { type: 'scope', id: 'right', children: [{ type: 'node', id: 'item', position: [0, 0], text: 'A' }] },
      ],
    };

    expectMatched(initial, next, [
      { kind: 'remove', identity: scopedNodeIdentity('left', 'item') },
      {
        kind: 'add',
        identity: scopedNodeIdentity('right', 'item'),
        parent: scopeIdentity('right'),
      },
    ]);
    expectMismatch(initial, next, [
      {
        kind: 'move',
        identity: scopedNodeIdentity('left', 'item'),
        parent: scopeIdentity('right'),
      },
    ]);
  });

  it('整棵 Scope 子树 add/remove 不级联，必须逐项覆盖 stable descendant', () => {
    const initial: IRScene = { version: 1, type: 'scene', children: [] };
    const next = scopedScene('group', [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ]);
    const additions: Array<CoreChange> = [
      { kind: 'add', identity: scopeIdentity('group'), parent: rootIdentity },
      {
        kind: 'add',
        identity: scopedNodeIdentity('group', 'a'),
        parent: scopeIdentity('group'),
        before: scopedNodeIdentity('group', 'b'),
      },
      { kind: 'add', identity: scopedNodeIdentity('group', 'b'), parent: scopeIdentity('group') },
    ];

    expectMatched(initial, next, additions);
    expectMismatch(initial, next, additions.slice(0, -1));

    const removals: Array<CoreChange> = [
      { kind: 'remove', identity: scopeIdentity('group') },
      { kind: 'remove', identity: scopedNodeIdentity('group', 'a') },
      { kind: 'remove', identity: scopedNodeIdentity('group', 'b') },
    ];
    expectMatched(next, initial, removals);
    expectMismatch(next, initial, removals.slice(0, -1));
  });

  it('Scope 自身字段变化与 child 变化使用不同 update identity', () => {
    const initial = scopedScene('group', [{ id: 'a', text: 'A' }]);
    const next = scopedScene('group', [{ id: 'a', text: 'A' }], { zIndex: 2 });

    expectMatched(initial, next, [{ kind: 'update', identity: scopeIdentity('group') }]);
    expectMismatch(initial, next, [{ kind: 'update', identity: scopedNodeIdentity('group', 'a') }]);
  });

  it.each([
    {
      name: 'nested duplicate id',
      initial: scopedScene('group', [
        { id: 'duplicate', text: 'A' },
        { id: 'duplicate', text: 'B' },
      ]),
      next: scopedScene('group', [
        { id: 'duplicate', text: 'A2' },
        { id: 'duplicate', text: 'B' },
      ]),
    },
    {
      name: 'nested anonymous child',
      initial: {
        version: 1,
        type: 'scene',
        children: [{ type: 'scope', id: 'group', children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
      },
      next: {
        version: 1,
        type: 'scene',
        children: [{ type: 'scope', id: 'group', children: [{ type: 'node', position: [0, 0], text: 'B' }] }],
      },
    },
  ] satisfies Array<{ name: string; initial: IRScene; next: IRScene }>)(
    '$name 保持 conservative mismatch',
    ({ initial, next }) => {
      expectMismatch(initial, next, []);
    },
  );

  it('localNamespace 不改变 stable identity path', () => {
    const initial = scopedScene('group', [{ id: 'a', text: 'A' }], { localNamespace: true });
    const next = scopedScene('group', [{ id: 'a', text: 'A2' }], { localNamespace: true });

    expectMatched(initial, next, [{ kind: 'update', identity: scopedNodeIdentity('group', 'a') }]);
  });
});
