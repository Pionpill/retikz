import { describe, expect, it, vi } from 'vitest';

import type { CompiledBoundaryGeometry } from '../../../../core/src';
import type { CompiledNodeLayout } from '../../../../core/src/compile/node';
import { BUILTIN_SHAPES } from '../../../../core/src/providers/shape/shape';
import { NamespaceStack } from '../../../src/compile/runtime';
import type { DuplicateRegisterInfo } from '../../../src/compile/shared';

const makeLayout = (_id: string, x = 0, y = 0): CompiledBoundaryGeometry & Pick<CompiledNodeLayout, 'geometry'> => ({
  shape: { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} },
  geometry: {
    rect: { x, y, width: 0, height: 0, rotate: 0 },
    contentCenter: [x, y],
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    contentSize: { width: 0, height: 0 },
  },
  boundary: {
    name: BUILTIN_SHAPES.get('rectangle')!.name,
    definition: BUILTIN_SHAPES.get('rectangle')!,
    params: {},
    isShape: true,
  },
});

describe('NamespaceStack 基本 register / lookup', () => {
  it('贡献保留最终绑定、新增声明与原有名称顺序，并可重放重复诊断', () => {
    const stack = new NamespaceStack();
    stack.register('a', { geometry: makeLayout('a'), irPath: ['children', 0] });
    stack.register('b', { geometry: makeLayout('b'), irPath: ['children', 1] });
    const duplicates: Array<DuplicateRegisterInfo> = [];
    const replay = stack.fork({ onDuplicate: info => duplicates.push(info) });
    const changes = stack.captureFrameChanges(() => {
      stack.register('new', { geometry: makeLayout('new', 5), irPath: ['children', 2] });
      stack.register('b', { geometry: makeLayout('b', 10), irPath: ['children', 3] });
      stack.register('a', { geometry: makeLayout('a', 20), irPath: ['children', 4] });
      stack.register('a', { geometry: makeLayout('a', 30), irPath: ['children', 5] });
    });
    expect(changes.map(change => change.id)).toEqual(['a', 'b', 'new']);
    expect(changes[0].irPaths).toEqual([
      ['children', 4],
      ['children', 5],
    ]);
    for (const change of changes) replay.commitForkChange(change);
    expect(duplicates.map(info => info.id)).toEqual(['a', 'a', 'b']);
    expect(duplicates[1].duplicateIrPaths).toEqual([
      ['children', 0],
      ['children', 4],
      ['children', 5],
    ]);
    expect(replay.lookupReference('a')).toEqual(stack.lookupReference('a'));
    expect(replay.lookupReference('b')).toEqual(stack.lookupReference('b'));
    expect(replay.lookupReference('new')).toEqual(stack.lookupReference('new'));
  });

  it('捕获隔离局部 frame 与未提交 probe，同层嵌套发布仍归入外层贡献', () => {
    const stack = new NamespaceStack();
    const changes = stack.captureFrameChanges(() => {
      const nested = stack.captureFrameChanges(() => {
        stack.register('shared', { geometry: makeLayout('shared'), irPath: ['children', 0] });
      });
      expect(nested.map(change => change.id)).toEqual(['shared']);
      stack.pushFrame();
      stack.register('local', { geometry: makeLayout('local'), irPath: ['children', 1] });
      stack.popFrame();
      const probe = stack.fork();
      probe.register('discarded', { geometry: makeLayout('discarded'), irPath: ['children', 2] });
    });
    expect(changes.map(change => change.id)).toEqual(['shared']);
    expect(stack.lookupReference('local')).toBeUndefined();
    expect(stack.lookupReference('discarded')).toBeUndefined();
  });

  it('几何替换进入贡献但不伪造声明，异常捕获结束后可继续记录', () => {
    const stack = new NamespaceStack();
    const initial = makeLayout('a');
    const replaced = makeLayout('a', 10);
    const projected = makeLayout('a', 20);
    stack.register('a', { geometry: initial, irPath: ['children', 0] });
    const changes = stack.captureFrameChanges(() => {
      stack.replaceGeometry('a', replaced, 0);
      stack.replacePublishedGeometry(replaced, projected);
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].entry.geometry).toBe(projected);
    expect(changes[0].irPaths).toEqual([]);
    const failure = new Error('compile failed');
    expect(() =>
      stack.captureFrameChanges(() => {
        throw failure;
      }),
    ).toThrow(failure);
    expect(stack.captureFrameChanges(() => {})).toEqual([]);
    expect(
      stack
        .captureFrameChanges(() => {
          stack.register('next', { geometry: initial, irPath: ['children', 1] });
        })
        .map(change => change.id),
    ).toEqual(['next']);
  });

  it('作用域身份不随名称写入变化，fork 共享已有作用域并隔离新建作用域', () => {
    const stack = new NamespaceStack();
    const root = stack.identity;
    stack.register('same', { geometry: makeLayout('same'), irPath: ['children', 0, 'id'] });
    const fork = stack.fork();
    fork.register('same', { geometry: makeLayout('same', 20), irPath: ['children', 0, 'id'] });
    expect(stack.identity).toBe(root);
    expect(fork.identity).toBe(root);
    expect(stack.lookupReference('same')?.geometry).toMatchObject({ geometry: { rect: { x: 0 } } });

    stack.pushFrame();
    fork.pushFrame();
    expect(stack.identity).not.toBe(root);
    expect(fork.identity).not.toBe(stack.identity);
    expect(stack.fork().identity).toBe(stack.identity);
    stack.popFrame();
    fork.popFrame();
    expect(stack.identity).toBe(root);
    expect(fork.identity).toBe(root);
  });

  it('名称堆栈基本寄存器查找', () => {
    const stack = new NamespaceStack();
    const layout = makeLayout('A', 10, 20);
    stack.register('A', { geometry: layout, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.geometry).toBe(layout);
  });

  it('lookup 未注册 id 返回 undefined', () => {
    const stack = new NamespaceStack();

    expect(stack.lookupReference('ghost')?.geometry).toBeUndefined();
  });

  it('构造后初始 depth = 1（根 frame 存在）', () => {
    const stack = new NamespaceStack();

    expect(stack.depth).toBe(1);
  });
});

describe('NamespaceStack push / pop frame 隔离', () => {
  it('名称堆栈推入弹出帧隔离', () => {
    const stack = new NamespaceStack();
    stack.pushFrame();

    expect(stack.depth).toBe(2);

    const inner = makeLayout('A', 100);
    stack.register('A', { geometry: inner, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.geometry).toBe(inner);

    stack.popFrame();

    expect(stack.depth).toBe(1);
    expect(stack.lookupReference('A')?.geometry).toBeUndefined();
  });

  it('外层 register 后 push frame，外层 id 在内层仍可见（inside-out 落到外层 frame）', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('outer', 1);
    stack.register('outer', { geometry: outer, irPath: ['children', 0, 'id'] });
    stack.pushFrame();

    expect(stack.lookupReference('outer')?.geometry).toBe(outer);
  });
});

describe('NamespaceStack 由内而外的阴影', () => {
  it('名称堆栈查找由内而外的阴影', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('A', 0);
    stack.register('A', { geometry: outer, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    const inner = makeLayout('A', 50);
    stack.register('A', { geometry: inner, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.geometry).toBe(inner);

    stack.popFrame();

    expect(stack.lookupReference('A')?.geometry).toBe(outer);
  });

  it('三层嵌套各自有 id="A" 时 lookup 命中栈顶', () => {
    const stack = new NamespaceStack();
    const a0 = makeLayout('A', 0);
    const a1 = makeLayout('A', 1);
    const a2 = makeLayout('A', 2);
    stack.register('A', { geometry: a0, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    stack.register('A', { geometry: a1, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    stack.register('A', { geometry: a2, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.geometry).toBe(a2);

    stack.popFrame();

    expect(stack.lookupReference('A')?.geometry).toBe(a1);

    stack.popFrame();

    expect(stack.lookupReference('A')?.geometry).toBe(a0);
  });
});

describe('NamespaceStack pop 根 frame 防御性 throw', () => {
  it('空命名栈弹出时抛出错误', () => {
    const stack = new NamespaceStack();

    expect(() => stack.popFrame()).toThrow(/cannot pop the root frame/);
  });

  it('多次 push/pop 配平后再 pop 一次抛错', () => {
    const stack = new NamespaceStack();
    stack.pushFrame();
    stack.pushFrame();
    stack.popFrame();
    stack.popFrame();

    expect(() => stack.popFrame()).toThrow(/cannot pop the root frame/);
  });
});

describe('NamespaceStack register 返回 overwritten flag', () => {
  it('名称堆栈寄存器返回覆盖标志', () => {
    const stack = new NamespaceStack();
    const first = makeLayout('A', 0);
    const second = makeLayout('A', 10);

    expect(stack.register('A', { geometry: first, irPath: ['children', 0, 'id'] })).toBe(false);
    expect(stack.register('A', { geometry: second, irPath: ['children', 0, 'id'] })).toBe(true);
    expect(stack.lookupReference('A')?.geometry).toBe(second);
  });

  it('跨 frame 同 id 不算 overwritten（push frame 内首次 register 返回 false）', () => {
    const stack = new NamespaceStack();
    stack.register('A', { geometry: makeLayout('A', 0), irPath: ['children', 0, 'id'] });
    stack.pushFrame();

    expect(stack.register('A', { geometry: makeLayout('A', 10), irPath: ['children', 0, 'id'] })).toBe(false);
  });
});

describe('NamespaceStack onDuplicate 回调', () => {
  it('同 frame 第二次 register 触发回调，包含 id、frameDepth 和完整声明路径', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({
      onDuplicate: info => events.push(info),
    });
    stack.register('A', { geometry: makeLayout('A', 0), irPath: ['children', 0, 'id'] });
    stack.register('A', { geometry: makeLayout('A', 10), irPath: ['children', 1, 'id'] });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('A');
    expect(events[0].frameDepth).toBe(0);
    expect(events[0].duplicateIrPaths).toEqual([
      ['children', 0, 'id'],
      ['children', 1, 'id'],
    ]);
  });

  it('首次 register 不触发回调', () => {
    const cb = vi.fn();
    const stack = new NamespaceStack({ onDuplicate: cb });
    stack.register('A', { geometry: makeLayout('A'), irPath: ['children', 0, 'id'] });

    expect(cb).not.toHaveBeenCalled();
  });

  it('同 frame 多次注册提供完整独立路径快照', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.register('A', { geometry: makeLayout('A', 0), irPath: ['p1'] });
    stack.register('A', { geometry: makeLayout('A', 1), irPath: ['p2'] });
    stack.register('A', { geometry: makeLayout('A', 2), irPath: ['p3'] });

    expect(events).toHaveLength(2);
    expect(events[0].duplicateIrPaths).toEqual([['p1'], ['p2']]);
    expect(events[1].duplicateIrPaths).toEqual([['p1'], ['p2'], ['p3']]);
    expect(events[0].namespace).toBe(events[1].namespace);
  });

  it('fork 隔离声明历史，提交时结合目标命名空间完整历史', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.register('A', { geometry: makeLayout('A'), irPath: ['original'] });
    const baseline = stack.fork();
    const fork = baseline.fork();
    fork.register('A', { geometry: makeLayout('A', 1), irPath: ['probe1'] });
    fork.register('A', { geometry: makeLayout('A', 2), irPath: ['probe2'] });
    stack.register('A', { geometry: makeLayout('A', 3), irPath: ['between'] });
    for (const change of fork.diffTopFrame(baseline)) stack.commitForkChange(change);
    expect(events.at(-1)?.duplicateIrPaths).toEqual([['original'], ['between'], ['probe1'], ['probe2']]);
    expect(stack.lookupReference('A')?.geometry).toBe(fork.lookupReference('A')?.geometry);
  });

  it('跨 frame 同 id 不触发 duplicate 回调', () => {
    const cb = vi.fn();
    const stack = new NamespaceStack({ onDuplicate: cb });
    stack.register('A', { geometry: makeLayout('A'), irPath: ['root'] });
    stack.pushFrame();
    stack.register('A', { geometry: makeLayout('A'), irPath: ['inner'] });

    expect(cb).not.toHaveBeenCalled();
  });

  it('frameDepth 反映栈中所处深度（push 后内层 duplicate = 1）', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.pushFrame();
    stack.register('A', { geometry: makeLayout('A'), irPath: ['p1'] });
    stack.register('A', { geometry: makeLayout('A'), irPath: ['p2'] });

    expect(events[0].frameDepth).toBe(1);
  });
});

describe('NamespaceStack resolving phase 禁止 register', () => {
  it('解析期间的命名空间堆栈寄存器', () => {
    const stack = new NamespaceStack();
    stack.register('A', { geometry: makeLayout('A'), irPath: ['children', 0, 'id'] });
    stack.setPhase('resolving');

    expect(stack.lookupReference('A')?.geometry).toBeDefined();
    expect(() => stack.register('B', { geometry: makeLayout('B'), irPath: ['children', 0, 'id'] })).toThrow(
      /only allowed during registering/,
    );
  });
});

describe('NamespaceStack Scope placeholder 生命周期', () => {
  it('fork 保留祖先身份，匿名和同名 Scope 分配不同身份，投影及回放不丢失身份', () => {
    const stack = new NamespaceStack();
    const ancestorId = stack.enterScope('scope');
    stack.register('scope', {
      geometry: makeLayout('scope'),
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId: ancestorId,
    });
    const fork = stack.fork();
    expect(() => fork.lookupReference('scope')).toThrow(/ancestor Scope/);

    const anonymousId = fork.enterScope();
    fork.leaveScope();
    fork.pushFrame();
    const childId = fork.enterScope('scope');
    const placeholder = makeLayout('scope');
    fork.register('scope', {
      geometry: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId: childId,
    });
    fork.replacePublishedGeometry(placeholder, makeLayout('scope', 10));
    expect(() => fork.lookupReference('scope')).toThrow(/ancestor Scope/);
    fork.replaceGeometry('scope', makeLayout('scope', 20), 1, childId);
    fork.leaveScope();
    expect(fork.lookupReference('scope')?.scopeId).toBe(childId);
    stack.pushFrame();
    for (const change of fork.diffTopFrame(stack)) stack.commitForkChange(change);
    expect(stack.lookupReference('scope')?.scopeId).toBe(childId);
    const nextId = stack.enterScope();
    expect(new Set([ancestorId, anonymousId, childId, nextId]).size).toBe(4);
    stack.leaveScope();
    stack.popFrame();
    expect(() => stack.lookupReference('scope')).toThrow(/ancestor Scope/);
  });

  it('lookupReference 区分 placeholder 与合法 resolved 零尺寸 layout', () => {
    const stack = new NamespaceStack();
    const placeholder = makeLayout('scope');
    const resolved = makeLayout('scope');

    const scopeId = stack.enterScope('scope');
    stack.register('scope', {
      geometry: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId,
    });
    stack.leaveScope();

    expect(stack.lookupReference('scope')).toMatchObject({ geometry: placeholder, state: 'scope-placeholder' });

    expect(stack.replaceGeometry('scope', resolved, 0, scopeId)).toBe(true);
    expect(stack.lookupReference('scope')).toMatchObject({ geometry: resolved, state: 'resolved' });
  });

  it('placeholder 被同 frame 的合法同名 layout 覆盖后不再回填旧 Scope', () => {
    const stack = new NamespaceStack();
    const placeholder = makeLayout('scope');
    const childWithSameId = makeLayout('scope', 10, 20);
    const resolvedScope = makeLayout('scope', 30, 40);

    const scopeId = stack.enterScope('scope');
    stack.register('scope', {
      geometry: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId,
    });
    stack.leaveScope();
    stack.register('scope', { geometry: childWithSameId, irPath: ['children', 0, 'id'] });

    expect(stack.replaceGeometry('scope', resolvedScope, 0, scopeId)).toBe(false);
    expect(stack.lookupReference('scope')).toEqual({
      geometry: childWithSameId,
      irPath: ['children', 0, 'id'],
      state: 'resolved',
    });
  });
});

it('保留未更改的分叉的测量身份，并使每个名称空间突变无效', () => {
  const stack = new NamespaceStack();
  let identity = stack.measurementIdentity;
  expect(stack.fork().measurementIdentity).toBe(identity);
  const changed = () => {
    expect(stack.measurementIdentity).not.toBe(identity);
    identity = stack.measurementIdentity;
    expect(stack.fork().measurementIdentity).toBe(identity);
  };
  stack.register('target', { geometry: makeLayout('target', 10), irPath: ['children', 0, 'id'] });
  changed();
  stack.replaceGeometry('target', makeLayout('target', 20), 0);
  changed();
  const fork = stack.fork();
  fork.register('other', { geometry: makeLayout('other', 30), irPath: ['children', 0, 'id'] });
  expect(stack.lookupReference('other')?.geometry).toBeUndefined();
  for (const change of fork.diffTopFrame(stack)) stack.commitForkChange(change);
  changed();
  expect(stack.lookupReference('other')?.geometry).toBe(fork.lookupReference('other')?.geometry);
  stack.pushFrame();
  changed();
  stack.popFrame();
  changed();
  stack.setPhase('resolving');
  changed();
});
