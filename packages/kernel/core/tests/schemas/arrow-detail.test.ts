import { describe, expect, it } from 'vitest';

import { ArrowDetailSchema, ArrowEndDetailSchema, BuiltinArrowShape, PathSchema } from '../../src/schemas';

/**
 * ArrowDetailSchema schema-level 测试
 * @description 顶层 8 字段（shape/scale/length/width/color/fill/opacity/lineWidth）全 optional + start/end 子对象（同字段集，无递归）；compile/render merge 语义由 compile 测试覆盖
 */
describe('ArrowDetailSchema：字段合法 / optional', () => {
  it('内置箭头形状常量使用 BuiltinArrowShape 命名', () => {
    expect(BuiltinArrowShape.Stealth).toBe('stealth');
    expect(Object.values(BuiltinArrowShape)).toEqual(['normal', 'stealth']);
  });

  it('空对象合法', () => {
    expect(ArrowDetailSchema.safeParse({}).success).toBe(true);
  });

  it('全部 8 字段都填合法', () => {
    const ok = ArrowDetailSchema.safeParse({
      shape: 'stealth',
      scale: 1.5,
      length: 10,
      width: 8,
      color: 'red',
      fill: 'blue',
      opacity: 0.5,
      lineWidth: 2,
    });
    expect(ok.success).toBe(true);
  });

  it('start / end 子对象合法（与顶层共享同字段集）', () => {
    const ok = ArrowDetailSchema.safeParse({
      shape: 'normal',
      start: { shape: 'open', color: 'red' },
      end: { shape: 'stealth', scale: 2 },
    });
    expect(ok.success).toBe(true);
  });

  it('start 只填一个字段也合法（其余继承顶层 / 内置默认）', () => {
    const ok = ArrowDetailSchema.safeParse({ start: { color: 'red' } });
    expect(ok.success).toBe(true);
  });

  it('start 子对象不含 start/end 字段自身（不递归）', () => {
    const parsed = ArrowEndDetailSchema.safeParse({
      shape: 'normal',
      start: { shape: 'stealth' },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('PathSchema: arrow sugar is outside core IR', () => {
  it('rejects top-level arrow and arrowDetail fields', () => {
    const result = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'stealth' },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('ArrowDetailSchema：错误路径', () => {
  // shape 已开成开放字符串（z.string().min(1)）：任意非空名 schema 接受，
  // 未注册名的拒绝移到 compile 期（见 arrows/builtin-registry.test.ts 的 compile throw 用例）
  it('任意非空 shape 名 schema 接受（顶层）', () => {
    expect(ArrowDetailSchema.safeParse({ shape: 'unknown' }).success).toBe(true);
  });

  it('任意非空 shape 名 schema 接受（start 子对象）', () => {
    expect(ArrowDetailSchema.safeParse({ start: { shape: 'banana' } }).success).toBe(true);
  });

  it('空串 shape 拒绝（顶层，min(1)）', () => {
    expect(ArrowDetailSchema.safeParse({ shape: '' }).success).toBe(false);
  });

  it('空串 shape 拒绝（start 子对象，min(1)）', () => {
    expect(ArrowDetailSchema.safeParse({ start: { shape: '' } }).success).toBe(false);
  });

  it('scale 负数拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ scale: -1 }).success).toBe(false);
  });

  it('scale 0 拒绝（必须严格 > 0）', () => {
    expect(ArrowDetailSchema.safeParse({ scale: 0 }).success).toBe(false);
  });

  it('length / width 负数拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ length: -5 }).success).toBe(false);
    expect(ArrowDetailSchema.safeParse({ width: -5 }).success).toBe(false);
  });

  it('opacity > 1 拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ opacity: 1.5 }).success).toBe(false);
  });

  it('opacity < 0 拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ opacity: -0.1 }).success).toBe(false);
  });

  it('lineWidth 负数拒绝', () => {
    expect(ArrowDetailSchema.safeParse({ lineWidth: -1 }).success).toBe(false);
  });

  it('end 子对象的 opacity > 1 也拒绝（继承顶层 schema 限制）', () => {
    expect(ArrowDetailSchema.safeParse({ end: { opacity: 2 } }).success).toBe(false);
  });

  it('未知字段拒绝：顶层 typo 不被静默剥离', () => {
    expect(ArrowDetailSchema.safeParse({ shape: 'stealth', lenght: 10 }).success).toBe(false);
  });

  it('未知字段拒绝：start/end 子对象 typo 不被静默剥离', () => {
    expect(ArrowDetailSchema.safeParse({ start: { shape: 'stealth', lenght: 10 } }).success).toBe(false);
    expect(ArrowDetailSchema.safeParse({ end: { shape: 'stealth', opacityy: 0.4 } }).success).toBe(false);
  });
});

describe('PathSchema：arrowDetail 嵌入 + arrowShape 删除', () => {
  it('PathSchema 接受 arrowDetail', () => {
    const ok = PathSchema.safeParse({
      type: 'path',
      marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', scale: 1.5 } }],
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('PathSchema strict：未知字段（如已删除的 arrowShape）被拒，不静默吞', () => {
    // PathSchema 现为 .strict()：未知 / 拼错 / 已删除字段直接校验失败，与 NodeSchema 一致
    const result = PathSchema.safeParse({
      type: 'path',
      arrowShape: 'stealth',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });
    expect(result.success).toBe(false);
  });
});
