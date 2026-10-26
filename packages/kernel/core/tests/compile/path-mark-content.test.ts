import { describe, expect, it } from 'vitest';

import type {
  IRPaint,
  ScenePrimitive,
  IRPath,
  IRPathBase,
  GroupPrimitive,
  IRStep,
  Scene,
  MarkDefinition,
} from '../../src';
import { compileToScene, defineArrow, defineMark, resolveCoreProviderDependencies } from '../../src';
import { flattenPrims } from '../helpers/flatten';
import { pathIr } from './path/helpers';

const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [10, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
];
const dot = defineMark({
  name: 'dot',
  anchor: [0, 0],
  defaultLength: 10,
  defaultWidth: 10,
  emit: context => [{ type: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 8, fill: context.fill }],
});
const compile = (path: Omit<IRPathBase, 'type'>, marks: Array<MarkDefinition> = [dot]) =>
  compileToScene(pathIr(path.children ?? steps, path), { marks }).scene;
const placementGroups = (scene: Scene) =>
  flattenPrims(scene.primitives).filter(
    (primitive): primitive is GroupPrimitive =>
      primitive.type === 'group' && primitive.transforms?.[0]?.kind === 'translate',
  );
const pathCommands = (scene: Scene) =>
  flattenPrims(scene.primitives).find(primitive => primitive.type === 'path')?.commands;
const custom = { shape: 'dot' } as const;

it('端点与标记共享外观和参数上下文，标记缩放只应用一次', () => {
  const contexts: Array<unknown> = [];
  const arrow = defineArrow({
    name: 'shared',
    backX: 0,
    lineContactX: 0,
    emit: context => {
      contexts.push({ ...context, round: undefined });
      return [{ type: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 3, fill: context.fill }];
    },
  });
  const appearance = { shape: 'shared', length: 10, width: 20, scale: 2, fill: 'red', params: { radius: 3 } };
  const scene = compileToScene(
    pathIr(steps, {
      style: { strokeWidth: 3 },
      arrow: { end: appearance },
      marks: [{ pos: 0.5, ...appearance }],
    }),
    { arrows: [arrow] },
  ).scene;
  expect(contexts).toHaveLength(2);
  expect(contexts[0]).toEqual(contexts[1]);
  expect(contexts[1]).toMatchObject({ fill: 'red', params: { radius: 3 } });
  expect(placementGroups(scene)[0]?.transforms).toContainEqual({ kind: 'scale', x: 6, y: 12 });
});

it('普通标记拒绝不可定位的局部锚点', () => {
  expect(() => compile({ marks: [{ pos: 0.5, ...custom }] }, [{ ...dot, anchor: [Infinity, 0] }])).toThrow(/anchor/);
});

it('已注册箭头可同时用于端点与标记，普通标记不具有端点能力', () => {
  const input = pathIr(steps, {
    arrow: { end: { shape: 'arrowDot' } },
    marks: [
      { pos: 0.25, shape: 'arrowDot' },
      { pos: 0.75, ...custom },
    ],
  });
  const scene = compileToScene(input, {
    marks: [dot],
    arrows: [
      {
        name: 'arrowDot',
        backX: 0,
        lineContactX: 5,
        emit: () => [{ type: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 3, fill: 'blue' }],
      },
    ],
  }).scene;
  const primitives = flattenPrims(scene.primitives);
  expect(primitives.find(primitive => primitive.type === 'path')?.arrowEnd).toBeDefined();
  expect(primitives.filter(primitive => primitive.type === 'ellipse')).toEqual(
    expect.arrayContaining([expect.objectContaining({ rx: 3, fill: 'blue' }), expect.objectContaining({ rx: 2 })]),
  );
  expect(() => compileToScene(input, { marks: [dot] })).toThrow(/arrowDot/);
  expect(() => compileToScene(pathIr(steps, { arrow: { end: { shape: 'dot' } } }), { marks: [dot] })).toThrow(/dot/);
  expect(() => compileToScene(input, { marks: [dot], arrows: [{ ...dot, backX: 0, lineContactX: 0 }] })).toThrow(
    /duplicate mark/,
  );
});

it('普通标记拒绝循环内容，错误仍定位到宿主下标', () => {
  const group: GroupPrimitive = { type: 'group', children: [] };
  group.children.push(group);
  const cyclic = defineMark({ name: 'dot', emit: () => [group] });
  expect(() => compile({ marks: [{ pos: 0.5, ...custom }] }, [cyclic])).toThrow(/marks\[0\]/);
});

