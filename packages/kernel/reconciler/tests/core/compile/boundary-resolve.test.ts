import type { CenteredBox } from '@retikz/math';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import { BuiltinCompileWarningCode } from '../../../../core/src';
import type {
  BoundaryState,
  BoundaryVisualResolution,
  CompiledBoundaryGeometry,
} from '../../../../core/src/compile/boundary';
import { evaluateBoundaryPoint, evaluateNamedBoundaryAnchor } from '../../../../core/src/compile/boundary';
import type { BoundaryDefinition, ShapeDefinition } from '../../../../core/src/contract';
import { defineBoundary } from '../../../../core/src/contract';
import { resolveBoundaryRegistry, ellipseShape, rectangle } from '../../../../core/src/providers';
import type { ProviderRegistry } from '../../../../core/src/providers';
import { boundaryKey, resolveNodeBoundary } from '../../../../core/src/resolve';

const visualRect: CenteredBox = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };

const registry = new Map([
  [rectangle.name, rectangle],
  [ellipseShape.name, ellipseShape],
]);

const shapeAwareVisual = {
  ...rectangle,
  name: 'shape-aware-visual',
  computeConnectionEnvelope: (_rect: CenteredBox, kind: 'circle' | 'ellipse' | 'rectangle') => {
    if (kind === 'circle') return { halfWidth: 12, halfHeight: 12 };
    if (kind === 'ellipse') return { halfWidth: 14, halfHeight: 8 };
    return { halfWidth: 20, halfHeight: 10 };
  },
};

const customWithoutEnvelope = {
  ...rectangle,
  name: 'custom-without-envelope',
  computeConnectionEnvelope: undefined,
};

type BoundaryTestContext = BoundaryState &
  BoundaryVisualResolution & {
    shapeRegistry: ProviderRegistry<ShapeDefinition>;
    boundaryRegistry: ProviderRegistry<BoundaryDefinition>;
  };

const resolveContext = (overrides: Partial<BoundaryTestContext> = {}): BoundaryTestContext => ({
  def: rectangle,
  rect: visualRect,
  params: {},
  shapeRegistry: registry,
  boundaryRegistry: resolveBoundaryRegistry(),
  ...overrides,
});

