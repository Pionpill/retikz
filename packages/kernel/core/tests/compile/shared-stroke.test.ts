import { describe, expect, it } from 'vitest';

import { CascadingGraphicStyleSchema, compileToScene, GraphicStyleSchema, ScopeSchema } from '../../src';
import type { IRScope, ScenePrimitive } from '../../src';

const leaves = (primitives: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? leaves(primitive.children) : [primitive]));

const children: IRScope['children'] = [
  { type: 'node', position: [0, 0], layout: { minimumSize: { width: 20, height: 20 } } },
  {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [50, 0] },
    ],
  },
];

const compile = (scope: IRScope) =>
  leaves(
    compileToScene({
      type: 'scene',
      version: 1,
      children: [ScopeSchema.parse(scope)],
    }).scene.primitives,
  );

describe('共享描边', () => {
  it('共享样式复用非空虚线与有限相位契约', () => {
    for (const schema of [GraphicStyleSchema, CascadingGraphicStyleSchema]) {
      const style = { dashPattern: [6, 2], dashOffset: -3 };
      expect(schema.parse(JSON.parse(JSON.stringify(style)))).toEqual(style);
      for (const invalid of [{ dashPattern: [] }, { dashPattern: [-1] }, { dashOffset: Infinity }]) {
        expect(schema.safeParse(invalid).success).toBe(false);
      }
    }
  });

  it('共享虚线和负相位同时到达 Node 与 Path 的 Scene 图元', () => {
    const output = compile({ type: 'scope', defaults: { style: { dashPattern: [6, 2], dashOffset: -3 } }, children });
    expect(output).toHaveLength(2);
    for (const primitive of output) expect(primitive).toMatchObject({ dashPattern: [6, 2], dashOffset: -3 });
  });

  it('通道和实例覆盖共享虚线，短数组整体替换且零相位保留', () => {
    const output = compile({
      type: 'scope',
      defaults: {
        style: { dashPattern: [6, 2, 4, 2], dashOffset: -3 },
        node: { style: { dashPattern: [3, 1], dashOffset: 2 } },
        path: { style: { dashPattern: [5, 1] } },
      },
      children: children.map(child => ({ ...child, style: { dashOffset: 0 } })),
    });
    expect(output[0]).toMatchObject({ dashPattern: [3, 1], dashOffset: 0 });
    expect(output[1]).toMatchObject({ dashPattern: [5, 1], dashOffset: 0 });
  });

  it('本层共享默认覆盖祖先，按通道 reset 恢复实线且不清除另一通道', () => {
    const output = compile({
      type: 'scope',
      defaults: { style: { dashPattern: [6, 2], dashOffset: -3 } },
      children: [
        { type: 'scope', defaults: { style: { dashPattern: [2, 1] } }, children },
        { type: 'scope', defaults: { reset: ['node'] }, children },
        { type: 'scope', defaults: { reset: true }, children },
      ],
    });
    expect(output).toHaveLength(6);
    for (const primitive of output.slice(0, 2))
      expect(primitive).toMatchObject({ dashPattern: [2, 1], dashOffset: -3 });
    expect(output[3]).toMatchObject({ dashPattern: [6, 2], dashOffset: -3 });
    for (const primitive of [output[2], ...output.slice(4)]) {
      expect(primitive).not.toHaveProperty('dashPattern');
      expect(primitive).not.toHaveProperty('dashOffset');
    }
  });
});
