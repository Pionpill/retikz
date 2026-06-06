/**
 * rectangle shape —— cornerRadius 从 Node 顶层迁入 params 测试
 * @description 覆盖：
 *   - params.cornerRadius → 圆角矩形（emit RectPrim 带 cornerRadius）；
 *   - strictObject 拒多余字段；
 *   - 顶层 Node.cornerRadius 迁移期仍生效（无 params 时回退）；
 *   - params.cornerRadius 与顶层并存 → params 优先；
 *   - scaleParams：cornerRadius 是长度，随 node scale 协同缩放。
 *
 *   迁移期约定：params.cornerRadius 优先；顶层 Node.cornerRadius 仍生效（回退、建议改写 params 内）。
 *   顶层↔params 优先级在 compile（emit 读 params.cornerRadius ?? style.cornerRadius）——
 *   `rectangle_rounded_toplevel_compat` / `rectangle_params_over_toplevel` 依赖 emit 优先级落地。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import { rectangle } from '../../src/shapes';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const rectNode = (extra: Record<string, unknown> = {}): IR['children'][number] => ({
  type: 'node',
  id: 'r',
  position: [0, 0],
  text: 'A',
  ...extra,
});

// ─────────────────────────── Happy path ───────────────────────────

describe('rectangle — cornerRadius 入 params', () => {
  it('rectangle_rounded_from_params：{type:"rectangle", params:{cornerRadius:6}} → 圆角矩形（cornerRadius=6）', () => {
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { cornerRadius: 6 } } })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(6);
  });

  it('rectangle_rounded_zero_sharp：params.cornerRadius:0 → 直角（cornerRadius=0）', () => {
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { cornerRadius: 0 } } })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(0);
  });
});

// ─────────────────────────── 错误路径 ───────────────────────────

describe('rectangle — 错误路径（strictObject）', () => {
  it('rectangle_extra_params_rejected：{type:"rectangle", params:{foo:1}} → strictObject reject（编译期 throw）', () => {
    const ir = scene([rectNode({ shape: { type: 'rectangle', params: { foo: 1 } } })]);
    expect(() => compileToScene(ir)).toThrow();
    // 裸 schema 同样拒
    expect(() => rectangle.paramsSchema.parse({ foo: 1 })).toThrow();
  });

  it('rectangle_negative_rounded_rejected：cornerRadius:-3 → nonnegative() reject', () => {
    expect(() => rectangle.paramsSchema.parse({ cornerRadius: -3 })).toThrow();
  });
});

// ─────────────────────────── 迁移期兼容（顶层 ↔ params 优先级）───────────────────────────

describe('rectangle — 顶层 cornerRadius 迁移期兼容', () => {
  it('rectangle_rounded_toplevel_compat：顶层 cornerRadius 无 params 时仍生效', () => {
    // 迁移期：未给 params.cornerRadius 时，顶层 Node.cornerRadius 仍画圆角（回退）。
    const compiled = compileToScene(scene([rectNode({ cornerRadius: 5 })]));
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(5);
  });

  it('rectangle_params_over_toplevel：params.cornerRadius 与顶层并存 → params 优先', () => {
    const compiled = compileToScene(
      scene([rectNode({ cornerRadius: 5, shape: { type: 'rectangle', params: { cornerRadius: 9 } } })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(9);
  });
});

// ─────────────────────────── round-trip + scaleParams ───────────────────────────

describe('rectangle — round-trip / scaleParams', () => {
  it('roundtrip_nested_params：含 rectangle {cornerRadius} 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'r',
      position: [0, 0],
      shape: { type: 'rectangle', params: { cornerRadius: 6 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({ type: 'rectangle', params: { cornerRadius: 6 } });
  });

  it('ShapeRefSchema 解析 rectangle cornerRadius params', () => {
    const ref = { type: 'rectangle', params: { cornerRadius: 4 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });

  it('rectangle_rounded_scaled：node scale=2 → cornerRadius 随长度协同 ×2', () => {
    // cornerRadius 是长度（与半径同性），scaleParams 用 uniform 几何均值因子缩放。
    expect(rectangle.scaleParams!({ cornerRadius: 6 }, 2, 2)).toEqual({ cornerRadius: 12 });
    // 无 cornerRadius 时 scaleParams 返回原 params 不变
    expect(rectangle.scaleParams!({}, 2, 2)).toEqual({});
    // 端到端：compile scale:2 → emit cornerRadius ×2
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { cornerRadius: 6 } }, scale: 2 })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(12);
  });
});
