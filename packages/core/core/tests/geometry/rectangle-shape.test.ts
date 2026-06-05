/**
 * rectangle shape（ADR-04）—— roundedCorners 从 Node 顶层迁入 params 测试
 * @description 覆盖：
 *   - params.roundedCorners → 圆角矩形（emit RectPrim 带 cornerRadius）；
 *   - strictObject 拒多余字段；
 *   - 顶层 Node.roundedCorners 迁移期仍生效（无 params 时回退）；
 *   - params.roundedCorners 与顶层并存 → params 优先；
 *   - scaleParams：roundedCorners 是长度，随 node scale 协同缩放。
 *
 *   迁移期约定（ADR-04）：params.roundedCorners 优先；顶层 Node.roundedCorners 仍生效（回退、标 deprecated）。
 *   顶层↔params 优先级在 compile（emit 读 params.roundedCorners ?? style.roundedCorners）——
 *   `rectangle_rounded_toplevel_compat` / `rectangle_params_over_toplevel` 依赖 emit 优先级落地，
 *   此刻应通过（rectangle.ts 已实现回退）。
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

describe('rectangle — roundedCorners 入 params', () => {
  it('rectangle_rounded_from_params：{type:"rectangle", params:{roundedCorners:6}} → 圆角矩形（cornerRadius=6）', () => {
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { roundedCorners: 6 } } })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(6);
  });

  it('rectangle_rounded_zero_sharp：params.roundedCorners:0 → 直角（cornerRadius=0）', () => {
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { roundedCorners: 0 } } })]),
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

  it('rectangle_negative_rounded_rejected：roundedCorners:-3 → nonnegative() reject', () => {
    expect(() => rectangle.paramsSchema.parse({ roundedCorners: -3 })).toThrow();
  });
});

// ─────────────────────────── 迁移期兼容（顶层 ↔ params 优先级）───────────────────────────

describe('rectangle — 顶层 roundedCorners 迁移期兼容', () => {
  it('rectangle_rounded_toplevel_compat：顶层 roundedCorners 无 params 时仍生效', () => {
    // 迁移期：未给 params.roundedCorners 时，顶层 Node.roundedCorners 仍画圆角（回退）。
    const compiled = compileToScene(scene([rectNode({ roundedCorners: 5 })]));
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(5);
  });

  it('rectangle_params_over_toplevel：params.roundedCorners 与顶层并存 → params 优先', () => {
    const compiled = compileToScene(
      scene([rectNode({ roundedCorners: 5, shape: { type: 'rectangle', params: { roundedCorners: 9 } } })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(9);
  });
});

// ─────────────────────────── round-trip + scaleParams ───────────────────────────

describe('rectangle — round-trip / scaleParams', () => {
  it('roundtrip_nested_params：含 rectangle {roundedCorners} 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'r',
      position: [0, 0],
      shape: { type: 'rectangle', params: { roundedCorners: 6 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({ type: 'rectangle', params: { roundedCorners: 6 } });
  });

  it('ShapeRefSchema 解析 rectangle roundedCorners params', () => {
    const ref = { type: 'rectangle', params: { roundedCorners: 4 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });

  it('rectangle_rounded_scaled：node scale=2 → roundedCorners 随长度协同 ×2', () => {
    // roundedCorners 是长度（与半径同性），scaleParams 用 uniform 几何均值因子缩放。
    expect(rectangle.scaleParams!({ roundedCorners: 6 }, 2, 2)).toEqual({ roundedCorners: 12 });
    // 无 roundedCorners 时 scaleParams 返回原 params 不变
    expect(rectangle.scaleParams!({}, 2, 2)).toEqual({});
    // 端到端：compile scale:2 → emit cornerRadius ×2
    const compiled = compileToScene(
      scene([rectNode({ shape: { type: 'rectangle', params: { roundedCorners: 6 } }, scale: 2 })]),
    );
    const r = findByType(compiled.primitives, 'rect');
    expect(r).toBeDefined();
    expect(r!.cornerRadius).toBe(12);
  });
});
