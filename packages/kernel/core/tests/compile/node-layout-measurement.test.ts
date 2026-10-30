import { describe, expect, it } from 'vitest';

import type { TexLowerer, TextMeasurer } from '../../src/compile';
import { BuiltinCompileWarningCode } from '../../src/compile';
import { createFullCompileContext, createSharedCompileContext } from '../../src/compile/context';
import type { CompiledNodeLayout } from '../../src/compile/node';
import { CompileManager } from '../../src/compile/orchestration';
import type { InputCompileWarning } from '../../src/compile/warning';
import type { TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';
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

const lowerTex: TexLowerer = (content, style) => {
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
): {
  layouts: Array<CompiledNodeLayout>;
  warnings: ReadonlyArray<InputCompileWarning>;
  textPrims: Array<TextPrimitive>;
} => {
  const context = createFullCompileContext(ir, {
    measureText: options.measurer ?? measureText,
    precision: options.precision,

    ...(options.withTex === true ? { lowerTex } : {}),
  });
  const out = new CompileManager(context).compileSubtree(ir.children);
  const layouts = out.layouts;
  const textPrims = flattenPrims(out.primitives).filter((prim): prim is TextPrimitive => prim.type === 'text');

  return { layouts, warnings: context.workspace.diagnostics.warnings, textPrims };
};

describe('Node 内容测量', () => {
  it('复用环境时，每次完整编译仍独立调用宿主测量并保持相同布局', () => {
    let calls = 0;
    const shared = createSharedCompileContext({
      measureText: (text, font) => {
        calls += 1;
        return measureText(text, font);
      },
    });
    const ir = scene([{ type: 'node', position: [0, 0], text: 'shared context' }]);
    const firstContext = createFullCompileContext(ir, {}, shared);
    const secondContext = createFullCompileContext(ir, {}, shared);
    const first = new CompileManager(firstContext).compileSubtree(ir.children);
    const firstCalls = calls;
    const second = new CompileManager(secondContext).compileSubtree(ir.children);

    expect(firstCalls).toBeGreaterThan(0);
    expect(calls).toBe(firstCalls * 2);
    expect(second.primitives).toEqual(first.primitives);
    expect(second.layouts[0].geometry.contentSize).toEqual(first.layouts[0].geometry.contentSize);
    expect(firstContext.workspace.diagnostics.warnings).toEqual([]);
    expect(secondContext.workspace.diagnostics.warnings).toEqual([]);
  });

  it('根据文本指标报告纯节点内容大小', () => {
    const { layouts, textPrims } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'plain',
          position: [0, 0],
          text: 'abc',
          style: { font: { size: 10 } },
        },
      ]),
    );

    expect(layouts).toHaveLength(1);
    expect(layouts[0].geometry).toMatchObject({ contentCenter: [0, 0], contentSize: { width: 30, height: 12 } });
    expect(layouts[0].geometry.contentSize.width).toBe(textPrims[0].measuredWidth);
    expect(layouts[0].geometry.contentSize.height).toBe(textPrims[0].measuredHeight);
  });

  it('对多行内容使用最宽的行和累积行高', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'multi',
          position: [0, 0],
          text: ['a', 'abcd'],
          style: { font: { size: 10 } },
        },
      ]),
    );

    expect(layouts[0].geometry.contentSize).toEqual({ width: 40, height: 24 });
    expect(layouts[0].text?.lines.length).toBe(2);
  });

  it('累加混合行中文本及已下沉 TeX 的宽度', () => {
    const { layouts, warnings } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'formula',
          position: [0, 0],
          text: 'A $x$ B',
          style: { font: { size: 10 } },
        },
      ]),
      { withTex: true },
    );

    expect(warnings).toEqual([]);
    expect(layouts[0].geometry.contentSize).toEqual({ width: 60, height: 12 });
    expect(layouts[0].text?.kind).toBe('inline');
    expect(layouts[0].text?.lines).toHaveLength(1);
  });

  it('当 lowerTex 缺失时，按字面意思测量字符串 TeX 糖', () => {
    const { layouts, warnings } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'literal',
          position: [0, 0],
          text: 'A $x$ B',
          style: { font: { size: 10 } },
        },
      ]),
    );

    expect(layouts[0].geometry.contentSize.width).toBe(70);

    expect(warnings).toEqual([]);
  });

  it('跳过显式数学段并在 lowerTex 丢失时发出警告', () => {
    const { layouts, warnings } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'explicit',
          position: [0, 0],
          text: [{ segments: [{ text: 'A' }, { tex: 'x' }, { text: 'B' }] }],
          style: { font: { size: 10 } },
        },
      ]),
    );

    expect(layouts[0].geometry.contentSize.width).toBe(20);

    expect(warnings.some(warning => warning.code === BuiltinCompileWarningCode.TexLowererMissing)).toBe(true);
  });

  it('跳过无效的 TeX 运行并保留警告', () => {
    const { layouts, warnings } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'invalid',
          position: [0, 0],
          text: 'A $INVALID$ B',
          style: { font: { size: 10 } },
        },
      ]),
      { withTex: true },
    );

    expect(layouts[0].geometry.contentSize.width).toBe(40);

    expect(warnings.some(warning => warning.code === BuiltinCompileWarningCode.TexInvalid)).toBe(true);
  });

  it('非对称内边距不计入内容尺寸但会偏移视觉矩形', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'padded',
          position: [0, 0],
          text: 'A',
          style: { font: { size: 10 } },
          layout: { padding: { left: 0, right: 20, top: 0, bottom: 0 } },
        },
      ]),
    );

    expect(layouts[0].geometry.contentCenter).toEqual([0, 0]);
    expect(layouts[0].geometry.contentSize).toEqual({ width: 10, height: 12 });
    expect(layouts[0].geometry.rect.x).toBeGreaterThan(layouts[0].geometry.contentCenter[0]);
    expect(layouts[0].geometry.rect.width).toBeGreaterThan(layouts[0].geometry.contentSize.width);
  });

  it('内容大小中不包括节点标签', () => {
    const base = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'base',
          position: [0, 0],
          text: 'A',
          style: { font: { size: 10 } },
        },
      ]),
    );
    const withLabel = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'labelled',
          position: [0, 0],
          text: 'A',
          label: { text: 'long label', position: 'top' },
          style: { font: { size: 10 } },
        },
      ]),
    );

    expect(withLabel.layouts[0].geometry.contentSize).toEqual(base.layouts[0].geometry.contentSize);
  });

  it('当 Scene 输出四舍五入时，使内部测量保持双精度', () => {
    const { layouts, textPrims } = collectLayouts(
      scene([
        {
          type: 'node',
          id: 'precise',
          position: [0, 0],
          text: 'x',
          style: { font: { size: 10 } },
        },
      ]),
      { measurer: fractionalMeasureText, precision: 0 },
    );

    expect(layouts[0].geometry.contentSize.width).toBeCloseTo(1 / 3, 8);
    expect(textPrims[0].measuredWidth).toBe(0);
  });
});
