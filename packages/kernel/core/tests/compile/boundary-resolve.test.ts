import type { CenteredBox } from '@retikz/math';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import { BuiltinCompileWarningCode } from '../../src';
import type { BoundaryGeometryResolveContext } from '../../src/compile/node';
import { resolveBoundary as resolveBoundaryGeometry } from '../../src/compile/node';
import type { BoundaryDefinition, ShapeDefinition } from '../../src/contract';
import { defineBoundary } from '../../src/contract';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import type { ProviderRegistry } from '../../src/providers/registry';
import { ellipseShape, rectangle } from '../../src/providers/shape';
import { boundaryKey, resolveNodeBoundary } from '../../src/resolve/node';

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

type BoundaryTestContext = BoundaryGeometryResolveContext & {
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  boundaryRegistry: ProviderRegistry<BoundaryDefinition>;
};

const resolveContext = (overrides: Partial<BoundaryTestContext> = {}): BoundaryTestContext => ({
  visualDef: rectangle,
  visualRect,
  visualParams: {},
  shapeRegistry: registry,
  boundaryRegistry: resolveBoundaryRegistry(),
  ...overrides,
});

const resolveBoundary = (boundary: Parameters<typeof resolveNodeBoundary>[0], context: BoundaryTestContext) =>
  resolveBoundaryGeometry(
    resolveNodeBoundary(boundary, {
      visualDef: context.visualDef,
      visualParams: context.visualParams,
      shapeRegistry: context.shapeRegistry,
      boundaryRegistry: context.boundaryRegistry,
      irPath: context.irPath,
    }),
    context,
  );

