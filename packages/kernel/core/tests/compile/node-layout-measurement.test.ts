import { describe, expect, it } from 'vitest';

import type { CompiledNodeLayout, LowerTex, TextMeasurer } from '../../src/compile';
import type { CompileWarning } from '../../src/compile/warning';
import type { TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene, CompileWarningCode } from '../../src/compile';
import { flattenPrims } from '../helpers/flatten';

const measureText: TextMeasurer = (text, font) => ({
  width: text.length * font.size,
  height: font.size,
  ascent: font.size * 0.8,
  descent: font.size * 0.2,
});

const fractionalMeasureText: TextMeasurer = () => ({
  width: 1 / 3,
  height: 1 / 3,
  ascent: 1 / 4,
  descent: 1 / 12,
});

const lowerTex: LowerTex = (content, style) => {
  if (content.tex === 'INVALID') return null;
  return {
    paths: [
      {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [style.fontSize * 2, 0] },
          { kind: 'line', to: [style.fontSize * 2, style.fontSize] },
          { kind: 'close' },
        ],
        fill: { kind: 'currentColor' },
        stroke: { kind: 'none' },
      },
    ],
    width: style.fontSize * 2,
    height: style.fontSize,
    depth: style.fontSize * 0.2,
  };
};

const scene = (children: IRScene['children']): IRScene => ({ type: 'scene', version: 1, children });

const collectLayouts = (
  ir: IRScene,
  options: {
    withTex?: boolean;
    measurer?: TextMeasurer;
    precision?: number;
  } = {},
): { layouts: Array<CompiledNodeLayout>; warnings: Array<CompileWarning>; textPrims: Array<TextPrim> } => {
  const layouts: Array<CompiledNodeLayout> = [];
  const warnings: Array<CompileWarning> = [];
  const out = compileToScene(ir, {
    measureText: options.measurer ?? measureText,
    precision: options.precision,
    onWarn: warning => warnings.push(warning),
    onNodeLayout: layout => layouts.push(layout),
    ...(options.withTex === true ? { lowerTex } : {}),
  });
  const textPrims = flattenPrims(out.primitives).filter((prim): prim is TextPrim => prim.type === 'text');
  return { layouts, warnings, textPrims };
};