it('缺失绘制资源与裁剪资源报告宿主标记位置', () => {
  const missingPaint = defineMark({
    name: 'dot',
    emit: () => [{ type: 'rect', x: 0, y: 0, width: 2, height: 2, fill: { kind: 'resourceRef', id: 'missing' } }],
  });
  const missingClip = defineMark({
    name: 'dot',
    emit: () => [{ type: 'group', clipRef: 'missing', children: [{ type: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 2 }] }],
  });
  for (const definition of [missingPaint, missingClip]) {
    expect(() => compile({ marks: [{ pos: 0.5, ...custom }] }, [definition])).toThrow(/marks\[0\]/);
  }
});

it('标签断线不移动标记，绘制进度只作用于主线', () => {
  const marks: IRPath['marks'] = [{ pos: 0.5, ...custom }];
  const base = compile({ marks });
  const interrupted = compile({ marks, label: { text: 'gap', position: 0.5, interrupt: true, gap: 10 } });
  expect(placementGroups(interrupted)[0]?.transforms).toEqual(placementGroups(base)[0]?.transforms);
  const animated = compile({
    marks,
    animations: [
      {
        property: 'pathDraw',
        duration: 100,
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
      },
    ],
  });
  expect(animated.primitives[0].animations).toBeUndefined();
  expect(flattenPrims(animated.primitives).find(primitive => primitive.type === 'path')?.animations?.[0].property).toBe(
    'pathDraw',
  );
});

describe('端点箭头与普通标记', () => {
  it('按整条路径弧长放置，并保持宿主命令', () => {
    const scene = compile({ marks: [{ pos: 0.5, ...custom }] });
    expect(placementGroups(scene)[0]?.transforms?.[0]).toEqual({ kind: 'translate', x: 50, y: 0 });
    expect(pathCommands(scene)).toEqual(pathCommands(compile({})));
  });

  it('端点上的箭头形标记不截断，显式端点箭头仍截断', () => {
    const marks: IRPath['marks'] = [0, 1].map(pos => ({ pos, shape: 'openCircle' }));
    const base = compile({});
    expect(pathCommands(compile({ marks }))).toEqual(pathCommands(base));
    const arrow = { end: { shape: 'openCircle' } };
    expect(pathCommands(compile({ arrow }))).not.toEqual(pathCommands(base));
    expect(pathCommands(compile({ marks, arrow }))).toEqual(pathCommands(compile({ arrow })));
    expect(placementGroups(compile({ marks, arrow }))[1]?.transforms?.[0]).toEqual({ kind: 'translate', x: 100, y: 0 });
  });

  it('普通标记共用箭头尺寸与线宽缩放，固定旋转不随线宽变化', () => {
    const marks: IRPath['marks'] = [{ pos: 0.5, scale: 2, rotate: 30, ...custom }];
    const base = placementGroups(compile({ marks, style: { strokeWidth: 1 } }))[0];
    const thick = placementGroups(compile({ marks, style: { strokeWidth: 5 } }))[0];
    expect(thick.transforms).toContainEqual({ kind: 'scale', x: 10, y: 10 });
    expect(thick.transforms).toContainEqual({ kind: 'rotate', degrees: 30 });
    expect(base.transforms).toContainEqual({ kind: 'rotate', degrees: 30 });
    expect(base.transforms).toContainEqual({ kind: 'scale', x: 2, y: 2 });
  });

  it('跳过 move 与零长度段，交界使用下一段方向，末端使用进入方向', () => {
    const children: Array<IRStep> = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'move', to: [100, 100] },
      { type: 'step', kind: 'line', to: [100, 110] },
      { type: 'step', kind: 'line', to: [100, 110] },
    ];
    const groups = placementGroups(compile({ children, marks: [0.5, 1].map(pos => ({ pos, ...custom })) }));
    expect(groups[0]?.transforms?.slice(0, 2)).toEqual([
      { kind: 'translate', x: 100, y: 100 },
      { kind: 'rotate', degrees: 90 },
    ]);
    expect(groups[1]?.transforms?.slice(0, 2)).toEqual([
      { kind: 'translate', x: 100, y: 110 },
      { kind: 'rotate', degrees: 90 },
    ]);
  });

  it('曲线端点驻点仍使用曲线切线', () => {
    const children: Array<IRStep> = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'cubic', control1: [0, 0], control2: [0, 100], to: [0, 100] },
    ];
    const groups = placementGroups(compile({ children, marks: [0, 1].map(pos => ({ pos, ...custom })) }));
    for (const group of groups) expect(group.transforms).toContainEqual({ kind: 'rotate', degrees: 90 });
  });

  it('拒绝整条零长度路径并带有位置诊断', () => {
    expect(() =>
      compile({
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [0, 0] },
        ],
        marks: [{ pos: 0, ...custom }],
      }),
    ).toThrow(/marks\[0\]/);
  });

  it('定义迭代器失败保留 cause，未知定义提供标记位置', () => {
    const cause = new Error('emit failed');
    expect(() => compile({ marks: [{ pos: 0.5, ...custom }] }, [])).toThrow(/marks\[0\]/);
    const broken = defineMark({
      name: 'dot',
      *emit() {
        yield { type: 'ellipse', cx: 0, cy: 0, rx: 1, ry: 1 };
        throw cause;
      },
    });
    try {
      compile({ marks: [{ pos: 0.5, ...custom }] }, [broken]);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ cause });
    }
  });

  it('参数、绘制顺序、宿主身份与动画保留在同一输出树', () => {
    const received: Array<unknown> = [];
    const definition = defineMark({
      name: 'dot',
      emit: context => {
        received.push(context.params);
        return dot.emit({ ...context, fill: 'red' });
      },
    });
    const animations: NonNullable<IRPath['animations']> = [
      {
        property: 'opacity',
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
        duration: 1000,
      },
    ];
    const scene = compile(
      {
        id: 'host',
        meta: { role: 'edge' },
        animations,
        marks: [{ pos: 0.5, ...custom, params: { label: 'dot', values: [1, 2] } }],
      },
      [definition],
    );
    expect(received).toEqual([{ label: 'dot', values: [1, 2] }]);
    expect(scene.primitives[0]).toMatchObject({
      type: 'group',
      id: 'host',
      meta: { role: 'edge' },
      animations,
      children: [{ type: 'path' }, { type: 'group' }],
    });
  });

  it('依赖提供者可登记普通标记，并拒绝重复名称', () => {
    const resolved = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [{ capability: 'mark', name: 'dot' }],
          providers: [
            { key: { capability: 'mark', name: 'dot' }, dependencies: [], datasets: {}, makeDefinition: () => dot },
          ],
        },
      ],
    });
    expect(resolved.marks).toEqual([dot]);
    expect(() => compile({}, [dot, { ...dot }])).toThrow(/dot/);
  });
});

