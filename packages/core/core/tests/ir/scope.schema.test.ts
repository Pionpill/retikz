/**
 * ScopeSchema / TransformSchema 校验测试
 * @description 覆盖 scope schema 合法 / 嵌套 / 字段拒绝、6 个 transform 变体的必填字段拒绝；
 *   localNamespace 隔离、duplicate id warn、scope.id bbox、scope 下相对 position 等行为属于 schema 之外的运行时语义，留待后续实现
 */
import { describe, expect, it } from 'vitest';
import { ChildSchema, ScopeSchema, TransformSchema } from '../../src/ir';

describe('ScopeSchema 合法形态', () => {
  it('最简 scope：仅 children 空数组', () => {
    const parsed = ScopeSchema.safeParse({ type: 'scope', children: [] });
    expect(parsed.success).toBe(true);
  });

  it('scope 含 node child', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      children: [{ type: 'node', position: [0, 0] }],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 嵌套 scope', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 10, y: 0 }],
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 45 }],
          children: [{ type: 'node', position: [0, 0] }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 允许 transforms 为空数组', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      transforms: [],
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 允许 transforms 完全缺省', () => {
    const parsed = ScopeSchema.safeParse({ type: 'scope', children: [] });
    expect(parsed.success).toBe(true);
  });

  it('scope 接受 id 字段', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      id: 'cluster',
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 接受 localNamespace 字段', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      localNamespace: true,
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('scope 接受 boundingShape 字段且值得以保留', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      id: 's',
      boundingShape: 'circle',
      children: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.boundingShape).toBe('circle');
    }
  });

  it('scope 接受 boundingShape="rectangle"', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      id: 's',
      boundingShape: 'rectangle',
      children: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.boundingShape).toBe('rectangle');
    }
  });

  it('scope 缺省 boundingShape 仍合法且字段为 undefined', () => {
    const parsed = ScopeSchema.safeParse({ type: 'scope', children: [] });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.boundingShape).toBeUndefined();
    }
  });
});

describe('ScopeSchema 拒绝非法形态', () => {
  it('缺失 children 字段拒绝', () => {
    const parsed = ScopeSchema.safeParse({ type: 'scope' });
    expect(parsed.success).toBe(false);
  });

  it('id 为空串拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      id: '',
      children: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('localNamespace 为字符串 "true" 拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      localNamespace: 'true',
      children: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('transforms 含未知 kind 拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      transforms: [{ kind: 'unknown', x: 1, y: 2 }],
      children: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('children 中含未知 type 拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      children: [{ type: 'bogus', foo: 1 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('boundingShape 为非字符串（数字）拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      boundingShape: 123,
      children: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('boundingShape 为枚举外字符串（polygon）拒绝', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      boundingShape: 'polygon',
      children: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('boundingShape 为 ShapeRef 对象形态拒绝（已收敛为枚举，不再接受 { type, params }）', () => {
    const parsed = ScopeSchema.safeParse({
      type: 'scope',
      boundingShape: { type: 'circle' },
      children: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('ChildSchema discriminated union 含 scope', () => {
  it('scope 可作为 ChildSchema 成员', () => {
    const parsed = ChildSchema.safeParse({
      type: 'scope',
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('node / path / coordinate 兼容性维持', () => {
    expect(
      ChildSchema.safeParse({ type: 'node', position: [0, 0] }).success,
    ).toBe(true);
    expect(
      ChildSchema.safeParse({ type: 'coordinate', id: 'A', position: [0, 0] }).success,
    ).toBe(true);
  });
});

describe('TransformSchema 各变体合法形态', () => {
  it('translate', () => {
    const parsed = TransformSchema.safeParse({ kind: 'translate', x: 5, y: 3 });
    expect(parsed.success).toBe(true);
  });

  it('polar-translate 不带 origin', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'polar-translate',
      angle: 30,
      radius: 50,
    });
    expect(parsed.success).toBe(true);
  });

  it('polar-translate origin 为 string', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'polar-translate',
      origin: 'A',
      angle: 0,
      radius: 30,
    });
    expect(parsed.success).toBe(true);
  });

  it('polar-translate origin 为笛卡尔', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'polar-translate',
      origin: [10, 5],
      angle: 90,
      radius: 20,
    });
    expect(parsed.success).toBe(true);
  });

  it('at-translate 含 distance', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'at-translate',
      direction: 'right',
      of: 'A',
      distance: 20,
    });
    expect(parsed.success).toBe(true);
  });

  it('at-translate 缺省 distance', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'at-translate',
      direction: 'above',
      of: 'A',
    });
    expect(parsed.success).toBe(true);
  });

  it('offset-translate of=string 含 offset', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'offset-translate',
      of: 'A',
      offset: [10, 5],
    });
    expect(parsed.success).toBe(true);
  });

  it('offset-translate of=笛卡尔 缺省 offset', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'offset-translate',
      of: [50, 50],
    });
    expect(parsed.success).toBe(true);
  });

  it('between-translate 含两个端点和比例', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'between-translate',
      between: [[0, 0], { id: 'B' }],
      t: 0.5,
    });
    expect(parsed.success).toBe(true);
  });

  it('rotate 含 cx/cy', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'rotate',
      degrees: 45,
      cx: 10,
      cy: 5,
    });
    expect(parsed.success).toBe(true);
  });

  it('rotate 缺省 cx/cy', () => {
    const parsed = TransformSchema.safeParse({ kind: 'rotate', degrees: 90 });
    expect(parsed.success).toBe(true);
  });

  it('scale 含 y', () => {
    const parsed = TransformSchema.safeParse({ kind: 'scale', x: 2, y: 3 });
    expect(parsed.success).toBe(true);
  });

  it('scale 缺省 y', () => {
    const parsed = TransformSchema.safeParse({ kind: 'scale', x: 2 });
    expect(parsed.success).toBe(true);
  });
});

