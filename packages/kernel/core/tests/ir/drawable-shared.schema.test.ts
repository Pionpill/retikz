import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  DrawableElementMetadataSchema,
  DrawableGeometryStyleSchema,
  GeometryLabelSchema,
  type IRDrawableElementMetadata,
  type IRDrawableGeometryStyle,
  type IRDrawableSharedStyle,
  PathSchema,
  RibbonLabelSchema,
  RibbonSchema,
  StepLabelSchema,
} from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const fade = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 300,
};

const path = (overrides: Record<string, unknown> = {}) => ({
  type: 'path',
  children: steps,
  ...overrides,
});

const ribbon = (overrides: Record<string, unknown> = {}) => ({
  type: 'ribbon',
  width: 12,
  children: steps,
  ...overrides,
});

describe('Drawable shared schema', () => {
  it('drawable-shared-path-accepts-style：Path 接受共享 drawable 样式和元数据字段', () => {
    const parsed = PathSchema.parse(
      path({
        id: 'edge-a',
        color: 'crimson',
        fill: '#fee2e2',
        fillOpacity: 0.4,
        stroke: '#991b1b',
        strokeWidth: 2,
        drawOpacity: 0.7,
        opacity: 0.8,
        shadow: 'md',
        blendMode: 'multiply',
        zIndex: 3,
        meta: { series: 'a' },
        animations: [fade],
      }),
    );

    expect(parsed).toMatchObject({
      id: 'edge-a',
      color: 'crimson',
      fill: '#fee2e2',
      stroke: '#991b1b',
      zIndex: 3,
      meta: { series: 'a' },
    });
  });

  it('drawable-shared-ribbon-accepts-style：Ribbon 接受同一组共享 drawable 样式和元数据字段', () => {
    const parsed = RibbonSchema.parse(
      ribbon({
        id: 'flow-a',
        color: 'teal',
        fill: '#ccfbf1',
        fillOpacity: 0.5,
        stroke: '#0f766e',
        strokeWidth: 1.5,
        drawOpacity: 0.75,
        opacity: 0.9,
        shadow: { offsetX: 1, offsetY: 2, blur: 3 },
        blendMode: 'screen',
        zIndex: 4,
        meta: { row: 1 },
        animations: [fade],
      }),
    );

    expect(parsed).toMatchObject({
      id: 'flow-a',
      color: 'teal',
      fill: '#ccfbf1',
      stroke: '#0f766e',
      zIndex: 4,
      meta: { row: 1 },
    });
  });

  it('drawable-shared-type-pick：共享类型只把 zIndex 放进 graph style subset', () => {
    expectTypeOf<IRDrawableSharedStyle>().toMatchTypeOf<IRDrawableGeometryStyle>();
    expectTypeOf<IRDrawableSharedStyle>().toHaveProperty('zIndex').toEqualTypeOf<
      IRDrawableElementMetadata['zIndex']
    >();
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('id');
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('meta');
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('animations');
  });

  it('geometry-label-contract-shared：StepLabel 与 RibbonLabel 共享 GeometryLabel 类型契约', () => {
    const label = { text: '128', position: 0.75, placement: 'inside', sloped: true };

    expect(StepLabelSchema.parse(label)).toEqual(label);
    expect(RibbonLabelSchema.parse(label)).toEqual(label);
    expect(RibbonSchema.parse(ribbon({ label })).label).toEqual(label);
  });

  it('geometry-label-schema-single-source：StepLabel / RibbonLabel 都是 GeometryLabelSchema 实例', () => {
    expect(StepLabelSchema).toBe(GeometryLabelSchema);
    expect(RibbonLabelSchema).toBe(GeometryLabelSchema);
  });

  it('drawable-shared-ribbon-rejects-path-only：Ribbon 拒绝 path-only 字段', () => {
    for (const field of ['dashPattern', 'arrow', 'arrowDetail', 'lineCap', 'lineJoin', 'roundedCorners']) {
      expect(RibbonSchema.safeParse(ribbon({ [field]: field === 'dashPattern' ? [4, 2] : 'round' })).success).toBe(false);
    }
  });

  it('drawable-shared-path-rejects-ribbon-only：Path 拒绝 ribbon-only 字段', () => {
    for (const field of ['width', 'start', 'end', 'interpolation', 'align', 'samples', 'sampling', 'upper', 'lower']) {
      expect(PathSchema.safeParse(path({ [field]: field === 'width' ? 12 : {} })).success).toBe(false);
    }
  });

  it('drawable-shared-rejects-metadata-in-style-helper：geometry style schema 不接受元数据字段', () => {
    expect(DrawableGeometryStyleSchema.safeParse({ id: 'x' }).success).toBe(false);
    expect(DrawableGeometryStyleSchema.safeParse({ meta: { x: 1 } }).success).toBe(false);
    expect(DrawableGeometryStyleSchema.safeParse({ animations: [] }).success).toBe(false);
    expect(DrawableGeometryStyleSchema.safeParse({ zIndex: 1 }).success).toBe(false);
    expect(DrawableElementMetadataSchema.safeParse({ zIndex: 1, meta: { ok: true } }).success).toBe(true);
  });

  it('geometry-label-ribbon-rejects-private-side：Ribbon label 拒绝私有 side / rotate 字段', () => {
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', side: 'upper' } })).success).toBe(false);
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', rotate: 'sloped' } })).success).toBe(false);
  });

  it('drawable-shared-schema-json-round-trip：共享 style schema 保持 JSON round-trip 等价', () => {
    const style = {
      color: '#0f172a',
      fill: '#e0f2fe',
      stroke: '#0369a1',
      strokeWidth: 2,
      opacity: 0.8,
      fillOpacity: 0.4,
      drawOpacity: 0.6,
      shadow: 'sm',
      blendMode: 'multiply',
    };

    expect(DrawableGeometryStyleSchema.parse(JSON.parse(JSON.stringify(style)))).toEqual(style);
  });
});
