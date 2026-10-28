import { describe, expect, it, vi } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import { BuiltinCompileWarningCode } from '../../src/compile/constants';
import type { TexLowerer, TextMeasurer, TextMetrics } from '../../src/compile/text';
import { resolveTextMetrics } from '../../src/compile/text';
import type { CompileWarning } from '../../src/compile/warning';
import type { PathPrimitive, ScenePrimitive, TextPrimitive } from '../../src/contract';
import { RetikzCoreError } from '../../src/error';
import type { IRNode, IRNodeLabel, IRScene } from '../../src/schemas';
import { NodeLabelSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';
import { sceneRectangles } from '../helpers/scene-rectangles';

const LABEL_METRICS: TextMetrics = {
  width: 40,
  height: 20,
  ascent: 15,
  descent: 5,
};

const fixedMeasure: TextMeasurer = () => LABEL_METRICS;

const sceneWithLabel = (label: IRNodeLabel, node: Partial<IRNode> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      position: [0, 0],
      ...node,
      label,
      layout: { minimumSize: { width: 100, height: 60 }, ...node.layout },
    },
  ],
});

const labelText = (primitives: Array<ScenePrimitive>, text = 'L'): TextPrimitive => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is TextPrimitive =>
      candidate.type === 'text' && candidate.lines.some(line => line.text === text),
  );
  if (primitive === undefined) throw new Error(`missing label text '${text}'`);

  return primitive;
};

const visualCenterY = (primitive: TextPrimitive, metrics = LABEL_METRICS): number =>
  primitive.y - ((metrics.ascent ?? 0) - (metrics.descent ?? 0)) / 2;

const pinLine = (primitives: Array<ScenePrimitive>): PathPrimitive => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is PathPrimitive =>
      candidate.type === 'path' &&
      candidate.commands.length === 2 &&
      candidate.commands[0]?.kind === 'move' &&
      candidate.commands[1]?.kind === 'line',
  );
  if (primitive === undefined) throw new Error('missing pin line');

  return primitive;
};

describe('Node 标签视觉框间距', () => {
  it('附加多行块并将其 pin 终止于整个视觉框', () => {
    const scene = compileToScene(
      sceneWithLabel({ text: ['first', 'second'], position: 'top', distance: 8, pin: true }),
      {
        measureText: fixedMeasure,
        padding: 0,
      },
    ).scene;
    expect(labelText(scene.primitives, 'first').y).toBeCloseTo(-63);
    expect(labelText(scene.primitives, 'second').y).toBeCloseTo(-43);
    expect(pinLine(scene.primitives).commands).toEqual([
      { kind: 'move', to: [0, -30] },
      { kind: 'line', to: [0, -38] },
    ]);
  });
  it('使用距离作为与测量的视觉框的右侧间隙', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', distance: 8 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(78);
    expect(visualCenterY(label)).toBeCloseTo(0);
  });

  it('将最终旋转的 OBB 投影到放置方向上', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'top', distance: 8, rotate: 90 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(0);
    expect(visualCenterY(label)).toBeCloseTo(-58);
  });

  it('在相同的视觉范围内放置内部标签，无需夹紧', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', placement: 'inside', distance: 0 }), {
      measureText: fixedMeasure,
      padding: 0,
    }).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(30);
  });

  it('将中心位置保持在最终的 Node 矩形中心并忽略距离', () => {
    const scene = compileToScene(
      sceneWithLabel(
        { text: 'L', position: 'center', distance: 999 },
        {
          layout: { padding: { left: 0, right: 20, top: 0, bottom: 0 }, minimumSize: 0 },
        },
      ),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;
    const label = labelText(scene.primitives);

    expect(label.x).toBeCloseTo(10);
    expect(visualCenterY(label)).toBeCloseTo(0);
  });

  it('在非对称填充建立最终矩形后解析标签几何形状', () => {
    const scene = compileToScene(
      sceneWithLabel(
        { text: 'L', position: 'right', distance: 8 },
        {
          layout: { padding: { left: 0, right: 20, top: 0, bottom: 0 }, minimumSize: 0 },
        },
      ),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(48);
  });

  it('在锚点位置平移最终的 Node 后保持 centerOffset 有效', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'target', position: [100, 0] },
        {
          type: 'node',
          position: { kind: 'anchor', target: { id: 'target' } },
          label: { text: 'L', position: 'right', distance: 8 },
          layout: { minimumSize: { width: 100, height: 60 } },
        },
      ],
    };
    const scene = compileToScene(ir, { measureText: fixedMeasure, padding: 0 }).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(178);
  });

  it('以未缩放的用户单位保持 Node.scale 距离', () => {
    const scene = compileToScene(
      sceneWithLabel({ text: 'L', position: 'right', distance: 8 }, { scale: { x: 2, y: 1 } }),
      { measureText: fixedMeasure, padding: 0 },
    ).scene;

    expect(labelText(scene.primitives).x).toBeCloseTo(128);
  });

  it('将非均匀 Scope 比例应用于完整解析的几何体', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 3 }],
          children: sceneWithLabel({ text: 'L', position: 'right', distance: 8 }).children,
        },
      ],
    };
    const scene = compileToScene(ir, { measureText: fixedMeasure, padding: 0 }).scene;

    expect(scene.layout.width).toBeCloseTo(296);
    expect(scene.layout.height).toBeCloseTo(180);
  });
});

