import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning } from '../../src/compile/compile';
import { BUILTIN_SHAPES, localToWorld, worldToLocal } from '../../src/shapes';
import type { ShapeDefinition } from '../../src/shapes';
import { NodeSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  prims.find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

/** 径向自定义 shape（外接圆 + 投影 boundaryPoint + 仅 center anchor + ellipse emit） */
const radialShape = (): ShapeDefinition => ({
  circumscribe: (hw, hh) => {
    const r = Math.hypot(hw, hh);
    return { halfWidth: r, halfHeight: r };
  },
  boundaryPoint: (rect, toward) => {
    const [lx, ly] = worldToLocal(rect, toward);
    const len = Math.hypot(lx, ly) || 1;
    const r = rect.width / 2;
    return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
  },
  anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
  *emit (rect, style): Iterable<ScenePrimitive> {
    yield {
      type: 'ellipse',
      cx: rect.x,
      cy: rect.y,
      rx: rect.width / 2,
      ry: rect.height / 2,
      fill: style.fill ?? 'transparent',
      stroke: style.stroke ?? 'currentColor',
      strokeWidth: style.strokeWidth ?? 1,
    };
  },
});

/** 多 primitive shape：body rect + 左右各一根 pin 短线（验证 emit Iterable 的 factory 价值） */
const chipShape = (): ShapeDefinition => ({
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
  anchor: BUILTIN_SHAPES.rectangle.anchor,
  *emit (rect): Iterable<ScenePrimitive> {
    const hw = rect.width / 2;
    yield { type: 'rect', x: rect.x - hw, y: rect.y - rect.height / 2, width: rect.width, height: rect.height, stroke: 'currentColor', strokeWidth: 1 };
    yield { type: 'path', commands: [{ kind: 'move', to: [rect.x - hw - 4, rect.y] }, { kind: 'line', to: [rect.x - hw, rect.y] }], stroke: 'currentColor', strokeWidth: 1 };
    yield { type: 'path', commands: [{ kind: 'move', to: [rect.x + hw, rect.y] }, { kind: 'line', to: [rect.x + hw + 4, rect.y] }], stroke: 'currentColor', strokeWidth: 1 };
  },
});

describe('Shape registry — injection (happy path)', () => {
  it('inject_custom_shape_compiles: shapes:{hexagon} + node.shape=hexagon → emits custom prim', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', shape: 'hexagon', position: [0, 0] }] };
    const scene = compileToScene(ir, { shapes: { hexagon: radialShape() } });
    expect(findByType(scene.primitives, 'ellipse')).toBeDefined();
  });

  it('numeric_angle_generic_for_custom: a custom shape with only boundaryPoint gets `.30` for free', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'hexagon', position: [0, 0] },
        { type: 'path', children: [{ type: 'step', kind: 'move', to: 'A.30' }, { type: 'step', kind: 'line', to: [100, 50] }] },
      ],
    };
    const scene = compileToScene(ir, { shapes: { hexagon: radialShape() } });
    const linePath = scene.primitives.find(p => p.type === 'path');
    // r = √(8²+8²) = 11.31; 30° → (9.8, 5.66)
    if (linePath?.type === 'path') expect(linePath.commands[0]).toEqual({ kind: 'move', to: [9.8, 5.66] });
  });

  it('shape_emits_multiple_primitives: emit yielding body + 2 pins → all prims in Scene', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', shape: 'chip', position: [0, 0] }] };
    const scene = compileToScene(ir, { shapes: { chip: chipShape() } });
    expect(scene.primitives.filter(p => p.type === 'rect' || p.type === 'path')).toHaveLength(3);
  });
});

describe('Shape registry — boundary', () => {
  it('empty_shapes_option_equals_baseline: shapes:{} deep-equals no options', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'a', shape: 'circle', position: [0, 0], text: 'a' },
        { type: 'node', id: 'b', shape: 'diamond', position: [60, 0], rotate: 20 },
        { type: 'path', children: [{ type: 'step', kind: 'move', to: 'a' }, { type: 'step', kind: 'line', to: 'b' }] },
      ],
    };
    expect(compileToScene(ir, { shapes: {} })).toEqual(compileToScene(ir));
  });

  it('default_rectangle_when_shape_absent: no shape → RectPrim', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }] };
    expect(findByType(compileToScene(ir).primitives, 'rect')).toBeDefined();
  });

  it('synthetic_layouts_have_rectangle_shapedef: coordinate + scope.id resolve via rectangle geometry', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'co', position: [50, 50] },
        { type: 'scope', id: 's', transforms: [], children: [{ type: 'node', id: 'inner', position: [0, 0], text: 'x' }] },
        // coordinate center (0×0 rect → boundary == center) and scope.id.north must not crash
        { type: 'path', children: [{ type: 'step', kind: 'move', to: 'co' }, { type: 'step', kind: 'line', to: 's.north' }] },
      ],
    };
    const scene = compileToScene(ir);
    const linePath = scene.primitives.find(
      (p): p is Extract<ScenePrimitive, { type: 'path' }> => p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
    );
    expect(linePath).toBeDefined();
    if (linePath?.type === 'path' && linePath.commands[0].kind === 'move') {
      expect(linePath.commands[0].to).toEqual([50, 50]);
    }
  });
});

