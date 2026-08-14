import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { BoundaryGeometryResolveContext } from '../../src/compile/node';
import type { Rect } from '../../src/shared/geometry/rect';

import { resolveBoundary as resolveBoundaryGeometry } from '../../src/compile/node';
import { boundaryKey, resolveBoundaryReference } from '../../src/resolve/node';
import type { ProviderCollection } from '../../src/providers/registry';
import type { BoundaryDefinition, ShapeDefinition } from '../../src/contract';
import { defineBoundary } from '../../src/contract';
import { resolveBoundaryRegistry } from '../../src/providers/boundary';
import { ellipseShape, rectangle } from '../../src/providers/shape';

const visualRect: Rect = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };
const registry = [rectangle, ellipseShape];

const shapeAwareVisual = {
  ...rectangle,
  name: 'shape-aware-visual',
  connectionEnvelope: (_rect: Rect, kind: 'circle' | 'ellipse' | 'rectangle') => {
    if (kind === 'circle') return { halfWidth: 12, halfHeight: 12 };
    if (kind === 'ellipse') return { halfWidth: 14, halfHeight: 8 };
    return { halfWidth: 20, halfHeight: 10 };
  },
};

const customWithoutEnvelope = {
  ...rectangle,
  name: 'custom-without-envelope',
  connectionEnvelope: undefined,
};

type BoundaryTestContext = BoundaryGeometryResolveContext & {
  shapeRegistry: ProviderCollection<ShapeDefinition>;
  boundaryRegistry: ProviderCollection<BoundaryDefinition>;
};

const resolveContext = (overrides: Partial<BoundaryTestContext> = {}): BoundaryTestContext => ({
  visualDef: rectangle,
  visualRect,
  visualParams: {},
  shapeRegistry: registry,
  boundaryRegistry: resolveBoundaryRegistry(),
  ...overrides,
});

const resolveBoundary = (boundary: Parameters<typeof resolveBoundaryReference>[0], context: BoundaryTestContext) =>
  resolveBoundaryGeometry(
    resolveBoundaryReference(boundary, {
      visualDef: context.visualDef,
      visualParams: context.visualParams,
      shapeRegistry: context.shapeRegistry,
      boundaryRegistry: context.boundaryRegistry,
      irPath: context.irPath,
    }),
    context,
  );

describe('resolveBoundary', () => {
  it("'shape' / undefined → visual def + rect", () => {
    const r = resolveBoundary('shape', resolveContext());
    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveBoundary(undefined, resolveContext()).def).toBe(rectangle);
  });
  it("'rectangle' / 'ellipse' → builtin boundary providers on visual AABB", () => {
    expect(resolveBoundary('rectangle', resolveContext({ visualDef: ellipseShape })).def.name).toBe('rectangle');
    expect(resolveBoundary('ellipse', resolveContext()).def.name).toBe('ellipse');
  });
  it("'circle' → circle boundary provider uses the visual AABB circumcircle", () => {
    const r = resolveBoundary('circle', resolveContext());
    expect(r.def.name).toBe('circle');
    expect(r.def.boundaryPoint(r.rect, [0, -100], r.params)[1]).toBeCloseTo(-Math.hypot(20, 10));
    expect(r.rect.width).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(r.rect.height).toBeCloseTo(2 * Math.hypot(20, 10));
    expect(r.rect.x).toBe(0);
  });
  it("'circle' → connection surface circumscribes the visual AABB", () => {
    const r = resolveBoundary('circle', resolveContext());
    const corner = r.def.boundaryPoint(r.rect, [20, 10], r.params);
    const right = r.def.boundaryPoint(r.rect, [100, 0], r.params);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(Math.hypot(20, 10));
    expect(right[1]).toBeCloseTo(0);
  });
  it("'circle' → rotated surface preserves corner enclosure and standard anchors", () => {
    const rotatedRect: Rect = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('circle', resolveContext({ visualRect: rotatedRect }));
    const corner = r.def.boundaryPoint(r.rect, [-5, 13], r.params);
    const top = r.def.anchor?.(r.rect, 'top', r.params);

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top?.[0]).toBeCloseTo(5 + Math.hypot(20, 10));
    expect(top?.[1]).toBeCloseTo(-7);
  });
  it("'ellipse' → connection surface circumscribes the visual AABB", () => {
    const r = resolveBoundary('ellipse', resolveContext());
    const corner = r.def.boundaryPoint(r.rect, [20, 10], r.params);
    const right = r.def.boundaryPoint(r.rect, [100, 0], r.params);

    expect(corner[0]).toBeCloseTo(20);
    expect(corner[1]).toBeCloseTo(10);
    expect(right[0]).toBeCloseTo(20 * Math.SQRT2);
    expect(right[1]).toBeCloseTo(0);
  });
  it("'ellipse' → rotated surface preserves corner enclosure and standard anchors", () => {
    const rotatedRect: Rect = { x: 5, y: -7, width: 40, height: 20, rotate: Math.PI / 2 };
    const r = resolveBoundary('ellipse', resolveContext({ visualRect: rotatedRect }));
    const corner = r.def.boundaryPoint(r.rect, [-5, 13], r.params);
    const top = r.def.anchor?.(r.rect, 'top', r.params);

    expect(corner[0]).toBeCloseTo(-5);
    expect(corner[1]).toBeCloseTo(13);
    expect(top?.[0]).toBeCloseTo(5 + 10 * Math.SQRT2);
    expect(top?.[1]).toBeCloseTo(-7);
  });
  it('builtin {type, params} → boundary provider + parsed params', () => {
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
    expect(warnings[0]).toMatchObject({ code: 'BOUNDARY_TIGHT_FALLBACK' });
  });
  it('无效 shape envelope 与 gap 产生非正半轴时 fail-loud', () => {
    const invalidVisual = {
      ...shapeAwareVisual,
      connectionEnvelope: () => ({ halfWidth: 0, halfHeight: 0 }),
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
      paramsSchema: z.strictObject({}),
      resolveRect: context => ({ ...context.visualRect, rotate: Number.NaN }),
      boundaryPoint: rect => [rect.x, rect.y],
    });

    expect(() =>
      resolveBoundary('invalid-rotate', resolveContext({ boundaryRegistry: [invalidRotateBoundary] })),
    ).toThrow(/finite|invalid rect/i);
  });
  it('boundary provider beats registered same-name shape fallback', () => {
    const fakeCircle = { ...ellipseShape, name: 'circle' };
    const r = resolveBoundary('circle', resolveContext({ shapeRegistry: [...registry, fakeCircle] }));
    expect(r.def.name).toBe('circle');
    expect(r.def.boundaryPoint(r.rect, [0, -100], r.params)[1]).toBeCloseTo(-Math.hypot(20, 10));
  });
});

describe('boundaryKey', () => {
  it('stable per boundary', () => {
    expect(boundaryKey('shape')).toBe(boundaryKey('shape'));
    expect(boundaryKey('circle')).not.toBe(boundaryKey('shape'));
    expect(boundaryKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
