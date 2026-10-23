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

describe('host-owned defaults', () => {
  it('keeps sparse defaults through JSON and rejects content in templates', () => {
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

  it('applies every node label template to actual labels without generating content', () => {
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

  it('applies path and step label defaults and arrow endpoints equivalently to explicit fields', () => {
    const arrow = { shape: 'stealth', scale: 1.4, end: { fill: 'red' } };
    const marks = [{ pos: 1, mark: { kind: 'arrow' } }];
    expect(
      render({ path: { label: pathLabel, arrow } }, [{ type: 'path', children: steps, label: { text: 'p' }, marks }]),
    ).toEqual(
      render({}, [
        {
          type: 'path',
          children: steps,
          label: { ...pathLabel, text: 'p' },
          marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', scale: 1.4, fill: 'red' } }],
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

  it('inherits font fields through scopes and instance overrides', () => {
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

  it('rejects a pin conflict introduced by inheritance and accepts an explicit false', () => {
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

it('host reset clears its decorations without affecting siblings or the other host', () => {
  const leaf = [
    { type: 'node', label: { text: 'node' } },
    { type: 'path', children: steps, label: { text: 'path' }, marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
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
        marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', scale: 2 } }],
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
      marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', scale: 2 } }],
    },
  ];
  expect(output).toEqual(render({}, [expectedCleared, ...expectedSibling]));
  expect(render(inherited, [{ type: 'scope', defaults: { reset: true }, children: leaf }])).toEqual(
    render({}, [{ type: 'scope', children: leaf }]),
  );
});

it('merges pin fields and path label fonts while preserving explicit false and zero', () => {
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
