import { describe, expect, it, vi } from 'vitest';

import type { DuplicateRegisterInfo } from '../../src/compile/namespace';
import { NamespaceStack } from '../../src/compile/namespace';
import type { CompiledNodeLayout } from '../../src/compile/node';
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
    stack.register('same', makeLayout('same'));
    const fork = stack.fork();
    fork.register('same', makeLayout('same', 20));
    expect(stack.identity).toBe(root);
    expect(fork.identity).toBe(root);
    expect(stack.lookupEntry('same')?.layout.geometry.rect.x).toBe(0);

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
    stack.register('A', layout);

    expect(stack.lookupEntry('A')?.layout).toBe(layout);
  });

  it('lookup 未注册 id 返回 undefined', () => {
    const stack = new NamespaceStack();

    expect(stack.lookupEntry('ghost')?.layout).toBeUndefined();
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
    stack.register('A', inner);

    expect(stack.lookupEntry('A')?.layout).toBe(inner);

    stack.popFrame();

    expect(stack.depth).toBe(1);
    expect(stack.lookupEntry('A')?.layout).toBeUndefined();
  });

  it('外层 register 后 push frame，外层 id 在内层仍可见（inside-out 落到外层 frame）', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('outer', 1);
    stack.register('outer', outer);
    stack.pushFrame();

    expect(stack.lookupEntry('outer')?.layout).toBe(outer);
  });
});

describe('NamespaceStack 由内而外的阴影', () => {
  it('名称堆栈查找由内而外的阴影', () => {
    const stack = new NamespaceStack();
    const outer = makeLayout('A', 0);
    stack.register('A', outer);
    stack.pushFrame();
    const inner = makeLayout('A', 50);
    stack.register('A', inner);

    expect(stack.lookupEntry('A')?.layout).toBe(inner);

    stack.popFrame();

    expect(stack.lookupEntry('A')?.layout).toBe(outer);
  });

  it('三层嵌套各自有 id="A" 时 lookup 命中栈顶', () => {
    const stack = new NamespaceStack();
    const a0 = makeLayout('A', 0);
    const a1 = makeLayout('A', 1);
    const a2 = makeLayout('A', 2);
    stack.register('A', a0);
    stack.pushFrame();
    stack.register('A', a1);
    stack.pushFrame();
    stack.register('A', a2);

    expect(stack.lookupEntry('A')?.layout).toBe(a2);

    stack.popFrame();

    expect(stack.lookupEntry('A')?.layout).toBe(a1);

    stack.popFrame();

    expect(stack.lookupEntry('A')?.layout).toBe(a0);
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

    expect(stack.register('A', first)).toBe(false);
    expect(stack.register('A', second)).toBe(true);
    expect(stack.lookupEntry('A')?.layout).toBe(second);
  });

  it('跨 frame 同 id 不算 overwritten（push frame 内首次 register 返回 false）', () => {
    const stack = new NamespaceStack();
    stack.register('A', makeLayout('A', 0));
    stack.pushFrame();

    expect(stack.register('A', makeLayout('A', 10))).toBe(false);
  });
});

describe('NamespaceStack onDuplicate 回调', () => {
  it('同 frame 第二次 register 触发回调，含 id + frameDepth + 双 irPath', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({
      onDuplicate: info => events.push(info),
    });
    stack.register('A', makeLayout('A', 0), ['children', 0, 'id']);
    stack.register('A', makeLayout('A', 10), ['children', 1, 'id']);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('A');
    expect(events[0].frameDepth).toBe(0);
    expect(events[0].firstIrPath).toEqual(['children', 0, 'id']);
    expect(events[0].secondIrPath).toEqual(['children', 1, 'id']);
  });

  it('首次 register 不触发回调', () => {
    const cb = vi.fn();
    const stack = new NamespaceStack({ onDuplicate: cb });
    stack.register('A', makeLayout('A'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('同 frame 三次 register 触发两次回调（不合并），各自携带前一次 irPath', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.register('A', makeLayout('A', 0), ['p1']);
    stack.register('A', makeLayout('A', 1), ['p2']);
    stack.register('A', makeLayout('A', 2), ['p3']);

    expect(events).toHaveLength(2);
    expect(events[0].secondIrPath).toEqual(['p2']);
    expect(events[1].secondIrPath).toEqual(['p3']);

    // 第二次 duplicate 时 firstIrPath 仍指向最初 register 的 p1（locator 不被中间覆盖污染）
    expect(events[0].firstIrPath).toEqual(['p1']);
    expect(events[1].firstIrPath).toEqual(['p1']);
  });

  it('跨 frame 同 id 不触发 duplicate 回调', () => {
    const cb = vi.fn();
    const stack = new NamespaceStack({ onDuplicate: cb });
    stack.register('A', makeLayout('A'), ['root']);
    stack.pushFrame();
    stack.register('A', makeLayout('A'), ['inner']);

    expect(cb).not.toHaveBeenCalled();
  });

  it('frameDepth 反映栈中所处深度（push 后内层 duplicate = 1）', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NamespaceStack({ onDuplicate: info => events.push(info) });
    stack.pushFrame();
    stack.register('A', makeLayout('A'), ['p1']);
    stack.register('A', makeLayout('A'), ['p2']);

    expect(events[0].frameDepth).toBe(1);
  });
});

describe('NamespaceStack resolving phase 禁止 register', () => {
  it('解析期间的命名空间堆栈寄存器', () => {
    const stack = new NamespaceStack();
    stack.register('A', makeLayout('A'));
    stack.enterResolvingPhase();

    expect(stack.lookupEntry('A')?.layout).toBeDefined();
    expect(() => stack.register('B', makeLayout('B'))).toThrow(/only allowed during registering/);
  });
});

describe('NamespaceStack Scope placeholder 生命周期', () => {
  it('lookupEntry 区分 placeholder 与合法 resolved 零尺寸 layout', () => {
    const stack = new NamespaceStack();
    const placeholder = makeLayout('scope');
    const resolved = makeLayout('scope');

    stack.register('scope', placeholder, undefined, 'scope-placeholder');

    expect(stack.lookupEntry('scope')).toMatchObject({ layout: placeholder, state: 'scope-placeholder' });

    expect(stack.replaceLayout('scope', resolved, 0, placeholder)).toBe(true);
    expect(stack.lookupEntry('scope')).toMatchObject({ layout: resolved, state: 'resolved' });
  });

  it('placeholder 被同 frame 的合法同名 layout 覆盖后不再回填旧 Scope', () => {
    const stack = new NamespaceStack();
    const placeholder = makeLayout('scope');
    const childWithSameId = makeLayout('scope', 10, 20);
    const resolvedScope = makeLayout('scope', 30, 40);

    stack.register('scope', placeholder, undefined, 'scope-placeholder');
    stack.register('scope', childWithSameId);

    expect(stack.replaceLayout('scope', resolvedScope, 0, placeholder)).toBe(false);
    expect(stack.lookupEntry('scope')).toEqual({ layout: childWithSameId, state: 'resolved' });
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
  stack.register('target', makeLayout('target', 10));
  changed();
  stack.replaceLayout('target', makeLayout('target', 20), 0);
  changed();
  const fork = stack.fork();
  fork.register('other', makeLayout('other', 30));
  expect(stack.lookupEntry('other')?.layout).toBeUndefined();
  for (const change of fork.diffTopFrame(stack)) stack.commitForkChange(change);
  changed();
  expect(stack.lookupEntry('other')?.layout).toBe(fork.lookupEntry('other')?.layout);
  stack.pushFrame();
  changed();
  stack.popFrame();
  changed();
  stack.enterResolvingPhase();
  changed();
});
