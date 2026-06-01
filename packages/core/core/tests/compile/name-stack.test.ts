/**
 * NameStack 单元测试
 * @description 覆盖 register / lookup 基本行为、push/pop frame 隔离、inside-out shadowing、duplicate 回调 + last-wins、register 返回 boolean、pop 根 frame 防御性 throw、Pass 2 phase 禁止 register
 */
import { describe, expect, it, vi } from 'vitest';
import { type DuplicateRegisterInfo, NameStack } from '../../src/compile/name-stack';
import type { NodeLayout } from '../../src/compile/node';
import { BUILTIN_SHAPES } from '../../src/shapes';

const makeLayout = (id: string, x = 0, y = 0): NodeLayout => ({
  id,
  shapeName: 'rectangle',
  shapeDef: BUILTIN_SHAPES.rectangle,
  rect: { x, y, width: 0, height: 0, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
});

describe('NameStack 基本 register / lookup', () => {
  it('name_stack_basic_register_lookup', () => {
    const stack = new NameStack();
    const layout = makeLayout('A', 10, 20);
    stack.register('A', layout);
    expect(stack.lookup('A')).toBe(layout);
  });

  it('lookup 未注册 id 返回 undefined', () => {
    const stack = new NameStack();
    expect(stack.lookup('ghost')).toBeUndefined();
  });

  it('构造后初始 depth = 1（根 frame 存在）', () => {
    const stack = new NameStack();
    expect(stack.depth).toBe(1);
  });
});

describe('NameStack push / pop frame 隔离', () => {
  it('name_stack_push_pop_frame_isolated', () => {
    const stack = new NameStack();
    stack.pushFrame();
    expect(stack.depth).toBe(2);
    const inner = makeLayout('A', 100);
    stack.register('A', inner);
    expect(stack.lookup('A')).toBe(inner);
    stack.popFrame();
    expect(stack.depth).toBe(1);
    expect(stack.lookup('A')).toBeUndefined();
  });

  it('外层 register 后 push frame，外层 id 在内层仍可见（inside-out 落到外层 frame）', () => {
    const stack = new NameStack();
    const outer = makeLayout('outer', 1);
    stack.register('outer', outer);
    stack.pushFrame();
    expect(stack.lookup('outer')).toBe(outer);
  });
});

describe('NameStack inside-out shadowing', () => {
  it('name_stack_lookup_inside_out_shadowing', () => {
    const stack = new NameStack();
    const outer = makeLayout('A', 0);
    stack.register('A', outer);
    stack.pushFrame();
    const inner = makeLayout('A', 50);
    stack.register('A', inner);
    expect(stack.lookup('A')).toBe(inner);
    stack.popFrame();
    expect(stack.lookup('A')).toBe(outer);
  });

  it('三层嵌套各自有 id="A" 时 lookup 命中栈顶', () => {
    const stack = new NameStack();
    const a0 = makeLayout('A', 0);
    const a1 = makeLayout('A', 1);
    const a2 = makeLayout('A', 2);
    stack.register('A', a0);
    stack.pushFrame();
    stack.register('A', a1);
    stack.pushFrame();
    stack.register('A', a2);
    expect(stack.lookup('A')).toBe(a2);
    stack.popFrame();
    expect(stack.lookup('A')).toBe(a1);
    stack.popFrame();
    expect(stack.lookup('A')).toBe(a0);
  });
});

describe('NameStack pop 根 frame 防御性 throw', () => {
  it('name_stack_pop_empty_throws', () => {
    const stack = new NameStack();
    expect(() => stack.popFrame()).toThrow(/cannot pop the root frame/);
  });

  it('多次 push/pop 配平后再 pop 一次抛错', () => {
    const stack = new NameStack();
    stack.pushFrame();
    stack.pushFrame();
    stack.popFrame();
    stack.popFrame();
    expect(() => stack.popFrame()).toThrow(/cannot pop the root frame/);
  });
});

describe('NameStack register 返回 overwritten flag', () => {
  it('name_stack_register_returns_overwritten_flag', () => {
    const stack = new NameStack();
    const first = makeLayout('A', 0);
    const second = makeLayout('A', 10);
    expect(stack.register('A', first)).toBe(false);
    expect(stack.register('A', second)).toBe(true);
    expect(stack.lookup('A')).toBe(second);
  });

  it('跨 frame 同 id 不算 overwritten（push frame 内首次 register 返回 false）', () => {
    const stack = new NameStack();
    stack.register('A', makeLayout('A', 0));
    stack.pushFrame();
    expect(stack.register('A', makeLayout('A', 10))).toBe(false);
  });
});

describe('NameStack onDuplicate 回调', () => {
  it('同 frame 第二次 register 触发回调，含 id + frameDepth + 双 irPath', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NameStack({
      onDuplicate: info => events.push(info),
    });
    stack.register('A', makeLayout('A', 0), 'children[0].node.id');
    stack.register('A', makeLayout('A', 10), 'children[1].node.id');
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('A');
    expect(events[0].frameDepth).toBe(0);
    expect(events[0].firstIrPath).toBe('children[0].node.id');
    expect(events[0].secondIrPath).toBe('children[1].node.id');
  });

  it('首次 register 不触发回调', () => {
    const cb = vi.fn();
    const stack = new NameStack({ onDuplicate: cb });
    stack.register('A', makeLayout('A'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('同 frame 三次 register 触发两次回调（不合并），各自携带前一次 irPath', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NameStack({ onDuplicate: info => events.push(info) });
    stack.register('A', makeLayout('A', 0), 'p1');
    stack.register('A', makeLayout('A', 1), 'p2');
    stack.register('A', makeLayout('A', 2), 'p3');
    expect(events).toHaveLength(2);
    expect(events[0].secondIrPath).toBe('p2');
    expect(events[1].secondIrPath).toBe('p3');
    // 第二次 duplicate 时 firstIrPath 仍指向最初 register 的 p1（locator 不被中间覆盖污染）
    expect(events[0].firstIrPath).toBe('p1');
    expect(events[1].firstIrPath).toBe('p1');
  });

  it('跨 frame 同 id 不触发 duplicate 回调', () => {
    const cb = vi.fn();
    const stack = new NameStack({ onDuplicate: cb });
    stack.register('A', makeLayout('A'), 'root');
    stack.pushFrame();
    stack.register('A', makeLayout('A'), 'inner');
    expect(cb).not.toHaveBeenCalled();
  });

  it('frameDepth 反映栈中所处深度（push 后内层 duplicate = 1）', () => {
    const events: Array<DuplicateRegisterInfo> = [];
    const stack = new NameStack({ onDuplicate: info => events.push(info) });
    stack.pushFrame();
    stack.register('A', makeLayout('A'), 'p1');
    stack.register('A', makeLayout('A'), 'p2');
    expect(events[0].frameDepth).toBe(1);
  });
});

describe('NameStack Pass 2 phase 禁止 register', () => {
  it('name_stack_register_during_layout_pass2', () => {
    const stack = new NameStack();
    stack.register('A', makeLayout('A'));
    stack.enterLookupPhase();
    expect(stack.phase).toBe('pass2');
    expect(stack.lookup('A')).toBeDefined();
    expect(() => stack.register('B', makeLayout('B'))).toThrow(/only allowed during pass1/);
  });
});
