import { describe, expect, it } from 'vitest';

import type { GroupPrim, IRPathBase, IRScene, PathCommand, PathPrim } from '../../../src';

import { compileToScene } from '../../../src';
import { flattenPrims } from '../../helpers/flatten';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const pathPrimitive = (
  marks: NonNullable<IRPathBase['marks']>,
  input: Readonly<{
    children?: IRScene['children'];
    arrows?: NonNullable<Parameters<typeof compileToScene>[1]>['arrows'];
  }> = {},
): PathPrim => {
  const ir: IRScene = {
    version: 1,
    type: 'scene',
    children: input.children ?? [{ type: 'path', marks, children: steps }],
  };
  const primitive = flattenPrims(compileToScene(ir, { padding: 0, arrows: input.arrows }).scene.primitives).find(
    (item): item is PathPrim => item.type === 'path' && (item.arrowStart !== undefined || item.arrowEnd !== undefined),
  );
  if (primitive === undefined) throw new Error('Expected an endpoint-arrow PathPrim');
  return primitive;
};

const terminalPoint = (commands: ReadonlyArray<PathCommand>): [number, number] => {
  const command = commands.findLast(item => item.kind !== 'move' && item.kind !== 'close');
  if (command === undefined) throw new Error('Expected a drawable terminal command');
  if (command.kind === 'arc' || command.kind === 'ellipseArc') throw new Error('Expected a Cartesian endpoint command');
  return command.to;
};

const startPoint = (commands: ReadonlyArray<PathCommand>): [number, number] => {
  const command = commands.find(item => item.kind === 'move');
  if (command?.kind !== 'move') throw new Error('Expected a move command');
  return command.to;
};

