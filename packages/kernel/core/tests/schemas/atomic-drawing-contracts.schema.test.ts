import { describe, expect, it } from 'vitest';

import {
  CascadingGraphicStyleSchema,
  GraphicEffectsSchema,
  GraphicOpacitySchema,
  GraphicPaintSchema,
  GraphicStyleSchema,
  GraphicStrokeSchema,
  NodeStrokeSchema,
  PathDecorationSchema,
  PathDefaultSchema,
  PathFillSchema,
  PathGeometrySchema,
  PathSchema,
  PathStrokeSchema,
  PathStructureSchema,
  PathTransformSchema,
  StrokePathSchema,
} from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const mark = { pos: 0.5, shape: 'stealth' };

describe('Core atomic drawing contracts', () => {
  it('parses graphic paint as an independent strict fragment', () => {
    const value = { color: 'red', fill: 'none', stroke: '#000' };

    expect(GraphicPaintSchema.parse(value)).toEqual(value);
    expect(GraphicPaintSchema.safeParse({ opacity: 0.5 }).success).toBe(false);
    expect(GraphicPaintSchema.safeParse({ ...value, unknown: true }).success).toBe(false);
  });

  it('parses graphic opacity and effects with their existing bounds', () => {
    expect(GraphicOpacitySchema.parse({ opacity: { overall: 0, fill: 0.5, stroke: 1 } })).toEqual({
      opacity: { overall: 0, fill: 0.5, stroke: 1 },
    });
    expect(GraphicOpacitySchema.safeParse({ opacity: { overall: -0.1 } }).success).toBe(false);
    expect(GraphicOpacitySchema.safeParse({ opacity: { stroke: 1.1 } }).success).toBe(false);
    expect(GraphicOpacitySchema.safeParse({ fillOpacity: 0.5 }).success).toBe(false);
    expect(GraphicOpacitySchema.parse({ opacity: 0 })).toEqual({ opacity: 0 });
    expect(GraphicEffectsSchema.parse({ shadow: 'sm', blendMode: 'multiply' })).toEqual({
      shadow: 'sm',
      blendMode: 'multiply',
    });
    expect(GraphicEffectsSchema.safeParse({ effects: {} }).success).toBe(false);
  });

  it('parses shared stroke style and path stroke fragments', () => {
    const stroke = { strokeWidth: 2, dashPattern: [4, 2], dashOffset: -1 };

    expect(GraphicStrokeSchema.parse(stroke)).toEqual(stroke);
    expect(GraphicStrokeSchema.safeParse({ strokeWidth: -1 }).success).toBe(false);
    expect(GraphicStrokeSchema.safeParse({ dashPattern: [] }).success).toBe(false);
    expect(GraphicStrokeSchema.safeParse({ dashPattern: [4, -2] }).success).toBe(false);

    const graphicStroke = { ...stroke, stroke: 'red' };
    expect(GraphicStrokeSchema.parse(graphicStroke)).toEqual(graphicStroke);
    expect(GraphicStrokeSchema.safeParse({ dashed: true }).success).toBe(false);
    expect(GraphicStyleSchema.safeParse({ dashPattern: [4, 2] }).success).toBe(true);
    expect(CascadingGraphicStyleSchema.safeParse({ dashOffset: 1 }).success).toBe(true);
    expect(NodeStrokeSchema.parse({ ...graphicStroke, dashed: true, dotted: true })).toEqual({
      ...graphicStroke,
      dashed: true,
      dotted: true,
    });
    expect(NodeStrokeSchema.safeParse({ lineCap: 'round' }).success).toBe(true);

    const pathStroke = { ...graphicStroke, lineCap: 'round' as const, lineJoin: 'bevel' as const };

    expect(PathStrokeSchema.parse(pathStroke)).toEqual(pathStroke);
    expect(PathStrokeSchema.safeParse({ ...pathStroke, fillRule: 'evenodd' }).success).toBe(false);
    expect(PathStrokeSchema.safeParse({ dashed: true }).success).toBe(false);
  });

  it('parses path fill, geometry, decoration, and structure independently', () => {
    expect(PathTransformSchema.parse({ rotate: 30, scale: 2 })).toEqual({ rotate: 30, scale: 2 });
    expect(PathTransformSchema.safeParse({ cornerRadius: 3 }).success).toBe(false);
    expect(PathFillSchema.parse({ fillRule: 'evenodd' })).toEqual({ fillRule: 'evenodd' });
    expect(PathFillSchema.safeParse({ lineCap: 'round' }).success).toBe(false);

    const geometry = { cornerRadius: 3, rotate: 45, scale: 2, children: steps };

    expect(PathGeometrySchema.parse(geometry)).toEqual(geometry);
    expect(PathGeometrySchema.safeParse({ scale: 0 }).success).toBe(false);
    expect(PathGeometrySchema.safeParse({ children: [] }).success).toBe(false);

    const decoration = { label: { text: 'edge' }, marks: [mark] };

    expect(PathDecorationSchema.parse(decoration)).toEqual(decoration);
    expect(PathDecorationSchema.safeParse({ kind: 'stroke' }).success).toBe(false);

    const structure = { type: 'path' as const, kind: 'stroke' };

    expect(PathStructureSchema.parse(structure)).toEqual(structure);
    expect(PathStructureSchema.safeParse({ children: steps }).success).toBe(false);
  });

  it('keeps full Path refinement on the aggregate contract', () => {
    const path = {
      type: 'path' as const,
      children: steps,
      cornerRadius: 2,
      rotate: 15,
      scale: 1.25,
      label: { text: 'edge' },
      marks: [mark],
      style: {
        color: 'red',
        dashPattern: [4, 2],
        dashOffset: 1,
        fillRule: 'evenodd' as const,
        lineCap: 'round' as const,
        lineJoin: 'bevel' as const,
      },
    };

    expect(PathSchema.parse(path)).toEqual(path);
    expect(PathSchema.safeParse({ type: 'path' }).success).toBe(true);
    expect(PathSchema.safeParse({ ...path, kindOptions: {} }).success).toBe(true);
    expect(StrokePathSchema.safeParse({ type: 'path' }).success).toBe(false);
    expect(StrokePathSchema.safeParse({ ...path, kindOptions: {} }).success).toBe(false);
  });

  it('reuses atomic leaf schema instances in compatibility aggregates', () => {
    expect(GraphicStyleSchema.shape.color).toBe(GraphicPaintSchema.shape.color);
    expect(GraphicStyleSchema.shape.fill).toBe(GraphicPaintSchema.shape.fill);
    expect(GraphicStyleSchema.shape.stroke).toBe(GraphicPaintSchema.shape.stroke);
    expect(GraphicStyleSchema.shape.opacity).toBe(GraphicOpacitySchema.shape.opacity);
    expect(GraphicStyleSchema.shape.shadow).toBe(GraphicEffectsSchema.shape.shadow);
    expect(GraphicStyleSchema.shape.strokeWidth).toBe(GraphicStrokeSchema.shape.strokeWidth);
    expect(CascadingGraphicStyleSchema.shape.strokeWidth).toBe(GraphicStrokeSchema.shape.strokeWidth);
    expect(PathSchema.shape.type).toBe(PathStructureSchema.shape.type);
    expect(PathSchema.shape.kind).toBe(PathStructureSchema.shape.kind);
    expect(PathSchema.shape.style.unwrap().shape.dashPattern).toBe(PathStrokeSchema.shape.dashPattern);
    expect(PathSchema.shape.style.unwrap().shape.fillRule).toBe(PathFillSchema.shape.fillRule);
    expect(PathSchema.shape.children).toBe(PathGeometrySchema.shape.children);
    expect(PathSchema.shape.label).toBe(PathDecorationSchema.shape.label);
    expect(PathSchema.shape.marks).toBe(PathDecorationSchema.shape.marks);
    expect(PathDefaultSchema.shape.style.unwrap().shape.color).toBe(GraphicStyleSchema.shape.color);
    expect(PathDefaultSchema.shape.style.unwrap().shape.shadow).toBe(GraphicStyleSchema.shape.shadow);
    expect(PathDefaultSchema.shape.style.unwrap().shape.strokeWidth).toBe(PathStrokeSchema.shape.strokeWidth);
    expect(PathDefaultSchema.shape.style.unwrap().shape.fillRule).toBe(PathFillSchema.shape.fillRule);
    expect(PathDefaultSchema.shape.rotate).toBe(PathGeometrySchema.shape.rotate);
  });

  it('keeps atomic JSON round-trips lossless', () => {
    const value = {
      color: '#0f172a',
      opacity: 0.8,
      shadow: { offsetX: 1, offsetY: 2, blur: 3 },
      strokeWidth: 2,
      dashPattern: [4, 2],
      lineJoin: 'round' as const,
      fillRule: 'evenodd' as const,
      cornerRadius: 4,
      scale: { x: 1.5, y: 2 },
      label: { text: 'edge' },
      marks: [mark],
      type: 'path' as const,
      kind: 'stroke',
    };
    const restored = {
      ...GraphicPaintSchema.parse(JSON.parse(JSON.stringify({ color: value.color }))),
      ...GraphicOpacitySchema.parse(JSON.parse(JSON.stringify({ opacity: value.opacity }))),
      ...GraphicEffectsSchema.parse(JSON.parse(JSON.stringify({ shadow: value.shadow }))),
      ...GraphicStrokeSchema.parse(
        JSON.parse(JSON.stringify({ strokeWidth: value.strokeWidth, dashPattern: value.dashPattern })),
      ),
      ...PathStrokeSchema.parse(JSON.parse(JSON.stringify({ lineJoin: value.lineJoin }))),
      ...PathFillSchema.parse(JSON.parse(JSON.stringify({ fillRule: value.fillRule }))),
      ...PathGeometrySchema.parse(JSON.parse(JSON.stringify({ cornerRadius: value.cornerRadius, scale: value.scale }))),
      ...PathDecorationSchema.parse(JSON.parse(JSON.stringify({ label: value.label, marks: value.marks }))),
      ...PathStructureSchema.parse(JSON.parse(JSON.stringify({ type: value.type, kind: value.kind }))),
    };

    expect(restored).toMatchObject(value);
  });
});
