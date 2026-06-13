/**
 * ViewBoxSchema / SceneSchema.viewBox 校验测试
 * @description 覆盖 ViewBoxSchema 合法接受、退化拒绝（width/height ≤ 0、非 finite、缺字段、类型错），
 *   以及 SceneSchema 带 / 不带 viewBox 都能 parse、SceneSchema 内嵌的 viewBox 退化时被整体拒绝。
 *   viewBox 有值时覆盖自动算 layout、忽略 padding 等属于编译期运行时语义，见 compile 测试。
 */
import { describe, expect, it } from 'vitest';
import { type IRViewBox, SceneSchema, ViewBoxSchema } from '../../src';

describe('ViewBoxSchema 合法形态', () => {
  it('正常四字段视框被接受', () => {
    const parsed = ViewBoxSchema.safeParse({ x: -100, y: -100, width: 200, height: 200 });
    expect(parsed.success).toBe(true);
  });

  it('x / y 允许为负、为零', () => {
    expect(ViewBoxSchema.safeParse({ x: -50, y: 0, width: 10, height: 10 }).success).toBe(true);
    expect(ViewBoxSchema.safeParse({ x: 0, y: -50, width: 10, height: 10 }).success).toBe(true);
  });

  it('x / y / width / height 接受小数', () => {
    const parsed = ViewBoxSchema.safeParse({ x: -12.5, y: 3.25, width: 100.125, height: 50.5 });
    expect(parsed.success).toBe(true);
  });

  it('parse 通过的对象形态与 IRViewBox 同构（x/y/width/height）', () => {
    const value: IRViewBox = { x: -100, y: -100, width: 200, height: 200 };
    const parsed = ViewBoxSchema.parse(value);
    expect(parsed).toEqual({ x: -100, y: -100, width: 200, height: 200 });
  });
});

describe('ViewBoxSchema 拒绝退化 / 非法形态', () => {
  it('width = 0 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: 0, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('height = 0 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: 200, height: 0 });
    expect(parsed.success).toBe(false);
  });

  it('width 为负拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: -200, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('height 为负拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: 200, height: -200 });
    expect(parsed.success).toBe(false);
  });

  it('width = Infinity 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: Infinity, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('height = NaN 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: 200, height: NaN });
    expect(parsed.success).toBe(false);
  });

  it('x = -Infinity 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: -Infinity, y: 0, width: 200, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('y = NaN 拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: NaN, width: 200, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('缺 width 字段拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('缺 x 字段拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ y: 0, width: 200, height: 200 });
    expect(parsed.success).toBe(false);
  });

  it('width 为字符串拒绝', () => {
    const parsed = ViewBoxSchema.safeParse({ x: 0, y: 0, width: '200', height: 200 });
    expect(parsed.success).toBe(false);
  });
});

describe('SceneSchema 带 / 不带 viewBox', () => {
  it('不带 viewBox 的场景照常 parse（旧 IR 兼容）', () => {
    const parsed = SceneSchema.safeParse({
      version: 1,
      type: 'scene',
      children: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('带合法 viewBox 的场景 parse 通过', () => {
    const parsed = SceneSchema.safeParse({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0] }],
      viewBox: { x: -100, y: -100, width: 200, height: 200 },
    });
    expect(parsed.success).toBe(true);
  });

  it('parse 后 viewBox 字段值被保留', () => {
    const parsed = SceneSchema.parse({
      version: 1,
      type: 'scene',
      children: [],
      viewBox: { x: -100, y: -100, width: 200, height: 200 },
    });
    expect(parsed.viewBox).toEqual({ x: -100, y: -100, width: 200, height: 200 });
  });

  it('viewBox 缺省时 parse 结果不含该字段（undefined）', () => {
    const parsed = SceneSchema.parse({
      version: 1,
      type: 'scene',
      children: [],
    });
    expect(parsed.viewBox).toBeUndefined();
  });

  it('场景内嵌退化 viewBox（width = 0）整体被拒', () => {
    const parsed = SceneSchema.safeParse({
      version: 1,
      type: 'scene',
      children: [],
      viewBox: { x: 0, y: 0, width: 0, height: 200 },
    });
    expect(parsed.success).toBe(false);
  });

  it('场景内嵌非 finite viewBox（width = Infinity）整体被拒', () => {
    const parsed = SceneSchema.safeParse({
      version: 1,
      type: 'scene',
      children: [],
      viewBox: { x: 0, y: 0, width: Infinity, height: 200 },
    });
    expect(parsed.success).toBe(false);
  });

  it('带 viewBox 时 version 仍为 1（加可选字段非破坏）', () => {
    const parsed = SceneSchema.parse({
      version: 1,
      type: 'scene',
      children: [],
      viewBox: { x: -100, y: -100, width: 200, height: 200 },
    });
    expect(parsed.version).toBe(1);
  });
});
