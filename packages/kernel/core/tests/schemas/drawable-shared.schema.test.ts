import { describe, expect, it } from 'vitest';

import { DrawableInstanceSchema, GraphicStyleSchema, PathLabelSchema, PathSchema } from '../../src';

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

describe('可绘制共享 schema', () => {
  it('接受描边路径上的共享可绘制样式和实例字段', () => {
    const parsed = PathSchema.parse(
      path({
        id: 'edge-a',
        zIndex: 3,
        meta: { series: 'a' },
        animations: [fade],
        style: {
          color: 'crimson',
          fill: '#fee2e2',
          stroke: '#991b1b',
          strokeWidth: 2,
          shadow: 'md',
          blendMode: 'multiply',
          opacity: { fill: 0.4, stroke: 0.7, overall: 0.8 },
        },
      }),
    );

    expect(parsed).toMatchObject({
      id: 'edge-a',
      zIndex: 3,
      meta: { series: 'a' },
      style: { color: 'crimson', fill: '#fee2e2', stroke: '#991b1b' },
    });
  });

  it('接受自定义路径上的共享可绘制样式和实例字段', () => {
    const parsed = PathSchema.parse(
      path({
        kind: 'custom',
        kindOptions: { width: 12 },
        id: 'flow-a',
        zIndex: 4,
        meta: { row: 1 },
        animations: [fade],
        style: {
          color: 'teal',
          fill: '#ccfbf1',
          stroke: '#0f766e',
          strokeWidth: 1.5,
          shadow: { offsetX: 1, offsetY: 2, blur: 3 },
          blendMode: 'screen',
          opacity: { fill: 0.5, stroke: 0.75, overall: 0.9 },
        },
      }),
    );

    expect(parsed).toMatchObject({
      id: 'flow-a',
      zIndex: 4,
      meta: { row: 1 },
      style: { color: 'teal', fill: '#ccfbf1', stroke: '#0f766e' },
    });
  });

  it('将路径标签重用为步骤标签和路径宿主标签', () => {
    const label = { text: '128', position: 0.75, sloped: true };

    expect(PathLabelSchema.parse(label)).toEqual(label);
    expect(PathSchema.parse(path({ label })).label).toEqual(label);
    expect(PathLabelSchema.safeParse({ ...label, placement: 'inside' }).success).toBe(false);
  });

  it('保持边缘标签侧面规范并拒绝解析器糖别名', () => {
    expect(PathLabelSchema.parse({ text: 'x', side: 'top' })).toMatchObject({ side: 'top' });
    expect(PathLabelSchema.parse({ text: 'x', side: 'bottom' })).toMatchObject({ side: 'bottom' });
    expect(() => PathLabelSchema.parse({ text: 'x', side: 'north' })).toThrow();
    expect(() => PathLabelSchema.parse({ text: 'x', side: 'above' })).toThrow();
  });

  it('仅当自定义 schema 拒绝嵌套在种类选项中的未知字段时才拒绝它们', () => {
    for (const field of ['dashPattern', 'arrow', 'arrowDetail', 'lineCap', 'lineJoin', 'cornerRadius']) {
      const value = field === 'dashPattern' ? [4, 2] : 'round';

      expect(PathSchema.safeParse(path({ kind: 'custom', kindOptions: { width: 12, [field]: value } })).success).toBe(
        true,
      );
    }
  });

  it('拒绝路径宿主顶层的未知字段', () => {
    for (const field of ['width', 'start', 'end', 'interpolation', 'align', 'samples', 'sampling', 'upper', 'lower']) {
      expect(PathSchema.safeParse(path({ [field]: field === 'width' ? 12 : {} })).success).toBe(false);
    }
  });

  it('将实例字段保留在图形样式 schema 之外', () => {
    expect(GraphicStyleSchema.safeParse({ id: 'x' }).success).toBe(false);
    expect(GraphicStyleSchema.safeParse({ meta: { x: 1 } }).success).toBe(false);
    expect(GraphicStyleSchema.safeParse({ animations: [] }).success).toBe(false);
    expect(GraphicStyleSchema.safeParse({ zIndex: 1 }).success).toBe(false);
    expect(DrawableInstanceSchema.safeParse({ zIndex: 1, meta: { ok: true } }).success).toBe(true);
  });

  it('拒绝私有标签字段', () => {
    expect(PathSchema.safeParse(path({ label: { text: 'x', side: 'upper' } })).success).toBe(false);
    expect(PathSchema.safeParse(path({ label: { text: 'x', rotate: 'sloped' } })).success).toBe(false);
  });

  it('保持共享样式 schema JSON 可往返', () => {
    const style = {
      color: '#0f172a',
      fill: '#e0f2fe',
      stroke: '#0369a1',
      strokeWidth: 2,
      opacity: { overall: 0.8, fill: 0.4, stroke: 0.6 },
      shadow: 'sm',
      blendMode: 'multiply',
    };

    expect(GraphicStyleSchema.parse(JSON.parse(JSON.stringify(style)))).toEqual(style);
  });
});