describe('Node 标签解析指标', () => {
  it.each([
    [
      { width: 40, height: 20 },
      { height: 20, ascent: 10, descent: 10 },
    ],
    [
      { width: 40, height: 20, ascent: 8 },
      { height: 20, ascent: 8, descent: 12 },
    ],
    [
      { width: 40, height: 20, descent: 2 },
      { height: 20, ascent: 18, descent: 2 },
    ],
    [
      { width: 40, height: 20, ascent: 8, descent: 2 },
      { height: 20, ascent: 13, descent: 7 },
    ],
    [
      { width: 40, height: 20, ascent: 15, descent: 10 },
      { height: 25, ascent: 15, descent: 10 },
    ],
  ] satisfies Array<[TextMetrics, Pick<TextMetrics, 'height' | 'ascent' | 'descent'>]>)(
    '标准化缺失、部分、领先和溢出的基线指标',
    (metrics, expected) => {
      expect(resolveTextMetrics(metrics)).toMatchObject(expected);
    },
  );

  it('对字母基线和 measuredHeight 使用归一化上升/下降', () => {
    const metrics: TextMetrics = { width: 40, height: 30, ascent: 8, descent: 2 };
    const measureText = vi.fn<TextMeasurer>(() => metrics);
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), { measureText, padding: 0 }).scene;
    const label = labelText(scene.primitives);

    expect(measureText).toHaveBeenCalledTimes(1);
    expect(label.measuredWidth).toBe(40);
    expect(label.measuredHeight).toBe(30);
    expect(label.y).toBeCloseTo(3);
  });

  it.each([
    ['width', { width: Number.NaN, height: 20 }],
    ['height', { width: 40, height: -1 }],
    ['ascent', { width: 40, height: 20, ascent: Number.POSITIVE_INFINITY }],
    ['descent', { width: 40, height: 20, descent: -1 }],
  ] satisfies Array<[string, TextMetrics]>)('因无效的 %s 指标而失败', (_field, metrics) => {
    expect(
      () =>
        compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), { measureText: () => metrics, padding: 0 })
          .scene,
    ).toThrow(/resolveTextMetrics: invalid/);
  });

  it('当单独有限的上升和下降合计溢出时，会失败', () => {
    expect(
      () =>
        compileToScene(sceneWithLabel({ text: 'L', position: 'center' }), {
          measureText: () => ({
            width: 1,
            height: 1,
            ascent: 1e308,
            descent: 1e308,
          }),
        }).scene,
    ).toThrow(/resolveTextMetrics: invalid/);
  });

  it('拒绝混合 Node 标签和混合 Node 正文文本的无效指标', () => {
    const invalidHeight: TextMeasurer = () => ({ width: 10, height: -1, ascent: 6, descent: 2 });
    const labelScene = sceneWithLabel({ text: [{ segments: [{ text: 'L' }] }], position: 'center' });
    const nodeTextScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: [{ segments: [{ text: 'body' }] }] }],
    };

    expect(() => compileToScene(labelScene, { measureText: invalidHeight }).scene).toThrow(
      /resolveTextMetrics: invalid/,
    );
    expect(() => compileToScene(nodeTextScene, { measureText: invalidHeight }).scene).toThrow(
      /resolveTextMetrics: invalid/,
    );
  });

  it('拒绝 Node 标签路径上格式错误的 LoweredTex', () => {
    const lowerTex: TexLowerer = () => ({
      paths: [],
      width: -1,
      height: 20,
      depth: 2,
    });

    expect(() =>
      compileToScene(sceneWithLabel({ text: [{ segments: [{ tex: 'x' }] }], position: 'center' }), {
        lowerTex,
        measureText: fixedMeasure,
      }),
    ).toThrow(RetikzCoreError);
  });

  it('将 lowerTex 保留为空，作为 Node 标签路径上基于警告的缺失', () => {
    const warnings: Array<CompileWarning> = [];
    const scene = compileToScene(sceneWithLabel({ text: [{ segments: [{ tex: 'x' }] }], position: 'center' }), {
      lowerTex: () => null,
      measureText: fixedMeasure,
      onWarn: warning => warnings.push(warning),
    }).scene;

    expect(warnings.some(warning => warning.code === BuiltinCompileWarningCode.TexInvalid)).toBe(true);
    expect(
      flattenPrims(scene.primitives).some(primitive => primitive.type === 'path' && primitive.fillRule !== undefined),
    ).toBe(false);
  });
});

