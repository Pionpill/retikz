import { describe, expect, it, vi } from 'vitest';

import type { TexLowerer } from '../../../../core/src/compile';
import { BuiltinCompileWarningCode } from '../../../../core/src/compile';
import type { CompiledNode } from '../../../../core/src/compile/node';
import type { CompileWarning } from '../../../../core/src/compile/shared';
import type { TextMeasurer, TextPrimitive } from '../../../../core/src/contract';
import type { IRScene } from '../../../../core/src/schemas';
import { flattenPrims } from '../../../../core/tests/helpers/flatten';
import { createSharedCompileContext } from '../../../src/compile';
import { createCompileRuntime } from '../../../src/compile/runtime';
import { CompileManager } from '../../../src/compile/tree';
import { SubtreeCompiler } from '../../../src/compile/tree/subtree';

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
  layouts: Array<CompiledNode>;
  warnings: ReadonlyArray<CompileWarning>;
  textPrims: Array<TextPrimitive>;
} => {
  const context = createCompileRuntime(ir, {
    measureText: options.measurer ?? measureText,
    precision: options.precision,

    ...(options.withTex === true ? { lowerTex } : {}),
  });
  let layouts: Array<CompiledNode> = [];
  const run = SubtreeCompiler.prototype.run;
  const observeLayouts = vi
    .spyOn(SubtreeCompiler.prototype, 'run')
    .mockImplementation(function (this: SubtreeCompiler) {
      const out = run.call(this);
      layouts = out.geometries.filter((layout): layout is CompiledNode => 'metadata' in layout);
      return out;
    });
  try {
    const { result } = new CompileManager(context).compileScene(ir);
    const textPrims = flattenPrims(result.scene.primitives).filter(
      (prim): prim is TextPrimitive => prim.type === 'text',
    );
    return { layouts, warnings: context.state.workspace.diagnosticCollector.warnings, textPrims };
  } finally {
    observeLayouts.mockRestore();
  }
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
    const firstContext = createCompileRuntime(ir, {}, {}, shared);
    const secondContext = createCompileRuntime(ir, {}, {}, shared);
    const first = new CompileManager(firstContext).compileScene(ir);
    const firstCalls = calls;
    const second = new CompileManager(secondContext).compileScene(ir);

    expect(firstCalls).toBeGreaterThan(0);
    expect(calls).toBe(firstCalls * 2);
    expect(second.result.scene).toEqual(first.result.scene);
    expect(firstContext.state.workspace.diagnosticCollector.warnings).toEqual([]);
    expect(secondContext.state.workspace.diagnosticCollector.warnings).toEqual([]);
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
    expect(layouts[0].layout).toMatchObject({ contentCenter: [0, 0], contentSize: { width: 30, height: 12 } });
    expect(layouts[0].layout.contentSize.width).toBe(textPrims[0].measuredWidth);
    expect(layouts[0].layout.contentSize.height).toBe(textPrims[0].measuredHeight);
  });

  it('对多行内容使用最宽的行和累积行高', () => {
    const { layouts, textPrims } = collectLayouts(
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

    expect(layouts[0].layout.contentSize).toEqual({ width: 40, height: 24 });
    expect(textPrims.flatMap(primitive => primitive.lines.map(line => line.text))).toEqual(['a', 'abcd']);
  });

  it('累加混合行中文本及已下沉 TeX 的宽度', () => {
    const { layouts, warnings, textPrims } = collectLayouts(
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
    expect(layouts[0].layout.contentSize).toEqual({ width: 60, height: 12 });
    expect(textPrims.flatMap(primitive => primitive.lines.map(line => line.text))).toEqual(['A ', ' B']);
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

    expect(layouts[0].layout.contentSize.width).toBe(70);

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

    expect(layouts[0].layout.contentSize.width).toBe(20);

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

    expect(layouts[0].layout.contentSize.width).toBe(40);

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

    expect(layouts[0].layout.contentCenter).toEqual([0, 0]);
    expect(layouts[0].layout.contentSize).toEqual({ width: 10, height: 12 });
    expect(layouts[0].geometry.rect.x).toBeGreaterThan(layouts[0].layout.contentCenter[0]);
    expect(layouts[0].geometry.rect.width).toBeGreaterThan(layouts[0].layout.contentSize.width);
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

    expect(withLabel.layouts[0].layout.contentSize).toEqual(base.layouts[0].layout.contentSize);
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

    expect(layouts[0].layout.contentSize.width).toBeCloseTo(1 / 3, 8);
    expect(textPrims[0].measuredWidth).toBe(0);
  });
});