it('普通标记保留嵌套样式和资源描边，并把完整内容计入边界', () => {
  const gradient: IRPaint = {
    kind: 'linearGradient',
    angle: 90,
    stops: [
      { offset: 0, color: 'red' },
      { offset: 1, color: 'blue' },
    ],
  };
  const content: Array<ScenePrimitive> = [
    {
      type: 'group',
      id: 'local',
      transforms: [{ kind: 'translate', x: 0, y: 30 }],
      children: [
        { type: 'rect', x: -10, y: -5, width: 20, height: 10, fill: { kind: 'contextStroke' } },
        { type: 'ellipse', cx: 0, cy: 0, rx: 1, ry: 1, fill: 'gold' },
      ],
    },
  ];
  const definition = defineMark({ ...dot, emit: () => content });
  const scene = compile({ style: { stroke: gradient }, marks: [{ pos: 0.5, ...custom }] }, [definition]);
  expect(scene.layout.y + scene.layout.height).toBeGreaterThanOrEqual(35);
  expect(scene.resources).toHaveLength(1);
  const flat = flattenPrims(scene.primitives);
  expect(flat.find(primitive => primitive.type === 'rect')).toMatchObject({ fill: { kind: 'resourceRef' } });
  expect(flat.find(primitive => primitive.type === 'ellipse')).toMatchObject({ fill: 'gold' });
  expect(flat.some(primitive => primitive.id === 'local')).toBe(false);
  expect(content[0].id).toBe('local');
  expect(placementGroups(compile({ marks: [{ pos: 0.5, ...custom }] }, [definition]))[1]).not.toBe(content[0]);
});

it('箭头默认不创建内容，端点片段不影响位于端点的标记', () => {
  const input = pathIr(steps, { marks: [{ pos: 1 }] });
  const shared = { shape: 'circle', scale: 2 };
  const scoped = compileToScene({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'scope',
        defaults: { path: { arrow: { ...shared, end: { shape: 'stealth', scale: 4, endpointOverlap: 1 } } } },
        children: input.children,
      },
    ],
  }).scene;
  const explicit = compile({ marks: [{ pos: 1, ...shared }] });
  expect(placementGroups(scoped)).toEqual(placementGroups(explicit));
  expect(
    flattenPrims(scoped.primitives)
      .filter(primitive => primitive.type === 'path')
      .every(primitive => primitive.arrowEnd === undefined),
  ).toBe(true);
});
