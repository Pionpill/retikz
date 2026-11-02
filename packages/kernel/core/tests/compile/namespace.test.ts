import { describe, expect, it, vi } from 'vitest';

import type { DuplicateRegisterInfo } from '../../src/compile/context';
import { NamespaceStack } from '../../src/compile/context';
import type { CompiledNodeLayout } from '../../src/compile/layout';
import { BUILTIN_SHAPES } from '../../src/providers/shape';

const makeLayout = (_id: string, x = 0, y = 0): CompiledNodeLayout => ({
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
  it('作用域身份不随名称写入变化，fork 共享已有作用域并隔离新建作用域', () => {
    const stack = new NamespaceStack();
    const root = stack.identity;
    stack.register('same', { layout: makeLayout('same'), irPath: ['children', 0, 'id'] });
    const fork = stack.fork();
    fork.register('same', { layout: makeLayout('same', 20), irPath: ['children', 0, 'id'] });
    expect(stack.identity).toBe(root);
    expect(fork.identity).toBe(root);
    expect(stack.lookupReference('same')?.layout.geometry.rect.x).toBe(0);

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
    stack.register('A', { layout, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.layout).toBe(layout);
  });

  it('lookup 未注册 id 返回 undefined', () => {
    const stack = new NamespaceStack();

    expect(stack.lookupReference('ghost')?.layout).toBeUndefined();
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
    stack.register('A', { layout: inner, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.layout).toBe(inner);

    stack.popFrame();

    expect(stack.depth).toBe(1);
    expect(stack.lookupReference('A')?.layout).toBeUndefined();
  });

  it('外层 register 后 push frame，外层 id 在内层仍可见（inside-out 落到外层 frame）', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('outer', 1);
    stack.register('outer', { layout: outer, irPath: ['children', 0, 'id'] });
    stack.pushFrame();

    expect(stack.lookupReference('outer')?.layout).toBe(outer);
  });
});

describe('NamespaceStack 由内而外的阴影', () => {
  it('名称堆栈查找由内而外的阴影', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('A', 0);
    stack.register('A', { layout: outer, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    const inner = makeLayout('A', 50);
    stack.register('A', { layout: inner, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.layout).toBe(inner);

    stack.popFrame();

    expect(stack.lookupReference('A')?.layout).toBe(outer);
  });

  it('三层嵌套各自有 id="A" 时 lookup 命中栈顶', () => {
    const stack = new NamespaceStack();
    const a0 = makeLayout('A', 0);
    const a1 = makeLayout('A', 1);
    const a2 = makeLayout('A', 2);
    stack.register('A', { layout: a0, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    stack.register('A', { layout: a1, irPath: ['children', 0, 'id'] });
    stack.pushFrame();
    stack.register('A', { layout: a2, irPath: ['children', 0, 'id'] });

    expect(stack.lookupReference('A')?.layout).toBe(a2);

    stack.popFrame();

    expect(stack.lookupReference('A')?.layout).toBe(a1);

    stack.popFrame();

    expect(stack.lookupReference('A')?.layout).toBe(a0);
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

    expect(stack.register('A', { layout: first, irPath: ['children', 0, 'id'] })).toBe(false);
    expect(stack.register('A', { layout: second, irPath: ['children', 0, 'id'] })).toBe(true);
    expect(stack.lookupReference('A')?.layout).toBe(second);
  });

  it('跨 frame 同 id 不算 overwritten（push frame 内首次 register 返回 false）', () => {
    const stack = new NamespaceStack();
    stack.register('A', { layout: makeLayout('A', 0), irPath: ['children', 0, 'id'] });
    stack.pushFrame();

    expect(stack.register('A', { layout: makeLayout('A', 10), irPath: ['children', 0, 'id'] })).toBe(false);
  });
});

describe('NamespaceStack onDuplicate 回调', () => {
  it('同 frame 第二次 register 触发回调，包含 id、frameDepth 和完整声明路径', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({
      onDuplicate: info => events.push(info),
    });
    stack.register('A', { layout: makeLayout('A', 0), irPath: ['children', 0, 'id'] });
    stack.register('A', { layout: makeLayout('A', 10), irPath: ['children', 1, 'id'] });

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
    stack.register('A', { layout: makeLayout('A'), irPath: ['children', 0, 'id'] });

    expect(cb).not.toHaveBeenCalled();
  });

  it('同 frame 多次注册提供完整独立路径快照', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.register('A', { layout: makeLayout('A', 0), irPath: ['p1'] });
    stack.register('A', { layout: makeLayout('A', 1), irPath: ['p2'] });
    stack.register('A', { layout: makeLayout('A', 2), irPath: ['p3'] });

    expect(events).toHaveLength(2);
    expect(events[0].duplicateIrPaths).toEqual([['p1'], ['p2']]);
    expect(events[1].duplicateIrPaths).toEqual([['p1'], ['p2'], ['p3']]);
    expect(events[0].namespace).toBe(events[1].namespace);
  });

  it('fork 隔离声明历史，提交时结合目标命名空间完整历史', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.register('A', { layout: makeLayout('A'), irPath: ['original'] });
    const baseline = stack.fork();
    const fork = baseline.fork();
    fork.register('A', { layout: makeLayout('A', 1), irPath: ['probe1'] });
    fork.register('A', { layout: makeLayout('A', 2), irPath: ['probe2'] });
    stack.register('A', { layout: makeLayout('A', 3), irPath: ['between'] });
    for (const change of fork.diffTopFrame(baseline)) stack.commitForkChange(change);
    expect(events.at(-1)?.duplicateIrPaths).toEqual([['original'], ['between'], ['probe1'], ['probe2']]);
    expect(stack.lookupReference('A')?.layout).toBe(fork.lookupReference('A')?.layout);
  });

  it('跨 frame 同 id 不触发 duplicate 回调', () => {
    const cb = vi.fn();
    const stack = new NamespaceStack({ onDuplicate: cb });
    stack.register('A', { layout: makeLayout('A'), irPath: ['root'] });
    stack.pushFrame();
    stack.register('A', { layout: makeLayout('A'), irPath: ['inner'] });

    expect(cb).not.toHaveBeenCalled();
  });

  it('frameDepth 反映栈中所处深度（push 后内层 duplicate = 1）', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.pushFrame();
    stack.register('A', { layout: makeLayout('A'), irPath: ['p1'] });
    stack.register('A', { layout: makeLayout('A'), irPath: ['p2'] });

    expect(events[0].frameDepth).toBe(1);
  });
});

describe('NamespaceStack resolving phase 禁止 register', () => {
  it('解析期间的命名空间堆栈寄存器', () => {
    const stack = new NamespaceStack();
    stack.register('A', { layout: makeLayout('A'), irPath: ['children', 0, 'id'] });
    stack.setPhase('resolving');

    expect(stack.lookupReference('A')?.layout).toBeDefined();
    expect(() => stack.register('B', { layout: makeLayout('B'), irPath: ['children', 0, 'id'] })).toThrow(
      /only allowed during registering/,
    );
  });
});

describe('NamespaceStack Scope placeholder 生命周期', () => {
  it('fork 保留祖先身份，匿名和同名 Scope 分配不同身份，投影及回放不丢失身份', () => {
    const stack = new NamespaceStack();
    const ancestorId = stack.enterScope('scope');
    stack.register('scope', {
      layout: makeLayout('scope'),
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
      layout: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId: childId,
    });
    fork.replacePublishedLayout(placeholder, makeLayout('scope', 10));
    expect(() => fork.lookupReference('scope')).toThrow(/ancestor Scope/);
    fork.replaceLayout('scope', makeLayout('scope', 20), 1, childId);
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
      layout: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId,
    });
    stack.leaveScope();

    expect(stack.lookupReference('scope')).toMatchObject({ layout: placeholder, state: 'scope-placeholder' });

    expect(stack.replaceLayout('scope', resolved, 0, scopeId)).toBe(true);
    expect(stack.lookupReference('scope')).toMatchObject({ layout: resolved, state: 'resolved' });
  });

  it('placeholder 被同 frame 的合法同名 layout 覆盖后不再回填旧 Scope', () => {
    const stack = new NamespaceStack();
    const placeholder = makeLayout('scope');
    const childWithSameId = makeLayout('scope', 10, 20);
    const resolvedScope = makeLayout('scope', 30, 40);

    const scopeId = stack.enterScope('scope');
    stack.register('scope', {
      layout: placeholder,
      irPath: ['children', 0, 'id'],
      state: 'scope-placeholder',
      scopeId,
    });
    stack.leaveScope();
    stack.register('scope', { layout: childWithSameId, irPath: ['children', 0, 'id'] });

    expect(stack.replaceLayout('scope', resolvedScope, 0, scopeId)).toBe(false);
    expect(stack.lookupReference('scope')).toEqual({
      layout: childWithSameId,
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
  stack.register('target', { layout: makeLayout('target', 10), irPath: ['children', 0, 'id'] });
  changed();
  stack.replaceLayout('target', makeLayout('target', 20), 0);
  changed();
  const fork = stack.fork();
  fork.register('other', { layout: makeLayout('other', 30), irPath: ['children', 0, 'id'] });
  expect(stack.lookupReference('other')?.layout).toBeUndefined();
  for (const change of fork.diffTopFrame(stack)) stack.commitForkChange(change);
  changed();
  expect(stack.lookupReference('other')?.layout).toBe(fork.lookupReference('other')?.layout);
  stack.pushFrame();
  changed();
  stack.popFrame();
  changed();
  stack.setPhase('resolving');
  changed();
});