describe('resolveBoundary', () => {
  it("'shape' 或 undefined 使用视觉定义和矩形", () => {
    const r = resolveBoundary('shape', resolveContext());

    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveBoundary(undefined, resolveContext()).def).toBe(rectangle);
  });

  it("'rectangle' / 'ellipse' → 视觉 AABB 上的内置边界提供者", () => {
    expect(resolveBoundary('rectangle', resolveContext({ visualDef: ellipseShape })).def.name).toBe('rectangle');
    expect(resolveBoundary('ellipse', resolveContext()).def.name).toBe('ellipse');
  });

  it("'circle' → 圆边界提供者使用视觉 AABB 外接圆", () => {
    const r = resolveBoundary('circle', resolveContext());

    expect(r.def.name).toBe('circle');
    expect(r.def.computeBoundaryPoint(r.rect, [0, -100], r.params)[1]).toBeCloseTo(-Math.hypot(20, 10));
    expect(r.rect.width).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(r.rect.height).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(r.rect.x).toBe(0);
  });

  it("'circle'→连接面外接视觉 AABB", () => {
    const r = resolveBoundary('circle', resolveContext());
    const corner = r.def.computeBoundaryPoint(r.rect, [20, 10], r.params);
    const right = r.def.computeBoundaryPoint(r.rect, [100, 0], r.params);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(right[1]).toBeCloseTo(0);
  });

  it("'circle' 旋转连接面仍包围各角点并保留标准锚点", () => {
    const rotatedRect: CenteredBox = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('circle', resolveContext({ visualRect: rotatedRect }));
    const corner = r.def.computeBoundaryPoint(r.rect, [-5, 13], r.params);
    const top = r.def.resolveAnchor?.(r.rect, 'top', r.params);

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top?.[0]).toBeCloseTo(5 + Math.hypot(20, 10));
    expect(top?.[1]).toBeCloseTo(-7);
  });

  it("'ellipse'→连接面外接视觉 AABB", () => {
    const r = resolveBoundary('ellipse', resolveContext());
    const corner = r.def.computeBoundaryPoint(r.rect, [20, 10], r.params);
    const right = r.def.computeBoundaryPoint(r.rect, [100, 0], r.params);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(20 * Math.SQRT2);
    expect(right[1]).toBeCloseTo(0);
  });

  it("'ellipse' 旋转连接面仍包围各角点并保留标准锚点", () => {
    const rotatedRect: CenteredBox = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('ellipse', resolveContext({ visualRect: rotatedRect }));
    const corner = r.def.computeBoundaryPoint(r.rect, [-5, 13], r.params);
    const top = r.def.resolveAnchor?.(r.rect, 'top', r.params);

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top?.[0]).toBeCloseTo(5 + 10 * Math.SQRT2);
    expect(top?.[1]).toBeCloseTo(-7);
  });

  it('内置 {type, params} 使用边界提供者及解析后的参数', () => {
    const r = resolveBoundary({ type: 'ellipse' }, resolveContext());

    expect(r.def.name).toBe('ellipse');
  });

  it("fit:'tight' → 使用视觉 shape 的 connection envelope", () => {
    const circle = resolveBoundary('circle', resolveContext({ visualDef: shapeAwareVisual }));
    const ellipse = resolveBoundary('ellipse', resolveContext({ visualDef: shapeAwareVisual }));

    expect(circle.rect).toMatchObject({ width: 24, height: 24 });
    expect(ellipse.rect).toMatchObject({ width: 28, height: 16 });
  });

  it("fit:'bounds' → 忽略 shape envelope，使用 AABB 安全公式", () => {
    const circle = resolveBoundary(
      { type: 'circle', params: { fit: 'bounds' } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );
    const ellipse = resolveBoundary(
      { type: 'ellipse', params: { fit: 'bounds' } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );

    expect(circle.rect.width).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(circle.rect.height).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(ellipse.rect.width).toBeCloseTo(40 * Math.SQRT2);
    expect(ellipse.rect.height).toBeCloseTo(20 * Math.SQRT2);
  });

  it('gap → 在 fit 后统一增减半径或半轴', () => {
    const circle = resolveBoundary(
      { type: 'circle', params: { fit: 'tight', gap: 3 } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );
    const ellipse = resolveBoundary(
      { type: 'ellipse', params: { fit: 'tight', gap: -2 } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );

    expect(circle.rect).toMatchObject({ width: 30, height: 30 });
    expect(ellipse.rect).toMatchObject({ width: 24, height: 12 });
  });

  it('rectangle 的 tight / bounds 表现一致，仍应用 gap', () => {
    const tight = resolveBoundary(
      { type: 'rectangle', params: { fit: 'tight', gap: 3 } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );
    const bounds = resolveBoundary(
      { type: 'rectangle', params: { fit: 'bounds', gap: 3 } },
      resolveContext({ visualDef: shapeAwareVisual }),
    );

    expect(tight.rect).toEqual(bounds.rect);
    expect(tight.rect).toMatchObject({ width: 46, height: 26 });
  });

  it('custom shape 缺少 envelope → warning 一次并回退 bounds', () => {
    const warnings: Array<{ code: string; message: string }> = [];
    const context = resolveContext({
      visualDef: customWithoutEnvelope,
      connectionEnvelopeCache: new Map(),
      warn: (code, message) => warnings.push({ code, message }),
    });

    const first = resolveBoundary('circle', context);
    const second = resolveBoundary('circle', context);

    expect(first.rect.width).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(second.rect).toEqual(first.rect);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: BuiltinCompileWarningCode.BoundaryTightFallback });
  });

  it('无效 shape envelope 与 gap 产生非正半轴时 fail-loud', () => {
    const invalidVisual = {
      ...shapeAwareVisual,
      computeConnectionEnvelope: () => ({ halfWidth: 0, halfHeight: 0 }),
    };

    expect(() => resolveBoundary('circle', resolveContext({ visualDef: invalidVisual }))).toThrow(/envelope/i);
    expect(() =>
      resolveBoundary(
        { type: 'ellipse', params: { fit: 'tight', gap: -8 } },
        resolveContext({ visualDef: shapeAwareVisual }),
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

    expect(r.def.name).toBe('circle');
    expect(r.def.computeBoundaryPoint(r.rect, [0, -100], r.params)[1]).toBeCloseTo(-Math.hypot(20, 10));
  });
});

describe('boundaryKey', () => {
  it('各边界保持稳定', () => {
    expect(boundaryKey('shape')).toBe(boundaryKey('shape'));
    expect(boundaryKey('circle')).not.toBe(boundaryKey('shape'));
    expect(boundaryKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
