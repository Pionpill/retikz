import { describe, expect, it } from 'vitest';

import { ArrowDetailSchema, ArrowStyleSchema, BuiltinArrowShape, PathSchema } from '../../src/schemas';

/**
 * ArrowDetailSchema schema-level 测试
 * @description 顶层 8 字段（shape/scale/length/width/color/fill/opacity/lineWidth）全 optional + start/end 子对象（同字段集，无递归）；compile/render merge 语义由 compile 测试覆盖
 */
describe('ArrowDetailSchema：字段合法 / optional', () => {
  it('接受从 Path master 派生的数值 color 与从 arrow color 派生的数值 fill', () => {
    expect(ArrowDetailSchema.safeParse({ color: 0.9, fill: 0.2, end: { color: 0.8, fill: 0.1 } }).success).toBe(true);
  });
  it('内置箭头形状常量使用 BuiltinArrowShape 命名', () => {
    expect(BuiltinArrowShape.Stealth).toBe('stealth');
    expect(Object.values(BuiltinArrowShape)).toEqual([
      'normal',
      'open',
      'stealth',
      'openStealth',
      'circle',
      'openCircle',
    ]);
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
    const parsed = ArrowStyleSchema.safeParse({
      shape: 'normal',
      start: { shape: 'stealth' },
    });

    expect(parsed.success).toBe(false);
  });
});

describe('PathSchema：箭头糖在外核 IR', () => {
  it('拒绝字符串箭头糖和未知 arrowDetail 字段', () => {
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

describe('ArrowDetailSchema：开放名称与值域边界', () => {
  // shape 已开成开放字符串（NonBlankStringSchema）：任意非空白名 schema 接受，
  // 未注册名由 provider lookup 诊断
  it('任意非空白 shape 名 schema 接受（顶层）', () => {
    expect(ArrowDetailSchema.safeParse({ shape: 'unknown' }).success).toBe(true);
  });

  it('任意非空白 shape 名 schema 接受（start 子对象）', () => {
    expect(ArrowDetailSchema.safeParse({ start: { shape: 'banana' } }).success).toBe(true);
  });

  it.each(['', '   '])('空白 shape %j 拒绝（顶层）', shape => {
    expect(ArrowDetailSchema.safeParse({ shape }).success).toBe(false);
  });

  it.each(['', '   '])('空白 shape %j 拒绝（start 子对象）', shape => {
    expect(ArrowDetailSchema.safeParse({ start: { shape } }).success).toBe(false);
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

describe('PathSchema：对象箭头与闭合字段', () => {
  it('PathSchema 保留对象箭头', () => {
    const ok = PathSchema.safeParse({
      type: 'path',
      arrow: { end: { shape: 'stealth', scale: 1.5 } },
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