describe('Node 标签 pin 和边界', () => {
  it('在精确旋转的 OBB 边缘处结束 pin，无需传统填充', () => {
    const scene = compileToScene(
      sceneWithLabel({ text: 'L', position: 'right', distance: 10, rotate: 45, pin: true }),
      { measureText: fixedMeasure, padding: 0, precision: 4 },
    ).scene;
    const pin = pinLine(scene.primitives);
    const end = pin.commands[1];

    expect(end).toMatchObject({ kind: 'line' });

    if (end.kind === 'line') {
      expect(end.to[0]).toBeCloseTo(67.0711, 3);
      expect(end.to[1]).toBeCloseTo(0, 3);
    }
  });

  it('包括自动 Scene 边界中的所有变换后的标签角', () => {
    const scene = compileToScene(sceneWithLabel({ text: 'L', position: 'right', distance: 8, rotate: 45 }), {
      measureText: fixedMeasure,
      padding: 0,
      precision: 4,
    }).scene;

    expect(scene.layout.width).toBeCloseTo(150.4264, 3);
    expect(scene.layout.height).toBeCloseTo(60);
  });

  it('将标签和 pin 保留在 Scope id 合成 bbox 之外', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'cluster',
          children: [
            {
              type: 'node',
              position: [0, 0],
              label: { text: 'L', position: 'right', distance: 100, pin: true },
              layout: { minimumSize: { width: 100, height: 60 } },
            },
          ],
        },
        {
          type: 'node',
          id: 'marker',
          position: { kind: 'anchor', target: { id: 'cluster', anchor: 'right' } },
          layout: { minimumSize: 0, padding: 0 },
        },
      ],
    };
    const result = compileToScene(ir, {
      measureText: fixedMeasure,
      padding: 0,
    });
    const markerX = sceneRectangles(result.scene).find(rectangle => rectangle.id === 'marker')?.rect.x;

    expect(markerX).toBeCloseTo(50);
  });
});

describe('Node 标签距离契约', () => {
  it('将距离描述为视觉盒间隙', () => {
    expect(NodeLabelSchema.shape.distance.description).toMatch(/visual box/i);
    expect(NodeLabelSchema.shape.distance.description).not.toMatch(/label center/i);
  });

  it('在任何布局之前验证 CompileOptions.labelDistance', () => {
    const empty: IRScene = { version: 1, type: 'scene', children: [] };

    expect(() => compileToScene(empty, { labelDistance: 0 }).scene).not.toThrow();

    for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => compileToScene(empty, { labelDistance: invalid }).scene).toThrow(
        /labelDistance.*non-negative finite number/,
      );
    }
  });
});