describe('TransformSchema 各变体拒绝缺字段', () => {
  it('translate 缺 y 拒绝', () => {
    const parsed = TransformSchema.safeParse({ kind: 'translate', x: 5 });
    expect(parsed.success).toBe(false);
  });

  it('polar-translate 缺 angle 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'polar-translate',
      radius: 50,
    });
    expect(parsed.success).toBe(false);
  });

  it('polar-translate 缺 radius 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'polar-translate',
      angle: 30,
    });
    expect(parsed.success).toBe(false);
  });

  it('at-translate 缺 of 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'at-translate',
      direction: 'right',
    });
    expect(parsed.success).toBe(false);
  });

  it('at-translate 缺 direction 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'at-translate',
      of: 'A',
    });
    expect(parsed.success).toBe(false);
  });

  it("at-translate direction='diagonal' 不在枚举内拒绝", () => {
    const parsed = TransformSchema.safeParse({
      kind: 'at-translate',
      direction: 'diagonal',
      of: 'A',
    });
    expect(parsed.success).toBe(false);
  });

  it('offset-translate 缺 of 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'offset-translate',
      offset: [10, 0],
    });
    expect(parsed.success).toBe(false);
  });

  it('offset-translate offset 为三元组拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'offset-translate',
      of: 'A',
      offset: [1, 2, 3],
    });
    expect(parsed.success).toBe(false);
  });

  it('between-translate 缺 t 拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'between-translate',
      between: [[0, 0], [10, 0]],
    });
    expect(parsed.success).toBe(false);
  });

  it('between-translate t 越界拒绝', () => {
    const parsed = TransformSchema.safeParse({
      kind: 'between-translate',
      between: [[0, 0], [10, 0]],
      t: 1.5,
    });
    expect(parsed.success).toBe(false);
  });

  it('rotate 缺 degrees 拒绝', () => {
    const parsed = TransformSchema.safeParse({ kind: 'rotate' });
    expect(parsed.success).toBe(false);
  });

  it('scale 缺 x 拒绝', () => {
    const parsed = TransformSchema.safeParse({ kind: 'scale' });
    expect(parsed.success).toBe(false);
  });
});
