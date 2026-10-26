import { describe, expect, it } from 'vitest';

import { compileToScene, SceneSchema, ScopeDefaultsSchema } from '../../src';

const render = (defaults: object, children: Array<object>) =>
  compileToScene(SceneSchema.parse({ type: 'scene', version: 1, children: [{ type: 'scope', defaults, children }] }))
    .scene;

const nodeLabel = {
  font: { family: 'serif', size: 18 },
  position: 'right',
  distance: 12,
  rotate: 20,
  keepUpright: true,
  pin: { stroke: 'red', strokeWidth: 2 },
};
const pathLabel = {
  position: 0.4,
  side: 'bottom',
  sloped: true,
  distance: 6,
  interrupt: true,
  gap: 8,
  font: { family: 'serif', size: 16 },
};
const steps = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
];

describe('宿主拥有的默认值', () => {
  it('通过 JSON 保持稀疏默认值并拒绝模板中的内容', () => {
    const defaults = {
      node: { label: nodeLabel },
      path: { label: pathLabel, arrow: { shape: 'stealth' } },
      reset: ['node'],
    };
    expect(ScopeDefaultsSchema.parse(JSON.parse(JSON.stringify(defaults)))).toEqual(defaults);
    expect(ScopeDefaultsSchema.safeParse({ node: { label: { text: 'content' } } }).success).toBe(false);
    expect(ScopeDefaultsSchema.safeParse({ label: {}, arrow: {} }).success).toBe(false);
    expect(ScopeDefaultsSchema.safeParse({ reset: ['label'] }).success).toBe(false);
  });

  it('将每个节点标签模板应用到实际标签而不生成内容', () => {
    expect(
      render({ node: { label: nodeLabel } }, [{ type: 'node', label: [{ text: 'a' }, { text: 'b', distance: 20 }] }]),
    ).toEqual(
      render({}, [
        {
          type: 'node',
          label: [
            { ...nodeLabel, text: 'a' },
            { ...nodeLabel, text: 'b', distance: 20 },
          ],
        },
      ]),
    );
    expect(
      render({ node: { label: nodeLabel }, path: { label: pathLabel, arrow: { shape: 'stealth' } } }, [
        { type: 'node' },
        { type: 'path', children: steps },
      ]),
    ).toEqual(render({}, [{ type: 'node' }, { type: 'path', children: steps }]));
  });

  it('路径和步骤标签默认值及箭头端点与显式字段具有等价行为', () => {
    const arrow = { shape: 'stealth', scale: 1.4, end: { fill: 'red' } };
    const endpointArrow = { end: {} };
    expect(
      render({ path: { label: pathLabel, arrow } }, [
        { type: 'path', children: steps, label: { text: 'p' }, arrow: endpointArrow },
      ]),
    ).toEqual(
      render({}, [
        {
          type: 'path',
          children: steps,
          label: { ...pathLabel, text: 'p' },
          arrow: { end: { shape: 'stealth', scale: 1.4, fill: 'red' } },
        },
      ]),
    );
    expect(
      render({ path: { label: pathLabel } }, [
        { type: 'path', children: [steps[0], { ...steps[1], label: { text: 's' } }] },
      ]),
    ).toEqual(
      render({}, [{ type: 'path', children: [steps[0], { ...steps[1], label: { ...pathLabel, text: 's' } }] }]),
    );
  });

  it('通过范围和实例覆盖继承字体字段', () => {
    const children = [
      {
        type: 'scope',
        defaults: { node: { style: { font: { size: 22 } }, label: { font: { size: 14 } } } },
        children: [
          {
            type: 'node',
            text: 'body',
            style: { font: { style: 'italic' } },
            label: { text: 'label', font: { weight: 'normal' } },
          },
        ],
      },
    ];
    expect(
      render(
        {
          node: {
            style: { font: { family: 'serif', weight: 'bold' } },
            label: { font: { family: 'monospace', weight: 'bold' } },
          },
        },
        children,
      ),
    ).toEqual(
      render({}, [
        {
          type: 'scope',
          children: [
            {
              type: 'node',
              text: 'body',
              style: { font: { family: 'serif', weight: 'bold', size: 22, style: 'italic' } },
              label: { text: 'label', font: { family: 'monospace', size: 14, weight: 'normal' } },
            },
          ],
        },
      ]),
    );
  });

  it('拒绝继承引入的 pin 冲突并接受明确的 false', () => {
    expect(() =>
      render({ node: { label: { pin: true } } }, [{ type: 'node', label: { text: 'x', placement: 'inside' } }]),
    ).toThrow(/pin/i);
    expect(
      render({ node: { label: { pin: true } } }, [
        { type: 'node', label: { text: 'x', placement: 'inside', pin: false } },
      ]),
    ).toEqual(render({}, [{ type: 'node', label: { text: 'x', placement: 'inside', pin: false } }]));
  });
});

it('宿主重置清除其装饰，而不影响兄弟或其他宿主', () => {
  const leaf = [
    { type: 'node', label: { text: 'node' } },
    { type: 'path', children: steps, label: { text: 'path' }, arrow: { end: {} } },
  ];
  const inherited = {
    style: { stroke: 'red' },
    node: { label: nodeLabel },
    path: { label: pathLabel, arrow: { shape: 'stealth', scale: 2 } },
  };
  const cleared = {
    type: 'scope',
    defaults: { reset: ['node'], node: { label: { distance: 0, pin: false } } },
    children: leaf,
  };
  const output = render(inherited, [cleared, ...leaf]);
  const expectedCleared = {
    type: 'scope',
    children: [
      { type: 'node', label: { text: 'node', distance: 0, pin: false } },
      {
        type: 'path',
        style: { stroke: 'red' },
        children: steps,
        label: { ...pathLabel, text: 'path' },
        arrow: { end: { shape: 'stealth', scale: 2 } },
      },
    ],
  };
  const expectedSibling = [
    { type: 'node', style: { stroke: 'red' }, label: { ...nodeLabel, text: 'node' } },
    {
      type: 'path',
      style: { stroke: 'red' },
      children: steps,
      label: { ...pathLabel, text: 'path' },
      arrow: { end: { shape: 'stealth', scale: 2 } },
    },
  ];
  expect(output).toEqual(render({}, [expectedCleared, ...expectedSibling]));
  expect(render(inherited, [{ type: 'scope', defaults: { reset: true }, children: leaf }])).toEqual(
    render({}, [{ type: 'scope', children: leaf }]),
  );
});

it('合并 pin 字段和路径标签字体，同时保留显式的 false 和零', () => {
  expect(
    render({ node: { label: { pin: { stroke: 'red', strokeWidth: 3 } } } }, [
      { type: 'node', label: { text: 'x', pin: { opacity: 0.4 } } },
    ]),
  ).toEqual(render({}, [{ type: 'node', label: { text: 'x', pin: { stroke: 'red', strokeWidth: 3, opacity: 0.4 } } }]));
  expect(
    render({ path: { label: { font: { family: 'serif', weight: 'bold' }, sloped: true, distance: 8 } } }, [
      {
        type: 'scope',
        defaults: { path: { label: { font: { size: 20 } } } },
        children: [
          {
            type: 'path',
            children: steps,
            label: { text: 'x', distance: 0, sloped: false, font: { weight: 'normal' } },
          },
        ],
      },
    ]),
  ).toEqual(
    render({}, [
      {
        type: 'scope',
        children: [
          {
            type: 'path',
            children: steps,
            label: { text: 'x', distance: 0, sloped: false, font: { family: 'serif', weight: 'normal', size: 20 } },
          },
        ],
      },
    ]),
  );
});
