import { describe, expect, it } from 'vitest';

import type { NodeLayoutObservation, TexLowerer, TextMeasurer } from '../../src/compile';
import { compileToScene, BuiltinCompileWarningCode, isNodeLayoutCompileArtifact } from '../../src/compile';
import type { CompileWarning } from '../../src/compile/warning';
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
): { layouts: Array<NodeLayoutObservation>; warnings: Array<CompileWarning>; textPrims: Array<TextPrimitive> } => {
  const warnings: Array<CompileWarning> = [];
  const result = compileToScene(ir, {
    measureText: options.measurer ?? measureText,
    precision: options.precision,
    onWarn: warning => warnings.push(warning),
    artifacts: { nodeLayouts: true },
    ...(options.withTex === true ? { lowerTex } : {}),
  });
  const out = result.scene;
  const layouts = result.artifacts.filter(isNodeLayoutCompileArtifact).map(artifact => artifact.value);
  const textPrims = flattenPrims(out.primitives).filter((prim): prim is TextPrimitive => prim.type === 'text');

  return { layouts, warnings, textPrims };
};

describe('CompileOptions.artifacts.nodeLayouts', () => {
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
    expect(layouts[0]).toMatchObject({
      kind: 'node',
      id: 'plain',
      content: { center: [0, 0], size: { width: 30, height: 12 } },
      text: { hasInlineTex: false, lineCount: 1 },
    });
    expect(layouts[0].content.size.width).toBe(textPrims[0].measuredWidth);
    expect(layouts[0].content.size.height).toBe(textPrims[0].measuredHeight);
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

    expect(layouts[0].content.size).toEqual({ width: 40, height: 24 });
    expect(layouts[0].text.lineCount).toBe(2);
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
    expect(layouts[0].content.size).toEqual({ width: 60, height: 12 });
    expect(layouts[0].text).toEqual({ hasInlineTex: true, lineCount: 1 });
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

    expect(layouts[0].content.size.width).toBe(70);
    expect(layouts[0].text.hasInlineTex).toBe(false);
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

    expect(layouts[0].content.size.width).toBe(20);
    expect(layouts[0].text.hasInlineTex).toBe(false);
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

    expect(layouts[0].content.size.width).toBe(40);
    expect(layouts[0].text.hasInlineTex).toBe(false);
    expect(warnings.some(warning => warning.code === BuiltinCompileWarningCode.TexInvalid)).toBe(true);
  });

  it('在产物信封中定位匿名节点', () => {
    const result = compileToScene(scene([{ type: 'node', position: [0, 0], text: 'x' }]), {
      artifacts: { nodeLayouts: true },
    });
    const artifact = result.artifacts.find(isNodeLayoutCompileArtifact);

    expect(artifact?.value.id).toBeUndefined();
    expect(artifact?.occurrence).toEqual({
      sourcePath: 'children[0].node',
      expansionPath: [],
    });
  });

  it('将 content.size 保留在节点轴上，并将范围比例投影到 content.bounds 中', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 3 }],
          children: [
            {
              type: 'node',
              id: 'scaled',
              position: [10, 0],
              text: 'AB',
              style: { font: { size: 10 } },
            },
          ],
        },
      ]),
    );

    expect(layouts[0].content.center).toEqual([20, 0]);
    expect(layouts[0].content.size).toEqual({ width: 20, height: 12 });
    expect(layouts[0].content.bounds).toEqual({ x: 0, y: -18, width: 40, height: 36 });
  });

  it('项目将范围内容角旋转到全局 AABB', () => {
    const { layouts } = collectLayouts(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 90 }],
          children: [
            {
              type: 'node',
              id: 'rotated',
              position: [10, 0],
              text: 'AB',
              style: { font: { size: 10 } },
            },
          ],
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

    expect(layouts[0].content.center).toEqual([0, 0]);
    expect(layouts[0].content.size).toEqual({ width: 10, height: 12 });
    expect(layouts[0].rect.x).toBeGreaterThan(layouts[0].content.center[0]);
    expect(layouts[0].rect.width).toBeGreaterThan(layouts[0].content.size.width);
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

    expect(withLabel.layouts[0].content.size).toEqual(base.layouts[0].content.size);
  });

  it('当 Scene 输出四舍五入时，使观察者测量保持双精度', () => {
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

    expect(layouts[0].content.size.width).toBeCloseTo(1 / 3, 8);
    expect(textPrims[0].measuredWidth).toBe(0);
  });
});
