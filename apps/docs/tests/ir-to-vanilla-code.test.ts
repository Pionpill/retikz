import type { IRScene } from '@retikz/core';

import { parseWay } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { irToVanillaCode } from '../src/modules/docs/components/component-preview/utils';

const ir = (children: IRScene['children'], viewBox?: IRScene['viewBox']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
  ...(viewBox ? { viewBox } : {}),
});

describe('irToVanillaCode', () => {
  it('import-header：恒定 vanilla import + scene 装配', () => {
    const code = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]));
    expect(code).toContain("from '@retikz/vanilla'");
    expect(code).toContain('scene(');
    expect(code).toContain('const input = scene({ children: [');
  });

  it('node-codegen：具名 / 匿名 / 字段映射', () => {
    const named = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]));
    expect(named).toContain("node('a', { position: [0, 0], text: 'A' })");

    const anon = irToVanillaCode(ir([{ type: 'node', position: [60, 0], text: '匿名' }]));
    expect(anon).toContain("node({ position: [60, 0], text: '匿名' })");
    expect(anon).not.toContain("node('");
  });

  it('coordinate-codegen：coordinate(id, { position })', () => {
    const code = irToVanillaCode(ir([{ type: 'coordinate', id: 'm', position: [60, 40] }]));
    expect(code).toContain("coordinate('m', { position: [60, 40] })");
  });

  it('path-way-line：move+line steps → path({ way })', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [50, 50] },
          ],
          arrow: '->',
        },
      ]),
    );
    expect(code).toContain("path({ way: [[0, 0], [50, 50]], arrow: '->' })");
  });

  it('draw-way-fold-cycle：fold(-|) + cycle → 字面量 + DrawWay.Cycle + core import', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [40, 0] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ]),
    );
    expect(code).toContain("'-|'");
    expect(code).toContain('DrawWay.Cycle');
    expect(code).toContain("import { DrawWay } from '@retikz/core'");
  });

  it('draw-way-three-leg-fold：默认用裸 token，显式 fraction 用 strict 对象且可还原', () => {
    const scene = ir([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'fold', via: '-|-', to: [40, 20] },
          { type: 'step', kind: 'fold', via: '|-|', fraction: 0.3, to: [80, 40] },
        ],
      },
    ]);
    const code = irToVanillaCode(scene);
    expect(code).toContain("'-|-'");
    expect(code).toContain("{ via: '|-|', fraction: 0.3 }");
    const path = scene.children[0];
    if (path.type !== 'path') throw new Error('expected path fixture');
    expect(parseWay([[0, 0], '-|-', [40, 20], { via: '|-|', fraction: 0.3 }, [80, 40]])).toEqual(path.children);
  });

  it('draw-way-axis-line：保留 horizontalTo / verticalTo 与 label 并可由 parseWay 还原', () => {
    const scene = ir([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          {
            type: 'step',
            kind: 'axis-line',
            axis: 'horizontal',
            to: { id: 'target', anchor: 'center' },
            label: { text: 'x' },
          },
          { type: 'step', kind: 'axis-line', axis: 'vertical', to: [40, 60] },
        ],
      },
    ]);
    const code = irToVanillaCode(scene);
    expect(code).toContain("{ label: { text: 'x' } }");
    expect(code).toContain("{ horizontalTo: { id: 'target', anchor: 'center' } }");
    expect(code).toContain('{ verticalTo: [40, 60] }');
    const path = scene.children[0];
    if (path.type !== 'path') throw new Error('expected path fixture');
    expect(
      parseWay([
        [0, 0],
        { label: { text: 'x' } },
        { horizontalTo: { id: 'target', anchor: 'center' } },
        { verticalTo: [40, 60] },
      ]),
    ).toEqual(path.children);
  });

  it('draw-way-curve：curve → { curve: control } 算子', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', to: [60, 60], control: [20, 30] },
          ],
        },
      ]),
    );
    expect(code).toContain('{ curve: [20, 30] }');
    expect(code).toContain('[60, 60]');
  });

  it('draw-way-unsupported：arc step → 注释降级、不抛、无 core import', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'circlePath', radius: 8 },
            { type: 'step', kind: 'ellipsePath', radius: { x: 12, y: 6 } },
          ],
        },
      ]),
    );
    expect(code).toContain('{ arc: { startAngle: 0, endAngle: 90, radius: 10 } }');
    expect(code).toContain('{ circle: { radius: 8 } }');
    expect(code).toContain('{ ellipse: { radius: { x: 12, y: 6 } } }');
    expect(parseWay([[0, 0], { arc: { startAngle: 0, endAngle: 90, radius: 10 } }])).toEqual([
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
    ]);
  });

  it('scope-codegen：嵌套 scope + transforms', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 40, y: 20 }],
          children: [{ type: 'node', id: 'c', position: [0, 80], text: 'C' }],
        },
      ]),
    );
    expect(code).toContain("scope({ transforms: [{ kind: 'translate', x: 40, y: 20 }] }, [");
    expect(code).toContain("node('c'");
  });

  it('scene-viewbox：viewBox → scene config；无则 {}', () => {
    const withVb = irToVanillaCode(
      ir([{ type: 'node', id: 'a', position: [0, 0] }], { x: 0, y: 0, width: 100, height: 80 }),
    );
    expect(withVb).toContain('viewBox: { x: 0, y: 0, width: 100, height: 80 }');

    const noVb = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0] }]));
    expect(noVb).toContain('scene({ children: [');
    expect(noVb).not.toContain('scene({}');
  });

  it('import-tailoring：只用 node 时 import 不含 draw/scope/coordinate', () => {
    const code = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0] }]));
    const importLine = code.split('\n')[0];
    expect(importLine).toContain('node');
    expect(importLine).not.toContain('draw');
    expect(importLine).not.toContain('scope');
    expect(importLine).not.toContain('coordinate');
  });

  it('format-js：key 不加引号、字符串单引号、短数组内联', () => {
    const code = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0], fill: '#f00' }]));
    expect(code).toContain("fill: '#f00'");
    expect(code).toContain('position: [0, 0]');
    expect(code).not.toContain('"position"');
  });

  it('empty-scene：空 children + 无 config → scene()，不抛', () => {
    expect(() => irToVanillaCode(ir([]))).not.toThrow();
    expect(irToVanillaCode(ir([]))).toContain('const input = scene({ children: [] });');
  });
});

