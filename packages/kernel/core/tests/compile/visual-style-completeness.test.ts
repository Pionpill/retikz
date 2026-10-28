import { expect, it } from 'vitest';

import {
  compileToScene,
  defineArrow,
  SceneSchema,
  ArrowStyleSchema,
  NodeLabelPinSchema,
  TextLineSchema,
  SegmentedLineSchema,
} from '../../src';
import type { ScenePrimitive } from '../../src';

const leaves = (items: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? leaves(item.children) : [item]));

it('行字体和数学公式覆盖传递至 TeX 下沉器', () => {
  const sizes: Array<number> = [];
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'node',
        style: { font: { size: 12 } },
        text: [
          { text: 'a $x$', font: { size: 30 } },
          { segments: [{ tex: 'y' }, { tex: 'z', fontSize: '0.5em' }], font: { size: 20 } },
        ],
      },
    ],
  });
  compileToScene(source, {
    lowerTex: (_content, style) => {
      sizes.push(style.fontSize);
      return { paths: [], width: style.fontSize, height: style.fontSize, depth: 0 };
    },
  });
  expect(sizes).toEqual([30, 20, 10]);
});

it('分段线默认保留部分字体和视觉覆盖', () => {
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'node',
        text: [
          {
            segments: [
              { text: 'a', font: { weight: 'bold' } },
              { text: 'b', fill: 'blue', opacity: 0.8 },
            ],
            font: { size: 24, family: 'serif' },
            fill: 'red',
            opacity: 0.5,
          },
        ],
      },
    ],
  });
  const text = leaves(compileToScene(source).scene.primitives).filter(item => item.type === 'text');
  expect(text[0]).toMatchObject({ fontSize: 24, fontFamily: 'serif', fontWeight: 'bold', fill: 'red', opacity: 0.5 });
  expect(text[1]).toMatchObject({ fontSize: 24, fontFamily: 'serif', fill: 'blue', opacity: 0.8 });
});

it('共享效果和描边几何体到达范围节点', () => {
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'scope',
        defaults: { style: { shadow: 'sm', blendMode: 'multiply', lineCap: 'round', lineJoin: 'bevel' } },
        children: [{ type: 'node', position: [0, 0] }],
      },
    ],
  });
  const output = leaves(compileToScene(source).scene.primitives);
  expect(output).toHaveLength(1);
  expect(output[0]).toMatchObject({ lineCap: 'round', lineJoin: 'bevel', blendMode: 'multiply' });
  expect(output[0]).toHaveProperty('shadow');
});

const gradient = {
  kind: 'linearGradient',
  stops: [
    { offset: 0, color: 'red' },
    { offset: 1, color: 'blue' },
  ],
};

it('pin 解析绘画资源并使用其自己的不透明度和描边几何形状', () => {
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'node',
        text: 'host',
        style: { opacity: 0.4 },
        label: [
          {
            text: 'label',
            opacity: 0.5,
            pin: {
              stroke: gradient,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'bevel',
              dashPattern: [2, 3],
              dashOffset: 1,
            },
          },
        ],
      },
    ],
  });
  const scene = compileToScene(source).scene;
  const pin = leaves(scene.primitives).find(item => item.type === 'path');
  expect(pin).toMatchObject({
    stroke: { kind: 'resourceRef' },
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'bevel',
    dashPattern: [2, 3],
    dashOffset: 1,
  });
  expect(scene.resources).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'paint', spec: gradient })]));
});

it('端点和内联箭头保留显式绘画和描边覆盖', () => {
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        style: { stroke: gradient },
        arrow: {
          end: {
            shape: 'stealth',
            stroke: gradient,
            fill: gradient,
            dashPattern: [2, 1],
            dashOffset: 1,
            lineCap: 'round',
            lineJoin: 'bevel',
          },
        },
        marks: [0.5].map(pos => ({
          pos,
          shape: 'stealth',
          stroke: gradient,
          fill: gradient,
          dashPattern: [2, 1],
          dashOffset: 1,
          lineCap: 'round',
          lineJoin: 'bevel',
        })),
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [100, 0] },
        ],
      },
    ],
  });
  const scene = compileToScene(source).scene;
  const paths = leaves(scene.primitives).filter(item => item.type === 'path');
  const expected = {
    stroke: { kind: 'resourceRef' },
    fill: { kind: 'resourceRef' },
    dashPattern: [2, 1],
    dashOffset: 1,
    lineCap: 'round',
    lineJoin: 'bevel',
  };
  expect(paths[0].arrowEnd?.marker[0]).toMatchObject(expected);
  expect(paths[1]).toMatchObject(expected);
  expect(scene.resources).toHaveLength(1);
});

it('提供箭头选项时，自定义箭头输出保留固定的嵌套样式', () => {
  const custom = defineArrow({
    name: 'styled',
    backX: 0,
    lineContactX: 10,
    emit: () => [
      {
        type: 'group',
        children: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            fill: 'green',
            stroke: 'blue',
            dashPattern: [5, 2],
            lineCap: 'square',
          },
        ],
      },
    ],
  });
  const source = SceneSchema.parse({
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        arrow: {
          start: { shape: 'styled' },
          end: { shape: 'styled', fill: gradient, lineJoin: 'round', dashPattern: [1, 2] },
        },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [100, 0] },
        ],
      },
    ],
  });
  const path = leaves(compileToScene(source, { arrows: [custom] }).scene.primitives).find(item => item.type === 'path');
  expect(leaves(path?.arrowStart?.marker ?? [])[0]).toMatchObject({
    fill: 'green',
    stroke: 'blue',
    dashPattern: [5, 2],
    lineCap: 'square',
  });
  expect(leaves(path?.arrowEnd?.marker ?? [])[0]).toEqual(leaves(path?.arrowStart?.marker ?? [])[0]);
});

it('新的视觉字段可通过 JSON 往返且拒绝拼写错误的属性', () => {
  const cases = [
    { schema: ArrowStyleSchema, value: { stroke: gradient, lineCap: 'round', dashPattern: [2, 1] } },
    { schema: NodeLabelPinSchema, value: { stroke: gradient, opacity: 0.5 } },
    { schema: TextLineSchema, value: { text: 'x', font: { size: 20 } } },
    {
      schema: SegmentedLineSchema,
      value: { segments: [{ tex: 'x', fontSize: '0.5em' }], font: { size: 20 }, fill: 'red' },
    },
  ];
  for (const { schema, value } of cases) {
    expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    expect(schema.safeParse({ ...value, misspelledStyle: true }).success).toBe(false);
  }
});

it('共享效果到达路径，同时显式节点重置获胜', () => {
  const scene = compileToScene(
    SceneSchema.parse({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          defaults: { style: { shadow: 'sm', blendMode: 'multiply', lineCap: 'round' } },
          children: [
            { type: 'node', style: { shadow: 'none', blendMode: 'normal', lineCap: 'butt' } },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
              ],
            },
          ],
        },
      ],
    }),
  ).scene;
  const output = leaves(scene.primitives);
  expect(output[0]).toMatchObject({ blendMode: 'normal', lineCap: 'butt' });
  expect(output[0]).not.toHaveProperty('shadow');
  expect(output[1]).toMatchObject({ blendMode: 'multiply', lineCap: 'round' });
  expect(output[1]).toHaveProperty('shadow');
});