/** 解析连接面并通过生产查询入口消费，缓存与诊断由同一次查询上下文持有 */
const resolveBoundary = (boundary: Parameters<typeof resolveNodeBoundary>[0], context: BoundaryTestContext) => {
  const layout: CompiledBoundaryGeometry = {
    shape: { name: context.def.name, definition: context.def, params: context.params },
    boundary: resolveNodeBoundary(boundary, {
      visualDef: context.def,
      visualParams: context.params,
      shapeRegistry: context.shapeRegistry,
      boundaryRegistry: context.boundaryRegistry,
      irPath: context.irPath,
    }),
    geometry: { rect: context.rect, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  };
  // 求值触发 provider 几何校验与回退诊断
  evaluateBoundaryPoint(layout, [context.rect.x + 100, context.rect.y], undefined, undefined, undefined, context);
  return { layout, context };
};

const pointAt = (query: ReturnType<typeof resolveBoundary>, toward: Parameters<typeof evaluateBoundaryPoint>[1]) =>
  evaluateBoundaryPoint(query.layout, toward, undefined, undefined, undefined, query.context);
const anchorAt = (query: ReturnType<typeof resolveBoundary>, name: string) =>
  evaluateNamedBoundaryAnchor(query.layout, name, undefined, false, undefined, query.context);

describe('resolveBoundary', () => {
  it("'shape' 或 undefined 使用视觉定义和矩形", () => {
    const r = resolveBoundary('shape', resolveContext());

    expect(r.layout.boundary.definition).toBe(rectangle);
    expect(pointAt(r, [100, 0])).toEqual([20, 0]);
    expect(anchorAt(r, 'top')).toEqual([0, -10]);
    expect(resolveBoundary(undefined, resolveContext()).layout.boundary.definition).toBe(rectangle);
  });

  it("'rectangle' / 'ellipse' → 视觉 AABB 上的内置边界提供者", () => {
    expect(resolveBoundary('rectangle', resolveContext({ def: ellipseShape })).layout.boundary.definition.name).toBe(
      'rectangle',
    );
    expect(resolveBoundary('ellipse', resolveContext()).layout.boundary.definition.name).toBe('ellipse');
  });

  it("'circle' → 圆边界提供者使用视觉 AABB 外接圆", () => {
    const r = resolveBoundary('circle', resolveContext());

    expect(r.layout.boundary.definition.name).toBe('circle');
    expect(pointAt(r, [0, -100])[1]).toBeCloseTo(-Math.hypot(20, 10));
    expect(pointAt(r, [100, 0])[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(pointAt(r, [0, 100])[1]).toBeCloseTo(Math.hypot(20, 10));
    expect(anchorAt(r, 'center')).toEqual([0, 0]);
  });

  it("'circle'→连接面外接视觉 AABB", () => {
    const r = resolveBoundary('circle', resolveContext());
    const corner = pointAt(r, [20, 10]);
    const right = pointAt(r, [100, 0]);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(right[1]).toBeCloseTo(0);
  });

  it("'circle' 旋转连接面仍包围各角点并保留标准锚点", () => {
    const rotatedRect: CenteredBox = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('circle', resolveContext({ rect: rotatedRect }));
    const corner = pointAt(r, [-5, 13]);
    const top = anchorAt(r, 'top');

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top[0]).toBeCloseTo(5 + Math.hypot(20, 10));
    expect(top[1]).toBeCloseTo(-7);
  });

  it("'ellipse'→连接面外接视觉 AABB", () => {
    const r = resolveBoundary('ellipse', resolveContext());
    const corner = pointAt(r, [20, 10]);
    const right = pointAt(r, [100, 0]);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(20 * Math.SQRT2);
    expect(right[1]).toBeCloseTo(0);
  });

  it("'ellipse' 旋转连接面仍包围各角点并保留标准锚点", () => {
    const rotatedRect: CenteredBox = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('ellipse', resolveContext({ rect: rotatedRect }));
    const corner = pointAt(r, [-5, 13]);
    const top = anchorAt(r, 'top');

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top[0]).toBeCloseTo(5 + 10 * Math.SQRT2);
    expect(top[1]).toBeCloseTo(-7);
  });

  it('内置 {type, params} 使用边界提供者及解析后的参数', () => {
    const r = resolveBoundary({ type: 'ellipse' }, resolveContext());

    expect(r.layout.boundary.definition.name).toBe('ellipse');
  });

  it("fit:'tight' → 使用视觉 shape 的 connection envelope", () => {
    const circle = resolveBoundary('circle', resolveContext({ def: shapeAwareVisual }));
    const ellipse = resolveBoundary('ellipse', resolveContext({ def: shapeAwareVisual }));

    expect(pointAt(circle, [100, 0])[0]).toBeCloseTo(12);
    expect(pointAt(circle, [0, 100])[1]).toBeCloseTo(12);
    expect(pointAt(ellipse, [100, 0])[0]).toBeCloseTo(14);
    expect(pointAt(ellipse, [0, 100])[1]).toBeCloseTo(8);
  });

  it("fit:'bounds' → 忽略 shape envelope，使用 AABB 安全公式", () => {
    const circle = resolveBoundary(
      { type: 'circle', params: { fit: 'bounds' } },
      resolveContext({ def: shapeAwareVisual }),
    );
    const ellipse = resolveBoundary(
      { type: 'ellipse', params: { fit: 'bounds' } },
      resolveContext({ def: shapeAwareVisual }),
    );

    expect(pointAt(circle, [100, 0])[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(pointAt(circle, [0, 100])[1]).toBeCloseTo(Math.hypot(20, 10));
    expect(pointAt(ellipse, [100, 0])[0]).toBeCloseTo(20 * Math.SQRT2);
    expect(pointAt(ellipse, [0, 100])[1]).toBeCloseTo(10 * Math.SQRT2);
  });

  it('gap → 在 fit 后统一增减半径或半轴', () => {
    const circle = resolveBoundary(
      { type: 'circle', params: { fit: 'tight', gap: 3 } },
      resolveContext({ def: shapeAwareVisual }),
    );
    const ellipse = resolveBoundary(
      { type: 'ellipse', params: { fit: 'tight', gap: -2 } },
      resolveContext({ def: shapeAwareVisual }),
    );

    expect(pointAt(circle, [100, 0])[0]).toBeCloseTo(15);
    expect(pointAt(circle, [0, 100])[1]).toBeCloseTo(15);
    expect(pointAt(ellipse, [100, 0])[0]).toBeCloseTo(12);
    expect(pointAt(ellipse, [0, 100])[1]).toBeCloseTo(6);
  });

  it('rectangle 的 tight / bounds 表现一致，仍应用 gap', () => {
    const tight = resolveBoundary(
      { type: 'rectangle', params: { fit: 'tight', gap: 3 } },
      resolveContext({ def: shapeAwareVisual }),
    );
    const bounds = resolveBoundary(
      { type: 'rectangle', params: { fit: 'bounds', gap: 3 } },
      resolveContext({ def: shapeAwareVisual }),
    );

    expect(pointAt(tight, [100, 0])).toEqual(pointAt(bounds, [100, 0]));
    expect(pointAt(tight, [0, 100])).toEqual(pointAt(bounds, [0, 100]));
    expect(pointAt(tight, [100, 0])).toEqual([23, 0]);
    expect(pointAt(tight, [0, 100])).toEqual([0, 13]);
  });

  it('custom shape 缺少 envelope → warning 一次并回退 bounds', () => {
    const warnings: Array<{ code: string; message: string }> = [];
    const context = resolveContext({
      def: customWithoutEnvelope,
      connectionEnvelopeCache: new Map(),
      warn: (code, message) => warnings.push({ code, message }),
    });

    const first = resolveBoundary('circle', context);
    const second = resolveBoundary('circle', context);

    expect(pointAt(first, [100, 0])[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(pointAt(second, [100, 0])).toEqual(pointAt(first, [100, 0]));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: BuiltinCompileWarningCode.BoundaryTightFallback });
  });

  it('无效 shape envelope 与 gap 产生非正半轴时 fail-loud', () => {
    const invalidVisual = {
      ...shapeAwareVisual,
      computeConnectionEnvelope: () => ({ halfWidth: 0, halfHeight: 0 }),
    };

    expect(() => resolveBoundary('circle', resolveContext({ def: invalidVisual }))).toThrow(/envelope/i);
    expect(() =>
      resolveBoundary(
        { type: 'ellipse', params: { fit: 'tight', gap: -8 } },
        resolveContext({ def: shapeAwareVisual }),
      ),
    ).toThrow(/half-axis|half axes|positive/i);
  });

  it('custom resolveRect 返回非有限 rotate 时 fail-loud', () => {
    const invalidRotateBoundary = defineBoundary({
      name: 'invalid-rotate',
      paramsSchema: strictObject({}),
      resolveRect: context => ({ ...context.visualRect, rotate: Number.NaN }),
      computeBoundaryPoint: rect => [rect.x, rect.y],
    });

    expect(() =>
      resolveBoundary(
        'invalid-rotate',
        resolveContext({ boundaryRegistry: new Map([[invalidRotateBoundary.name, invalidRotateBoundary]]) }),
      ),
    ).toThrow(/finite|invalid rect/i);
  });

  it('边界提供者优先于已注册的同名形状回退', () => {
    const fakeCircle = { ...ellipseShape, name: 'circle' };
    const r = resolveBoundary(
      'circle',
      resolveContext({ shapeRegistry: new Map([...registry, [fakeCircle.name, fakeCircle]]) }),
    );

    expect(r.layout.boundary.definition.name).toBe('circle');
    expect(pointAt(r, [0, -100])[1]).toBeCloseTo(-Math.hypot(20, 10));
  });
});

describe('boundaryKey', () => {
  it('各边界保持稳定', () => {
    expect(boundaryKey('shape')).toBe(boundaryKey('shape'));
    expect(boundaryKey('circle')).not.toBe(boundaryKey('shape'));
    expect(boundaryKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