describe('compile path: endpoint arrow overlap', () => {
  it.each([
    { overlap: undefined, expectedEndX: 92.5 },
    { overlap: 0, expectedEndX: 92.5 },
    { overlap: 0.5, expectedEndX: 96.25 },
    { overlap: 1, expectedEndX: 100 },
  ])('在默认位置与视觉后缘完整进入位置间推进终点 normal 箭头 $overlap', ({ overlap, expectedEndX }) => {
    const placement: NonNullable<IRPathBase['marks']>[number] = {
      pos: 1,
      ...(overlap === undefined ? {} : { endpointOverlap: overlap }),
      mark: { kind: 'arrow', shape: 'normal' },
    };

    expect(terminalPoint(pathPrimitive([placement]).commands)).toEqual([expectedEndX, 0]);
  });

  it('让放大的空心 stealth 在自动 NodeTarget 上按最终轮廓完整进入', () => {
    const children: IRScene['children'] = [
      { type: 'node', id: 'source', position: [0, 0] },
      { type: 'node', id: 'target', position: [100, 0] },
      {
        type: 'path',
        marks: [
          {
            pos: 1,
            endpointOverlap: 1,
            mark: { kind: 'arrow', shape: 'openStealth', length: 10, width: 10, scale: 2, lineWidth: 4 },
          },
        ],
        children: [
          { type: 'step', kind: 'move', to: { id: 'source' } },
          { type: 'step', kind: 'line', to: { id: 'target' } },
        ],
      },
    ];
    const logicalChildren = structuredClone(children);
    const logicalPath = logicalChildren[2];
    if (logicalPath.type !== 'path') throw new Error('Expected Path input');
    logicalPath.marks = undefined;
    const logicalPrimitive = flattenPrims(
      compileToScene({ version: 1, type: 'scene', children: logicalChildren }, { padding: 0 }).scene.primitives,
    ).find((item): item is PathPrim => item.type === 'path');
    if (logicalPrimitive === undefined) throw new Error('Expected a logical PathPrim');
    const logicalEndX = terminalPoint(logicalPrimitive.commands)[0];
    const primitive = pathPrimitive([], { children });
    const markerEndX = terminalPoint(primitive.commands)[0];

    expect(logicalEndX).toBe(92);
    expect(primitive.arrowEnd).toMatchObject({ refX: 1, markerWidth: 20 });
    expect(markerEndX).toBe(96);
    expect(markerEndX + ((-1 - 1) * 20) / 10).toBe(logicalEndX);
  });

  it.each([
    { overlap: undefined, expectedStartX: 7.5 },
    { overlap: 0, expectedStartX: 7.5 },
    { overlap: 0.5, expectedStartX: 3.75 },
    { overlap: 1, expectedStartX: 0 },
  ])('以镜像公式把起点 normal 箭头推进 $overlap', ({ overlap, expectedStartX }) => {
    const placement: NonNullable<IRPathBase['marks']>[number] = {
      pos: 0,
      ...(overlap === undefined ? {} : { endpointOverlap: overlap }),
      mark: { kind: 'arrow', shape: 'normal' },
    };

    expect(startPoint(pathPrimitive([placement]).commands)).toEqual([expectedStartX, 0]);
  });

  it('让自动 NodeTarget 的空心外轮廓保护随剩余未重叠比例衰减', () => {
    const children: IRScene['children'] = [
      { type: 'node', id: 'source', position: [0, 0] },
      { type: 'node', id: 'target', position: [100, 0] },
      {
        type: 'path',
        marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'openCircle' } }],
        children: [
          { type: 'step', kind: 'move', to: { id: 'source' } },
          { type: 'step', kind: 'line', to: { id: 'target' } },
        ],
      },
    ];
    const defaultEnd = terminalPoint(pathPrimitive([], { children }).commands)[0];
    const halfChildren = structuredClone(children);
    const fullChildren = structuredClone(children);
    const halfPath = halfChildren[2];
    const fullPath = fullChildren[2];
    if (halfPath.type !== 'path' || fullPath.type !== 'path') throw new Error('Expected Path inputs');
    halfPath.marks = [{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow', shape: 'openCircle' } }];
    fullPath.marks = [{ pos: 1, endpointOverlap: 1, mark: { kind: 'arrow', shape: 'openCircle' } }];

    expect(terminalPoint(pathPrimitive([], { children: halfChildren }).commands)[0] - defaultEnd).toBeCloseTo(4.05, 8);
    expect(terminalPoint(pathPrimitive([], { children: fullChildren }).commands)[0] - defaultEnd).toBeCloseTo(8.1, 8);
  });

  it('使用自定义 ArrowDefinition 的真实 back/contact/tip 几何', () => {
    const arrow = {
      name: 'overlap-probe',
      baseSize: 10,
      backX: 0,
      tipX: 8,
      lineContactX: 2,
      emit: () => [],
    };
    const endX = (endpointOverlap: number) =>
      terminalPoint(
        pathPrimitive(
          [
            {
              pos: 1,
              endpointOverlap,
              mark: { kind: 'arrow', shape: 'overlap-probe', length: 10, width: 10 },
            },
          ],
          { arrows: [arrow] },
        ).commands,
      )[0];

    expect(endX(0)).toBe(94.5);
    expect(endX(0.5)).toBe(98.25);
    expect(endX(1)).toBe(102);
  });

  it('让 stealth 的倒钩后缘在完整重叠时落到逻辑端点', () => {
    const primitive = pathPrimitive([{ pos: 1, endpointOverlap: 1, mark: { kind: 'arrow', shape: 'stealth' } }]);

    expect(terminalPoint(primitive.commands)).toEqual([102.4, 0]);
    expect(primitive.arrowEnd).toMatchObject({ refX: 3, markerWidth: 8 });
    expect(terminalPoint(primitive.commands)[0] + ((0 - 3) * 8) / 10).toBe(100);
  });

  it.each([
    { length: 10, scale: 0.5, expectedEndX: 101 },
    { length: 10, scale: 2, expectedEndX: 104 },
    { length: 15, scale: 2, expectedEndX: 106 },
  ])('按最终 length × scale 保持自定义箭头后缘完整进入：$length × $scale', ({ length, scale, expectedEndX }) => {
    const arrow = {
      name: 'scaled-overlap-probe',
      baseSize: 10,
      backX: 0,
      lineContactX: 2,
      tipX: 8,
      emit: () => [],
    };
    const primitive = pathPrimitive(
      [
        {
          pos: 1,
          endpointOverlap: 1,
          mark: { kind: 'arrow', shape: arrow.name, length, width: 10, scale },
        },
      ],
      { arrows: [arrow] },
    );

    expect(terminalPoint(primitive.commands)).toEqual([expectedEndX, 0]);
    expect(primitive.arrowEnd?.markerWidth).toBe(length * scale);
    expect(terminalPoint(primitive.commands)[0] + ((arrow.backX - arrow.lineContactX) * length * scale) / 10).toBe(100);
  });

  it('保持曲线默认结果并让重叠推进单调', () => {
    const curveSteps: IRPathBase['children'] = [
      steps[0],
      { type: 'step', kind: 'cubic', control1: [20, 20], control2: [80, 20], to: [100, 0] },
    ];
    const endX = (endpointOverlap: number | undefined) => {
      const path: IRScene['children'][number] = {
        type: 'path',
        marks: [
          {
            pos: 1,
            ...(endpointOverlap === undefined ? {} : { endpointOverlap }),
            mark: { kind: 'arrow', shape: 'normal' },
          },
        ],
        children: curveSteps,
      };
      return terminalPoint(pathPrimitive([], { children: [path] }).commands)[0];
    };

    expect(endX(undefined)).toBe(endX(0));
    expect(endX(0)).toBeLessThan(endX(0.5));
    expect(endX(0.5)).toBeLessThan(endX(1));
  });

  it('只移动最终端点 commands，不改变标签、inline mark、identity 或 meta', () => {
    const compile = (endpointOverlap: number) => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            id: 'edge',
            meta: { owner: 'probe' },
            label: { text: 'middle', position: 0.5, side: 'top' },
            marks: [
              { pos: 0.5, mark: { kind: 'arrow', shape: 'circle' } },
              { pos: 1, endpointOverlap, mark: { kind: 'arrow', shape: 'normal' } },
            ],
            children: steps,
          },
        ],
      };
      return flattenPrims(compileToScene(ir, { padding: 0 }).scene.primitives);
    };
    const baseline = compile(0);
    const overlapped = compile(1);
    const baselinePath = baseline.find(
      (primitive): primitive is PathPrim => primitive.type === 'path' && primitive.id === 'edge',
    );
    const overlappedPath = overlapped.find(
      (primitive): primitive is PathPrim => primitive.type === 'path' && primitive.id === 'edge',
    );
    const baselineLabel = baseline.find(primitive => primitive.type === 'text');
    const overlappedLabel = overlapped.find(primitive => primitive.type === 'text');
    const baselineInlineGroup = baseline.find(
      (primitive): primitive is GroupPrim =>
        primitive.type === 'group' && primitive.transforms?.some(transform => transform.kind === 'translate') === true,
    );
    const overlappedInlineGroup = overlapped.find(
      (primitive): primitive is GroupPrim =>
        primitive.type === 'group' && primitive.transforms?.some(transform => transform.kind === 'translate') === true,
    );

    expect(overlappedPath?.id).toBe(baselinePath?.id);
    expect(overlappedPath?.meta).toEqual(baselinePath?.meta);
    expect(overlappedPath?.commands).not.toEqual(baselinePath?.commands);
    expect(overlappedLabel).toEqual(baselineLabel);
    expect(overlappedInlineGroup?.transforms).toEqual(baselineInlineGroup?.transforms);
  });

  it('让极短双端重叠路径保持有限输出', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: [
            { pos: 0, endpointOverlap: 1, mark: { kind: 'arrow', shape: 'normal' } },
            { pos: 1, endpointOverlap: 1, mark: { kind: 'arrow', shape: 'normal' } },
          ],
          children: [steps[0], { type: 'step', kind: 'line', to: [0.1, 0] }],
        },
      ],
    };

    expect(JSON.stringify(compileToScene(ir).scene)).not.toMatch(/NaN|Infinity/);
  });

  it('让显式零跳过可能溢出的完整进入位移并保持默认放置', () => {
    const arrow = {
      name: 'overflowing-full-entry-probe',
      baseSize: 10,
      backX: -Number.MAX_VALUE,
      lineContactX: Number.MAX_VALUE,
      tipX: Number.MAX_VALUE,
      emit: () => [],
    };

    expect(() =>
      pathPrimitive(
        [
          {
            pos: 1,
            endpointOverlap: 0,
            mark: { kind: 'arrow', shape: arrow.name },
          },
        ],
        { arrows: [arrow] },
      ),
    ).not.toThrow();
  });

  it('拒绝非零重叠产生的非有限完整进入位移', () => {
    const arrow = {
      name: 'overflowing-full-entry-probe',
      baseSize: 10,
      backX: -Number.MAX_VALUE,
      lineContactX: Number.MAX_VALUE,
      tipX: Number.MAX_VALUE,
      emit: () => [],
    };

    expect(() =>
      pathPrimitive(
        [
          {
            pos: 1,
            endpointOverlap: 1,
            mark: { kind: 'arrow', shape: arrow.name },
          },
        ],
        { arrows: [arrow] },
      ),
    ).toThrow(/full-entry shrink.*non-finite/i);
  });

  it('拒绝 inline placement 上的 endpointOverlap，并定位字段', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: [{ pos: 0.4, endpointOverlap: 0.5, mark: { kind: 'arrow' } }],
          children: steps,
        },
      ],
    };

    expect(() => compileToScene(ir)).toThrow(/children\[0\]\.path\.marks\[0\]\.endpointOverlap/);
  });

  it('拒绝同侧未被选中的重复 endpoint placement，并定位字段', () => {
    expect(() =>
      pathPrimitive([
        { pos: 1, mark: { kind: 'arrow' } },
        { pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } },
      ]),
    ).toThrow(/children\[0\]\.path\.marks\[1\]\.endpointOverlap/);
  });
});
