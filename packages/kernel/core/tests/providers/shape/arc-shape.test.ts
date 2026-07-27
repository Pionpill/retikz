import { describe, expect, it } from 'vitest';

import type { ScenePrimitive } from '../../../src/contract';
import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { arc } from '../../../src/providers/shape';
import { NodeSchema, ShapeRefSchema } from '../../../src/schemas';
import { flattenPrims } from '../../helpers/flatten';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const arcNode = (params: {
  radius: number;
  startAngle: number;
  endAngle: number;
  close?: boolean;
}): IRScene['children'][number] => ({
  type: 'node',
  id: 'a',
  position: [0, 0],
  shape: { type: 'arc', params },
});

// ─────────────────────────── Happy path ───────────────────────────

describe('arc — happy path', () => {
  it('arc_open_stroke：close:false（默认）→ 开放描边弧（path 无 close 命令）', () => {
    const compiled = compileToScene(scene([arcNode({ radius: 50, startAngle: 30, endAngle: 150 })])).scene;
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(path!.commands.some(c => c.kind === 'close')).toBe(false);
  });

  it('arc_close：close:true → 闭合弓形（path 含 close 命令、可填充）', () => {
    const compiled = compileToScene(scene([arcNode({ radius: 50, startAngle: 30, endAngle: 150, close: true })])).scene;
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(path!.commands.some(c => c.kind === 'close')).toBe(true);
  });

  it('arc_large_angle_no_hang：startAngle:1e9 → 角度规范化 O(1)，编译快速完成且 layout finite（不死循环）', () => {
    // 巨型起始角下旧 while 循环（end += 360）退化成数百万次迭代（1e308 时浮点 end+360===end 直接挂死）；
    // O(1) 规范化 + axisAngles 守卫下编译应在毫秒级返回，且 layout 四值全 finite。
    const start = Date.now();
    const compiled = compileToScene(scene([arcNode({ radius: 50, startAngle: 1e9, endAngle: 1e9 + 90 })])).scene;
    expect(Date.now() - start).toBeLessThan(1000);
    expect(Number.isFinite(compiled.layout.width)).toBe(true);
    expect(Number.isFinite(compiled.layout.height)).toBe(true);
  });

  it('arc_huge_radius_finite_guard：radius:1e308 → AABB 聚合溢出 Infinity 被 finite 守卫拦截（throw）', () => {
    // 半轴 finite 但 center ± halfWidth 聚合溢出 Infinity；自动 layout 守卫应抛清晰错而非把 Infinity 漏进 Scene。
    const ir = scene([arcNode({ radius: 1e308, startAngle: 0, endAngle: 90 })]);
    expect(() => compileToScene(ir).scene).toThrow(/non-finite|overflow|bounds/);
  });
});

// ─────────────────────────── schema / 错误路径 ───────────────────────────

describe('arc — paramsSchema 校验', () => {
  it('close 可选：省略 → 解析通过（默认开放弧）', () => {
    expect(arc.paramsSchema.parse({ radius: 50, startAngle: 30, endAngle: 150 })).toEqual({
      radius: 50,
      startAngle: 30,
      endAngle: 150,
    });
  });

  it('非正半径拒绝：radius:0 → reject', () => {
    expect(() => arc.paramsSchema.parse({ radius: 0, startAngle: 0, endAngle: 90 })).toThrow();
  });

  it('非有限角拒绝：endAngle:NaN → reject', () => {
    expect(() => arc.paramsSchema.parse({ radius: 50, startAngle: 0, endAngle: NaN })).toThrow();
  });

  it('strictObject 缺 radius → reject', () => {
    expect(() => arc.paramsSchema.parse({ startAngle: 0, endAngle: 90 })).toThrow();
  });

  it('strictObject 多余字段 → reject', () => {
    expect(() => arc.paramsSchema.parse({ radius: 50, startAngle: 0, endAngle: 90, foo: 1 })).toThrow();
  });
});

// ─────────────────────────── round-trip + scaleParams ───────────────────────────

describe('arc — round-trip / scaleParams', () => {
  it('roundtrip：含 arc nested params 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'a',
      position: [0, 0],
      shape: { type: 'arc', params: { radius: 50, startAngle: 30, endAngle: 150, close: true } },
    };
    const parsed = NodeSchema.parse(node);
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('ShapeRefSchema 解析 arc nested params', () => {
    const ref = { type: 'arc', params: { radius: 50, startAngle: 30, endAngle: 150 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });

  it('arc_scale_preserves_angle：scaleParams 把 radius×2、startAngle/endAngle/close 不变', () => {
    const params = { radius: 50, startAngle: 30, endAngle: 150, close: true };
    expect(arc.scaleParams!(params, 2, 2)).toEqual({
      radius: 100,
      startAngle: 30,
      endAngle: 150,
      close: true,
    });
  });
});