describe('irToVanillaCode fallback', () => {
  it('rectangle/generator stay runnable as raw IR child', () => {
    const code = irToVanillaCode(
      ir([
        {
          type: 'path',
          stroke: '#333',
          children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [20, 10], cornerRadius: 2 }],
        },
      ]),
    );
    expect(code).toContain('raw IR child');
    expect(code).toContain("type: 'path'");
    expect(code).toContain("kind: 'rectangle'");
    expect(code).not.toContain('draw(');
    expect(code.split('\n')[0]).not.toContain('draw');
  });

  it('explicit center arc and partial circle are not faked as way', () => {
    const centeredArc = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10, center: [5, 5] },
          ],
        },
      ]),
    );
    const partialCircle = irToVanillaCode(
      ir([
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180, closed: 'open' },
          ],
        },
      ]),
    );

    expect(centeredArc).toContain('raw IR child');
    expect(partialCircle).toContain('raw IR child');
    expect(centeredArc).not.toContain('{ arc:');
    expect(partialCircle).not.toContain('{ circle:');
  });

  it('保留 scene 根动画', () => {
    const code = irToVanillaCode({
      ...ir([]),
      animations: [
        {
          property: 'viewBox',
          keyframes: [
            { at: 0, value: [0, 0, 100, 100] },
            { at: 1, value: [50, 50, 40, 40] },
          ],
          duration: 600,
        },
      ],
    });

    expect(code).toContain('animations: [');
    expect(code).toContain("property: 'viewBox'");
    expect(code).toContain('duration: 600');
  });

  it('转义多行与控制字符为合法单引号字符串', () => {
    const code = irToVanillaCode(
      ir([{ type: 'node', id: 'label', position: [0, 0], text: "line 1\nline 2\t'\\\u2028" }]),
    );

    expect(code).toContain("text: 'line 1\\nline 2\\t\\'\\\\\\u2028'");
    expect(code).not.toContain('line 1\nline 2');
  });

  it('不把 Tier 2 composite 静默转换成 null', () => {
    expect(() => irToVanillaCode(ir([{ namespace: 'plot', type: 'plot' }]))).toThrow(
      'Cannot generate Vanilla code for Tier 2 composite "plot.plot".',
    );
  });

  it('为三种 Layout composite 生成对应 Vanilla builder 与 adapter', () => {
    const code = irToVanillaCode(
      ir([
        { namespace: 'layout', type: 'flexLayout', children: [] },
        {
          namespace: 'layout',
          type: 'gridLayout',
          columns: [{ kind: 'fixed', value: 10 }],
          children: [],
        },
        { namespace: 'layout', type: 'overlayLayout', children: [] },
      ]),
    );

    expect(code).toContain('flexLayout(');
    expect(code).toContain('gridLayout(');
    expect(code).toContain('overlayLayout(');
    expect(code).toContain('FlexLayoutInputEmbedAdapter');
    expect(code).toContain('GridLayoutInputEmbedAdapter');
    expect(code).toContain('OverlayLayoutInputEmbedAdapter');
  });

  it('为 Legend 生成 authoring builder、adapter 与嵌套 Standard / Layout definitions', () => {
    const code = irToVanillaCode(
      ir([
        {
          namespace: 'standard',
          type: 'legend',
          titleGap: 8,
          size: { x: { kind: 'content' }, y: { kind: 'content' } },
          padding: 0,
          overflow: 'visible',
          content: {
            kind: 'items',
            direction: 'vertical',
            wrap: 'nowrap',
            columnGap: 8,
            rowGap: 8,
            sampleGap: 8,
            sampleAlign: 'center',
            items: [
              {
                key: 'nested',
                sample: {
                  namespace: 'layout',
                  type: 'flexLayout',
                  size: { x: { kind: 'content' }, y: { kind: 'content' } },
                  padding: 0,
                  overflow: 'visible',
                  direction: 'row',
                  wrap: 'nowrap',
                  gap: { column: 0, row: 0 },
                  justifyContent: 'start',
                  alignItems: 'stretch',
                  alignContent: 'start',
                  children: [
                    {
                      kind: 'flex',
                      key: 'grid',
                      margin: 0,
                      basis: 'content',
                      grow: 0,
                      shrink: 1,
                      child: {
                        namespace: 'standard',
                        type: 'grid',
                        bounds: { start: [0, 0], end: [20, 20] },
                        line: { spacing: 10, includeBoundary: false },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ]),
    );

    expect(code).toContain("legend('preview-legend-1'");
    expect(code).toContain('LegendInputEmbedAdapter');
    expect(code).toContain('const compile = { composites: [GridDefinition, FlexLayoutDefinition] };');
    expect(code).not.toContain('LegendDefinition');
    expect(code).not.toMatch(/\binspect\b/);
  });

  it('generates Graph helpers and adapters for unified semantic elements', () => {
    const code = irToVanillaCode(
      ir([
        {
          namespace: 'graph',
          type: 'graphNode',
          id: 'start',
          role: 'terminal',
          position: [0, 0],
          text: 'Start',
        },
        {
          namespace: 'graph',
          type: 'graphNode',
          id: 'step',
          role: 'stage',
          position: [80, 0],
          text: 'Step',
        },
        { namespace: 'graph', type: 'graphNode', role: 'decision', id: 'check', position: [160, 0], text: 'Check' },
        { namespace: 'graph', type: 'graphNode', role: 'junction', id: 'join', position: [240, 0] },
        {
          namespace: 'graph',
          type: 'graphConnector',
          id: 'edge',
          role: 'flow',
          children: [
            { type: 'step', kind: 'move', to: { id: 'start' } },
            { type: 'step', kind: 'line', to: { id: 'step' }, label: { text: 'next' } },
          ],
        },
      ] as never),
    );

    expect(code).toContain("graphNode('preview-graphNode-1'");
    expect(code).toContain("graphConnector('preview-graphConnector-1'");
    expect(code).toContain("to: { id: 'preview-graphNode-1' }");
    expect(code).toContain('GraphNodeInputEmbedAdapter');
    expect(code).toContain('GraphConnectorInputEmbedAdapter');
    expect(code).toContain("from '@retikz/graph-vanilla'");
    expect(code).not.toContain("GraphConnectorInputEmbedAdapter } from '@retikz/standard-vanilla'");
    expect(code).not.toContain('TerminalDefinition');
    expect(code).not.toContain('Unsupported Standard composite');
  });

  it('splits Standard and Graph imports while preserving forward composite targets', () => {
    const code = irToVanillaCode(
      ir([
        {
          namespace: 'graph',
          type: 'graphConnector',
          id: 'edge',
          role: 'flow',
          children: [
            { type: 'step', kind: 'move', to: { id: 'block' } },
            { type: 'step', kind: 'line', to: { id: 'block' } },
          ],
        },
        {
          namespace: 'graph',
          type: 'graphFrame',
          id: 'block',
          sections: [
            {
              key: 'body',
              child: {
                namespace: 'standard',
                type: 'grid',
                bounds: { start: [0, 0], end: [20, 20] },
                line: { spacing: 10, includeBoundary: false },
              },
            },
          ],
        },
      ] as never),
    );

    expect(code).toContain("from '@retikz/graph-vanilla'");
    expect(code).toContain("import { GridDefinition } from '@retikz/standard';");
    expect(code.match(/to: \{ id: 'preview-graphFrame-1\/graphFrame' \}/g)).toHaveLength(2);
  });
});
