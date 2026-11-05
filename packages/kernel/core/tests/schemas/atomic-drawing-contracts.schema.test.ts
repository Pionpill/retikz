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

describe('Core 原子绘图契约', () => {
  it('将图形绘制解析为独立的严格片段', () => {
    const value = { color: 'red', fill: 'none', stroke: '#000' };

    expect(GraphicPaintSchema.parse(value)).toEqual(value);
    expect(GraphicPaintSchema.safeParse({ opacity: 0.5 }).success).toBe(false);
    expect(GraphicPaintSchema.safeParse({ ...value, unknown: true }).success).toBe(false);
  });

  it('解析图形不透明度和效果及其现有边界', () => {
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

  it('解析共享描边样式和路径描边片段', () => {
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

  it('独立解析路径填充、几何、装饰和结构', () => {
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

  it('对聚合契约保持完整的 Path 细化', () => {
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

  it('保持原子 JSON 往返无损', () => {
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
