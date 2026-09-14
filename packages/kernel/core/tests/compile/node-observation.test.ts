import { describe, expect, it, vi } from 'vitest';

import type { CompileObservation, CompileOptions, IRNode, IRScene, PathCommand, ShapeDefinition } from '../../src';

import {
  BUILTIN_SHAPES,
  compileToScene,
  NodeOwnerOutputSchema,
  observeCompileToScene,
  RetikzCoreError,
} from '../../src';
import { flattenPrims } from '../helpers/flatten';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', position: [10, 20], shape: 'custom', text: 'A' }],
};

const capture = (ir: IRScene, options: CompileOptions, selected = true) => {
  const observations: Array<CompileObservation> = [];
  const result = observeCompileToScene(ir, options, [
    {
      key: 'test/node',
      createSession: () => ({
        select: site => selected && site.owner.kind === 'node',
        observe: observation => observations.push(observation),
        complete: () => null,
      }),
    },
  ]);
  return { result, observations };
};

describe('Node 观测几何', () => {
  it('低precision不把Node旋转弧度当坐标圆整', () => {
    const { observations } = capture(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            rotate: 30,
            layout: { minimumSize: { width: 40, height: 20 }, padding: 0 },
          },
        ],
      },
      { precision: 0 },
    );
    expect(NodeOwnerOutputSchema.parse(observations[0]?.value).rect.rotate).toBeCloseTo(Math.PI / 6, 12);
  });
  it.each([
    ['ellipse', 'ellipse'],
    ['圆角 rectangle', { type: 'rectangle', params: { cornerRadius: 120 } }],
  ] satisfies Array<[string, IRNode['shape']]>)('precision=0 时 %s 观测几何使用主图圆整后的旋转角', (_label, shape) => {
    const sceneOf = (rotate: number): IRScene => ({
      version: 1,
      type: 'scene',
      viewBox: { x: -700, y: -500, width: 1400, height: 1000 },
      children: [
        {
          type: 'node',
          position: [120, 80],
          shape,
          rotate,
          layout: { minimumSize: { width: 1000, height: 600 }, padding: 0 },
        },
      ],
    });
    const options = { precision: 0 };
    const wholeDegree = capture(sceneOf(30), options);
    const fractionalDegree = capture(sceneOf(30.49), options);
    const wholeOutput = NodeOwnerOutputSchema.parse(wholeDegree.observations[0]?.value);
    const fractionalOutput = NodeOwnerOutputSchema.parse(fractionalDegree.observations[0]?.value);

    expect(fractionalDegree.result.primary.scene).toEqual(wholeDegree.result.primary.scene);
    expect(fractionalOutput.shape.outline).toEqual(wholeOutput.shape.outline);
    expect(fractionalOutput.shape.keyPoints).toEqual(wholeOutput.shape.keyPoints);
    expect(fractionalOutput.boundary).toEqual(wholeOutput.boundary);
  });
  it('观测边界不新增或吞掉主图后续连接面 warning', () => {
    const { connectionEnvelope: omitted, ...shape } = BUILTIN_SHAPES.rectangle;
    void omitted;
    const children: IRScene['children'] = [
      {
        type: 'node',
        id: 'target',
        shape: 'custom',
        position: [0, 0],
        text: 'A',
        boundary: { type: 'circle', params: { fit: 'tight' } },
      },
    ];
    for (const withPath of [false, true]) {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          ...children,
          ...(withPath
            ? [
                {
                  type: 'path' as const,
                  children: [
                    { type: 'step' as const, kind: 'move' as const, to: [80, 0] as [number, number] },
                    { type: 'step' as const, kind: 'line' as const, to: { id: 'target' } },
                  ],
                },
              ]
            : []),
        ],
      };
      const ordinaryWarnings: Array<string> = [];
      const observedWarnings: Array<string> = [];
      const options = { shapes: [{ ...shape, name: 'custom' }] };
      const primary = compileToScene(ir, { ...options, onWarn: warning => ordinaryWarnings.push(warning.code) });
      const { result } = capture(ir, { ...options, onWarn: warning => observedWarnings.push(warning.code) });
      expect(result.primary).toEqual(primary);
      expect(observedWarnings).toEqual(ordinaryWarnings);
    }
  });
  it.each([
    ['plain', ['a', 'bb', 'ccc']],
    ['mixed', [{ runs: [{ text: 'a' }] }, { runs: [{ text: 'bb' }] }, { runs: [{ text: 'ccc' }] }]],
  ] satisfies Array<[string, IRNode['text']]>)(
    '%s 正文基线与同次 emit 的每条物理行一致，包括低精度圆整',
    (_kind, text) => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', position: [1.23, 4.56], text: [...text] }],
      };
      const { result, observations } = capture(ir, {
        precision: 0,
        measureText: content => ({ width: content.length / 3, height: 1 / 3, ascent: 1 / 4, descent: 1 / 12 }),
      });
      const textPrimitives = flattenPrims(result.primary.scene.primitives).filter(
        primitive => primitive.type === 'text',
      );
      const renderedBaselines = textPrimitives.flatMap(primitive =>
        primitive.lines.map((_line, index) => primitive.y + index * primitive.lineHeight),
      );
      const output = NodeOwnerOutputSchema.parse(observations[0]?.value);
      expect(output.content?.baselines).toHaveLength(3);
      output.content?.baselines.forEach((baseline, index) => {
        expect(baseline.from[1]).toBeCloseTo(renderedBaselines[index], 8);
        expect(baseline.to[1]).toBeCloseTo(renderedBaselines[index], 8);
      });
    },
  );
  it('不启用或不选择时不调用几何出口；启用不增加文字度量或改变 primary', () => {
    const outline = vi.fn((): Array<PathCommand> => []);
    const keyPoints = vi.fn(() => []);
    const definition: ShapeDefinition = { ...BUILTIN_SHAPES.rectangle, name: 'custom', outline, keyPoints };
    const measureText = vi.fn(() => ({ width: 10, height: 12 }));
    const options = { shapes: [definition], measureText };
    const primary = compileToScene(source, options);
    const measurementCount = measureText.mock.calls.length;
    expect(outline).not.toHaveBeenCalled();
    capture(source, options, false);
    expect(outline).not.toHaveBeenCalled();
    measureText.mockClear();
    const { result, observations } = capture(source, options);
    expect(result.primary).toEqual(primary);
    expect(measureText).toHaveBeenCalledTimes(measurementCount);
    expect(keyPoints).toHaveBeenCalledTimes(1);
    expect(observations).toHaveLength(1);
    expect(NodeOwnerOutputSchema.parse(observations[0]?.value).shape.outline).toEqual([]);
  });

  it('缺失 capability 使用 null，无正文不伪造文本盒', () => {
    const { outline: omittedOutline, keyPoints: omittedPoints, ...base } = BUILTIN_SHAPES.rectangle;
    void omittedOutline;
    void omittedPoints;
    const { observations } = capture(
      { version: 1, type: 'scene', children: [{ type: 'node', position: [0, 0], shape: 'custom' }] },
      { shapes: [{ ...base, name: 'custom' }] },
    );
    expect(NodeOwnerOutputSchema.parse(observations[0]?.value)).toMatchObject({
      shape: { outline: null, keyPoints: null },
      boundary: { outline: null },
      content: null,
    });
  });

  it.each([
    [
      '开放轮廓',
      (): Array<PathCommand> => [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [1, 1] },
      ],
    ],
    ['非有限坐标', (): Array<PathCommand> => [{ kind: 'move', to: [Infinity, 0] }, { kind: 'close' }]],
    [
      '回调异常',
      (): Array<PathCommand> => {
        throw new Error('geometry failed');
      },
    ],
  ])('%s 是 Core contract failure，而不是不支持', (_label, outline) => {
    expect(() => capture(source, { shapes: [{ ...BUILTIN_SHAPES.rectangle, name: 'custom', outline }] })).toThrow(
      RetikzCoreError,
    );
  });

  it('拒绝同一实例重复的语义关键点名', () => {
    expect(() =>
      capture(source, {
        shapes: [
          {
            ...BUILTIN_SHAPES.rectangle,
            name: 'custom',
            keyPoints: () => [
              { name: 'same', position: [0, 0] },
              { name: 'same', position: [1, 1] },
            ],
          },
        ],
      }),
    ).toThrow(/unique|duplicate|重复/i);
  });
});
