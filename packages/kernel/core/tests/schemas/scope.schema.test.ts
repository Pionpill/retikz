import { describe, expect, it } from 'vitest';

import {
  ChildSchema,
  ScopeSchema,
  NodeSchema,
  ClipSchema,
  NodeDefaultSchema,
  NodeLabelDefaultSchema,
  PathDefaultSchema,
} from '../../src/schemas';

describe('Scope 递归子项接线', () => {
  it('总入口递归解析内核与组合子项，并保留扩展负载', () => {
    const children = [
      { type: 'node', position: [0, 0] },
      { type: 'path', kind: 'custom', kindOptions: { weight: 2 } },
      { type: 'coordinate', id: 'A', position: [1, 2] },
      { namespace: 'example', type: 'badge', extra: { text: 'kept' } },
    ];
    const source = { type: 'scope', position: [0, 0], children: [{ type: 'scope', position: [0, 0], children }] };
    expect(ChildSchema.parse(source)).toEqual(source);
  });

  it('递归解析仍拒绝更深层子项中的非法定位', () => {
    const result = ScopeSchema.safeParse({
      type: 'scope',
      children: [{ type: 'scope', children: [{ type: 'node', position: [0, Infinity] }] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('ClipSchema 合法形态', () => {
  it('自定义参数内的 kind 不覆盖外层注册身份', () => {
    const source = { kind: 'custom', params: { kind: 'payload-kind', nested: { values: [1, null, true] } } };
    expect(ClipSchema.parse(source)).toEqual(source);
  });
});

describe('ClipSchema 退化 / 非法形态拒绝', () => {
  it('内置矩形不能通过开放裁剪分支绕过参数校验', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', params: { x: 0, y: 0, width: -5, height: 30 } });

    expect(parsed.success).toBe(false);
  });
});

describe('默认通道的稀疏派生', () => {
  it('已有标签和箭头配置不提前物化继承字段或创建实例内容', () => {
    const node = { label: { pin: false } };
    const path = { label: { interrupt: false }, arrow: { end: { fill: 0 } } };
    expect(NodeDefaultSchema.parse(node)).toEqual(node);
    expect(PathDefaultSchema.parse(path)).toEqual(path);
    expect(NodeLabelDefaultSchema.parse({})).toEqual({});
    expect(NodeSchema.parse({ type: 'node', label: { text: 'label' } }).label).toEqual({ text: 'label' });
  });

  it('派生的标签默认仍执行 inside 与 pin 的互斥约束', () => {
    const invalid = { placement: 'inside', pin: true };
    expect(NodeLabelDefaultSchema.safeParse(invalid).success).toBe(false);
    expect(NodeDefaultSchema.safeParse({ label: invalid }).success).toBe(false);
    expect(NodeDefaultSchema.parse({ label: { ...invalid, pin: false } })).toEqual({
      label: { placement: 'inside', pin: false },
    });
  });
});
