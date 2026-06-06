/**
 * shape 参数化泛化（ADR-01）schema + 编译期桥接测试
 * @description 覆盖 ShapeRefSchema 的 string / nested object 解析与拒绝、defineShape 擦除注册往返、
 *   编译期双护栏（paramsSchema → JsonObjectSchema）、未注册 type throw、circumscribe 驱动 bbox、
 *   nested shape × rotate / scale、含 nested shape 的 IR JSON round-trip。
 *   注：涉及 compile 行为的 case 此刻 fail（compile/node.ts 桥接尚未实现）——预期。
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR, IRJsonObject } from '../../src/ir';
import { defineShape } from '../../src/shapes';
import type { ShapeDefinition } from '../../src/shapes';
import type { Position, Rect } from '../../src/geometry';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

/** 参数化测试形状：strictObject({ r:number })；circumscribe 据 r 返回精确 AABB；emit 一个 ellipse */
const ringShape = (): ShapeDefinition =>
  defineShape({
    paramsSchema: z.strictObject({ r: z.number() }),
    circumscribe: (_hw, _hh, params) => ({ halfWidth: params.r, halfHeight: params.r }),
    boundaryPoint: (rect: Rect, _toward: Position, params): Position => [rect.x + params.r, rect.y],
    anchor: (rect: Rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
    *emit (rect: Rect, _style, _round, params): Iterable<ScenePrimitive> {
      yield {
        type: 'ellipse',
        cx: rect.x,
        cy: rect.y,
        rx: params.r,
        ry: params.r,
        fill: 'transparent',
        stroke: 'currentColor',
        strokeWidth: 1,
      };
    },
  });

/**
 * 宽松 paramsSchema（passthrough 放过 `undefined` 值）——验证第二道 JsonObjectSchema 护栏。
 * @description `z.object({}).passthrough()` 不校验值形态，会让 `{ v: undefined }` 原样通过第一道，
 *   交给编译期第二道 `JsonObjectSchema.parse` 拦下。类型层标 `ZodType<IRJsonObject>` 是定义点契约
 *   （第二道 parse 才是真正护栏，与 path generator 同构）。
 */
const looseShape = (): ShapeDefinition =>
  defineShape({
    paramsSchema: z.object({}).passthrough() as unknown as z.ZodType<IRJsonObject>,
    circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
    boundaryPoint: (rect: Rect): Position => [rect.x, rect.y],
    anchor: (rect: Rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
    *emit (rect: Rect): Iterable<ScenePrimitive> {
      yield { type: 'rect', x: rect.x, y: rect.y, width: rect.width, height: rect.height, stroke: 'currentColor', strokeWidth: 1 };
    },
  });

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

// ─────────────────────────── Happy path（≥3）───────────────────────────

describe('ShapeRefSchema / Node.shape — happy path 解析', () => {
  it('shape_string_form_parses：裸 string 通过 Node.shape union', () => {
    const node = { type: 'node', id: 'A', position: [0, 0], shape: 'rectangle' };
    expect(NodeSchema.parse(node).shape).toBe('rectangle');
  });

  it('shape_nested_object_parses：{type} 与 {type, params} 均解析', () => {
    expect(ShapeRefSchema.parse({ type: 'rectangle' })).toEqual({ type: 'rectangle' });
    expect(
      ShapeRefSchema.parse({ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } }),
    ).toEqual({ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } });
  });

  it('nested shape 经 Node.shape union 解析', () => {
    const node = { type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 30 } } };
    expect(NodeSchema.parse(node).shape).toEqual({ type: 'ring', params: { r: 30 } });
  });

  it('defineShape_typed_erased_roundtrip：defineShape<{r:number}> 注册 → registry 取出 → params 经双护栏喂 boundaryPoint', () => {
    const def = ringShape();
    // 注册表存的是擦除形态，paramsSchema 仍可 parse
    const parsed = def.paramsSchema.parse({ r: 30 });
    expect(parsed).toEqual({ r: 30 });
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 30 } } }]);
    const compiled = compileToScene(ir, { shapes: { ring: def } });
    expect(findByType(compiled.primitives, 'ellipse')).toBeDefined();
  });
});

// ─────────────────────────── 边界（≥2）───────────────────────────