describe('CompileOptions.onNodeLayout', () => {
  it('reports plain node content size from text metrics', () => {
    const { layouts, textPrims } = collectLayouts(
      scene([{ type: 'node', id: 'plain', position: [0, 0], text: 'abc', font: { size: 10 } }]),
    );

    expect(layouts).toHaveLength(1);
    expect(layouts[0]).toMatchObject({
      kind: 'node',
      id: 'plain',
      content: { center: [0, 0], size: { width: 30, height: 12 } },
      text: { hasInlineTex: false, lineCount: 1 },
    });
    expect(layouts[0].content.size.width).toBe(textPrims[0].measuredWidth);
    expect(layouts[0].content.size.height).toBe(textPrims[0].measuredHeight);
  });

  it('uses the widest line and accumulated line height for multi-line content', () => {
    const { layouts } = collectLayouts(
      scene([{ type: 'node', id: 'multi', position: [0, 0], text: ['a', 'abcd'], font: { size: 10 } }]),
    );

    expect(layouts[0].content.size).toEqual({ width: 40, height: 24 });
    expect(layouts[0].text.lineCount).toBe(2);
  });

  it('adds text and lowered TeX widths on mixed lines', () => {
    const { layouts, warnings } = collectLayouts(
      scene([{ type: 'node', id: 'formula', position: [0, 0], text: 'A $x$ B', font: { size: 10 } }]),
      { withTex: true },
    );

    expect(warnings).toEqual([]);
    expect(layouts[0].content.size).toEqual({ width: 60, height: 12 });
    expect(layouts[0].text).toEqual({ hasInlineTex: true, lineCount: 1 });
  });

  it('measures string TeX sugar literally when lowerTex is missing', () => {
    const { layouts, warnings } = collectLayouts(
      scene([{ type: 'node', id: 'literal', position: [0, 0], text: 'A $x$ B', font: { size: 10 } }]),
    );

    expect(layouts[0].content.size.width).toBe(70);
    expect(layouts[0].text.hasInlineTex).toBe(false);
    expect(warnings).toEqual([]);
  });

  it('skips explicit math runs and warns when lowerTex is missing', () => {
    const { layouts, warnings } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'explicit',
          position: [0, 0],
          text: [{ runs: [{ text: 'A' }, { tex: 'x' }, { text: 'B' }] }],
          font: { size: 10 },
        },
      ]),
    );

    expect(layouts[0].content.size.width).toBe(20);
    expect(layouts[0].text.hasInlineTex).toBe(false);
    expect(warnings.some(warning => warning.code === CompileWarningCode.TexLowererMissing)).toBe(true);
  });

  it('skips invalid TeX runs and preserves warnings', () => {
    const { layouts, warnings } = collectLayouts(
      scene([{ type: 'node', id: 'invalid', position: [0, 0], text: 'A $INVALID$ B', font: { size: 10 } }]),
      { withTex: true },
    );

    expect(layouts[0].content.size.width).toBe(40);
    expect(layouts[0].text.hasInlineTex).toBe(false);
    expect(warnings.some(warning => warning.code === CompileWarningCode.TexInvalid)).toBe(true);
  });

  it('throws through observer errors', () => {
    const ir = scene([{ type: 'node', id: 'boom', position: [0, 0], text: 'x' }]);

    expect(() =>
      compileToScene(ir, {
        measureText,
        onNodeLayout: () => {
          throw new Error('observer failed');
        },
      }),
    ).toThrow('observer failed');
  });

  it('reports diagnostic irPath for anonymous nodes without locking exact locator text', () => {
    const { layouts } = collectLayouts(scene([{ type: 'node', position: [0, 0], text: 'x' }]));

    expect(layouts[0].id).toBeUndefined();
    expect(layouts[0].irPath).toContain('node');
  });

  it('keeps content.size on node axes and projects scope scale into content.bounds', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 3 }],
          children: [{ type: 'node', id: 'scaled', position: [10, 0], text: 'AB', font: { size: 10 } }],
        },
      ]),
    );

    expect(layouts[0].content.center).toEqual([20, 0]);
    expect(layouts[0].content.size).toEqual({ width: 20, height: 12 });
    expect(layouts[0].content.bounds).toEqual({ x: 0, y: -18, width: 40, height: 36 });
  });

  it('projects rotated scope content corners into a global AABB', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 90 }],
          children: [{ type: 'node', id: 'rotated', position: [10, 0], text: 'AB', font: { size: 10 } }],
        },
      ]),
    );

    expect(layouts[0].content.center[0]).toBeCloseTo(0, 6);
    expect(layouts[0].content.center[1]).toBeCloseTo(10, 6);
    expect(layouts[0].content.bounds.x).toBeCloseTo(-6, 6);
    expect(layouts[0].content.bounds.y).toBeCloseTo(0, 6);
    expect(layouts[0].content.bounds.width).toBeCloseTo(12, 6);
    expect(layouts[0].content.bounds.height).toBeCloseTo(20, 6);
  });

  it('keeps asymmetric padding out of content size but shifts the visual rect', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'padded',
          position: [0, 0],
          text: 'A',
          font: { size: 10 },
          padding: { left: 0, right: 20, top: 0, bottom: 0 },
        },
      ]),
    );

    expect(layouts[0].content.center).toEqual([0, 0]);
    expect(layouts[0].content.size).toEqual({ width: 10, height: 12 });
    expect(layouts[0].rect.x).toBeGreaterThan(layouts[0].content.center[0]);
    expect(layouts[0].rect.width).toBeGreaterThan(layouts[0].content.size.width);
  });

  it('does not include node labels in content size', () => {
    const base = collectLayouts(scene([{ type: 'node', id: 'base', position: [0, 0], text: 'A', font: { size: 10 } }]));
    const withLabel = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'labelled',
          position: [0, 0],
          text: 'A',
          font: { size: 10 },
          label: { text: 'long label', position: 'top' },
        },
      ]),
    );

    expect(withLabel.layouts[0].content.size).toEqual(base.layouts[0].content.size);
  });

  it('keeps observer measurements at double precision when Scene output is rounded', () => {
    const { layouts, textPrims } = collectLayouts(
      scene([{ type: 'node', id: 'precise', position: [0, 0], text: 'x', font: { size: 10 } }]),
      { measurer: fractionalMeasureText, precision: 0 },
    );

    expect(layouts[0].content.size.width).toBeCloseTo(1 / 3, 8);
    expect(textPrims[0].measuredWidth).toBe(0);
  });
});
