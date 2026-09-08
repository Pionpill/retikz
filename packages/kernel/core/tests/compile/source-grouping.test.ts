import { describe, expect, it } from 'vitest';

import { compileToScene, SceneSchema } from '../../src';
import { createStyleResolveFrame, resolveEffectiveNodeStyle } from '../../src/resolve/style';
import { NodeSchema, ScopeSchema } from '../../src/schemas';

describe('分组 Source 解析与编译', () => {
  it('诊断区分样式路径与标签路径', () => {
    const node = { type: 'node', position: [0, 0], style: { color: 'var(--color)', fill: 0.5 } };
    expect(() => compileToScene(SceneSchema.parse({ version: 1, type: 'scene', children: [node] }))).toThrow(
      /children\[0\].*style\.fill/,
    );
    const labeled = {
      type: 'node',
      position: [0, 0],
      style: { color: 'var(--color)' },
      label: { text: 'label', textColor: 0.5 },
    };
    expect(() => compileToScene(SceneSchema.parse({ version: 1, type: 'scene', children: [labeled] }))).toThrow(
      /children\[0\].*label\.textColor/,
    );
  });

  it('实例单字段覆盖保留其它继承字段，节点字体整体覆盖', () => {
    const frame = createStyleResolveFrame(
      ScopeSchema.parse({
        type: 'scope',
        children: [],
        style: { stroke: 'blue' },
        defaults: { node: { style: { font: { family: 'serif', size: 20 } }, layout: { minimumSize: 30 } } },
      }),
    );
    const node = NodeSchema.parse({
      type: 'node',
      position: [0, 0],
      style: { fill: 'red', font: { size: 12 } },
      layout: { padding: 0 },
    });
    expect(resolveEffectiveNodeStyle(node, [frame])).toMatchObject({
      style: { fill: 'red', stroke: 'blue', font: { size: 12 } },
      layout: { padding: 0, minimumSize: 30 },
    });
    expect(resolveEffectiveNodeStyle(node, [frame])).not.toMatchObject({ style: { font: { family: 'serif' } } });
  });

  it('空分组不清除继承，JSON 往返保持绘图结果', () => {
    const source = SceneSchema.parse({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          style: { fill: 'red', stroke: 'blue' },
          defaults: { reset: false },
          children: [
            {
              type: 'node',
              id: 'n',
              position: [0, 0],
              style: { fill: undefined },
              layout: {},
            },
          ],
        },
      ],
    });
    const output = compileToScene(source).scene;
    expect(compileToScene(SceneSchema.parse(JSON.parse(JSON.stringify(source)))).scene).toEqual(output);
    const frame = createStyleResolveFrame(ScopeSchema.parse({ type: 'scope', children: [], style: { fill: 'red' } }));
    expect(
      resolveEffectiveNodeStyle(NodeSchema.parse({ type: 'node', position: [0, 0], style: {}, layout: {} }), [frame]),
    ).toMatchObject({ style: { fill: 'red' } });
  });
});