describe('ShapeRefSchema / shape 桥接 — 边界', () => {
  it('no_params_empty_object：{type:"rectangle"}（无 params）经 strictObject({}) 通过、行为同裸 string', () => {
    const stringIr = scene([{ type: 'node', id: 'A', position: [0, 0], shape: 'rectangle' }]);
    const nestedIr = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'rectangle' } }]);
    const stringScene = compileToScene(stringIr);
    const nestedScene = compileToScene(nestedIr);
    expect(findByType(nestedScene.primitives, 'rect')).toEqual(findByType(stringScene.primitives, 'rect'));
  });

  it('string_equals_nested："rectangle" 与 {type:"rectangle"} 编译产物逐字段相等', () => {
    const stringScene = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: 'rectangle', text: 'X' }]));
    const nestedScene = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'rectangle' }, text: 'X' }]));
    expect(nestedScene.primitives).toEqual(stringScene.primitives);
  });
});

// ─────────────────────────── 错误路径（≥2）───────────────────────────

describe('shape 错误路径', () => {
  it('unregistered_type_throws：{type:"nope"} 编译期 throw', () => {
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'nope' } }]);
    expect(() => compileToScene(ir)).toThrow();
  });

  it('params_schema_violation_rejected：paramsSchema 要 r:number，给 {r:"a"} → 第一道 parse reject', () => {
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 'a' } } }]);
    expect(() => compileToScene(ir, { shapes: { ring: ringShape() } })).toThrow();
  });

  it('non_json_params_caught_by_second_guard：宽松 paramsSchema 放过 undefined → 第二道 JsonObjectSchema.parse 拦下', () => {
    // params.v = undefined 是运行时注入的非 JSON 值：IRChild 静态类型不允许 undefined，
    // 这里在运行时把键置为 undefined（模拟 LLM / 外部传入的脏 JSON），交给第二道护栏拦截。
    const dirtyParams: IRJsonObject = {};
    (dirtyParams as Record<string, unknown>).v = undefined;
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'loose', params: dirtyParams } }]);
    expect(() => compileToScene(ir, { shapes: { loose: looseShape() } })).toThrow();
  });

  it('strict_params_reject_extra_field：无参形状给 {params:{foo:1}} → strictObject reject', () => {
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'rectangle', params: { foo: 1 } } }]);
    expect(() => compileToScene(ir)).toThrow();
  });

  it('shape_neither_string_nor_object：shape:42 → schema reject', () => {
    const node = { type: 'node', id: 'A', position: [0, 0], shape: 42 };
    expect(NodeSchema.safeParse(node).success).toBe(false);
  });

  it('ShapeRefSchema 拒绝空 type 字符串', () => {
    expect(ShapeRefSchema.safeParse({ type: '' }).success).toBe(false);
  });
});

// ─────────────────────────── 交互（≥2）───────────────────────────

describe('shape × Node 变换 / bbox 交互', () => {
  it('nested_shape_with_rotate：{type:"rectangle"} + rotate:30 → 仍编译出 rect', () => {
    const ir = scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'rectangle' }, rotate: 30, text: 'X' }]);
    const compiled = compileToScene(ir);
    expect(findByType(compiled.primitives, 'rect') ?? findByType(compiled.primitives, 'group')).toBeDefined();
  });

  it('nested_shape_with_scale：带 scale 的 Node × nested shape → 尺寸协同（与无 scale 不同）', () => {
    const base = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 30 } } }]), { shapes: { ring: ringShape() } });
    const scaled = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 30 } }, scale: 2 }]), { shapes: { ring: ringShape() } });
    expect(findByType(scaled.primitives, 'ellipse')).not.toEqual(findByType(base.primitives, 'ellipse'));
  });

  it('circumscribe_aabb_drives_bbox：参数化形状 circumscribe 返回的 AABB 驱动 layout bbox', () => {
    const small = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 10 } } }]), { shapes: { ring: ringShape() } });
    const large = compileToScene(scene([{ type: 'node', id: 'A', position: [0, 0], shape: { type: 'ring', params: { r: 100 } } }]), { shapes: { ring: ringShape() } });
    // r 越大 → circumscribe 返回的 AABB 越大 → layout bbox 越大（compile.ts 只累积 layout.rect 四角）
    expect(large.layout.width).toBeGreaterThan(small.layout.width);
  });

  it('roundtrip_self_describing：含 nested shape 的 IR → JSON → parse → 等价（params 全在 IR）', () => {
    const node = {
      type: 'node',
      id: 'wedge',
      position: [0, 0],
      shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } });
  });

  it('ShapeRefSchema round-trip：{type, params} → JSON → parse 等价', () => {
    const ref = { type: 'ring', params: { r: 30, label: 'x', nested: { a: [1, 2, null] } } };
    const parsed = ShapeRefSchema.parse(ref);
    expect(ShapeRefSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });
});