describe('Shape registry — error path', () => {
  it('unknown_shape_throws_with_list: unregistered shape → throw with sorted available names', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', shape: 'cloud', position: [0, 0] }] };
    expect(() => compileToScene(ir)).toThrow(/Unknown shape 'cloud'/);
    expect(() => compileToScene(ir)).toThrow(/circle, diamond, ellipse, rectangle/);
  });

  it('unknown_shape_string_in_schema_passes_validation: schema accepts any non-empty string', () => {
    expect(NodeSchema.safeParse({ type: 'node', shape: 'cloud', position: [0, 0] }).success).toBe(true);
    expect(NodeSchema.safeParse({ type: 'node', shape: '', position: [0, 0] }).success).toBe(false);
  });

  it('custom_shape_anchor_only_center: referencing an unimplemented named anchor throws', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'dot', position: [0, 0] },
        { type: 'path', children: [{ type: 'step', kind: 'move', to: 'A.north' }, { type: 'step', kind: 'line', to: [0, -100] }] },
      ],
    };
    expect(() => compileToScene(ir, { shapes: { dot: radialShape() } })).toThrow(/Unknown anchor 'north' for shape 'dot'/);
  });
});

describe('Shape registry — interaction', () => {
  it('inject_overrides_builtin_emits_warn: override rectangle → custom emit + SHAPE_OVERRIDES_BUILTIN', () => {
    const ovalRect: ShapeDefinition = {
      ...BUILTIN_SHAPES.rectangle,
      *emit (rect, style): Iterable<ScenePrimitive> {
        yield { type: 'ellipse', cx: rect.x, cy: rect.y, rx: rect.width / 2, ry: rect.height / 2, fill: style.fill ?? 'transparent', stroke: style.stroke ?? 'currentColor', strokeWidth: style.strokeWidth ?? 1 };
      },
    };
    const warnings: Array<CompileWarning> = [];
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }] };
    const scene = compileToScene(ir, { shapes: { rectangle: ovalRect }, onWarn: w => warnings.push(w) });
    expect(findByType(scene.primitives, 'ellipse')).toBeDefined();
    expect(findByType(scene.primitives, 'rect')).toBeUndefined();
    expect(warnings.some(w => w.code === 'SHAPE_OVERRIDES_BUILTIN')).toBe(true);
  });

  it('override_warn_reaches_user_onwarn_in_prod: user onWarn fires even in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const warnings: Array<CompileWarning> = [];
      const ovalRect: ShapeDefinition = {
        ...BUILTIN_SHAPES.rectangle,
        *emit (rect): Iterable<ScenePrimitive> {
          yield { type: 'ellipse', cx: rect.x, cy: rect.y, rx: rect.width / 2, ry: rect.height / 2 };
        },
      };
      const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', position: [0, 0] }] };
      compileToScene(ir, { shapes: { rectangle: ovalRect }, onWarn: w => warnings.push(w) });
      expect(warnings.some(w => w.code === 'SHAPE_OVERRIDES_BUILTIN')).toBe(true);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('diamond_rotate_via_outer_group: rotated diamond → axis-aligned path under a rotate group', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', shape: 'diamond', position: [0, 0], text: 'D', rotate: 45 }] };
    const group = findByType(compileToScene(ir).primitives, 'group');
    expect(group).toBeDefined();
    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 45 });
    expect(group?.children.some(c => c.type === 'path')).toBe(true);
  });

  it('injected_shape_with_margin: outerSep inflates the rect passed to boundaryPoint', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', shape: 'hexagon', position: [0, 0], outerSep: 10 },
        { type: 'path', children: [{ type: 'step', kind: 'move', to: 'A' }, { type: 'step', kind: 'line', to: [100, 0] }] },
      ],
    };
    const scene = compileToScene(ir, { shapes: { hexagon: radialShape() } });
    const linePath = scene.primitives.find(p => p.type === 'path');
    // r = √(8²+8²)=11.31, + margin 10 → 21.31
    if (linePath?.type === 'path' && linePath.commands[0].kind === 'move') {
      expect(linePath.commands[0].to).toEqual([21.31, 0]);
    }
  });
});
