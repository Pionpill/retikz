import { describe, expect, it } from 'vitest';
import {
  ArrowDetailSchema,
  ArrowEndDetailSchema,
  PathSchema,
} from '../../src/ir';

/**
 * ArrowDetailSchema schema-level 测试
 * @description 顶层 8 字段（shape/scale/length/width/color/fill/opacity/lineWidth）全 optional + start/end 子对象（同字段集，无递归）；compile/render merge 语义由 compile 测试覆盖
 */
describe('ArrowDetailSchema：字段合法 / optional', () => {
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
    // ArrowEndDetailSchema 不含 start / end —— 写了直接被 zod 删（strict 才会拒；当前用 strip）
    // 这里保证 schema 能 parse + 字段不被保留
    const parsed = ArrowEndDetailSchema.parse({
      shape: 'normal',
      start: { shape: 'stealth' },
    } as Record<string, unknown>);
    expect((parsed as Record<string, unknown>).start).toBeUndefined();
  });
});

describe('ArrowDetailSchema：错误路径', () => {
  it("未知 shape 拒绝（顶层）", () => {
    expect(
      ArrowDetailSchema.safeParse({ shape: 'unknown' }).success,
    ).toBe(false);
  });

  it("未知 shape 拒绝（start 子对象）", () => {
    expect(
      ArrowDetailSchema.safeParse({ start: { shape: 'banana' } }).success,
    ).toBe(false);
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
    expect(
      ArrowDetailSchema.safeParse({ end: { opacity: 2 } }).success,
    ).toBe(false);
  });
});

describe('PathSchema：arrowDetail 嵌入 + arrowShape 删除', () => {
  it("PathSchema 接受 arrowDetail", () => {
    const ok = PathSchema.safeParse({
      type: 'path',
      arrow: '->',
      arrowDetail: { shape: 'stealth', scale: 1.5 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("PathSchema 不再持有 arrowShape 字段（删字段、不静默吞）", () => {
    // strict 模式下 arrowShape 会被拒；当前默认 strip 模式下字段被忽略但不进入 parsed
    const parsed = PathSchema.parse({
      type: 'path',
      arrowShape: 'stealth',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    } as Record<string, unknown>);
    expect((parsed as Record<string, unknown>).arrowShape).toBeUndefined();
  });
});
