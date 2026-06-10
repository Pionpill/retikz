import { describe, expect, it } from 'vitest';
import { type IR, parseWay } from '@retikz/core';

import { irToVanillaCode } from '../src/components/shared/component-preview/irToVanillaCode';

const ir = (children: IR['children'], viewBox?: IR['viewBox']): IR => ({
  version: 1,
  type: 'scene',
  children,
  ...(viewBox ? { viewBox } : {}),
});

describe('irToVanillaCode', () => {
  it('import-header：恒定 vanilla import + figure 装配', () => {
    const code = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]));
    expect(code).toContain("from '@retikz/vanilla'");
    expect(code).toContain('figure(');
    // 无 viewBox → 省略空 config，直接 figure(children)
    expect(code).toContain('const fig = figure([');
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

  it('draw-way-line：move+line steps → draw([t0, t1])', () => {
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
    expect(code).toContain('draw([[0, 0], [50, 50]], { arrow: \'->\' })');
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
            { type: 'step', kind: 'ellipsePath', radiusX: 12, radiusY: 6 },
          ],
        },
      ]),
    );
    expect(code).toContain('{ arc: { startAngle: 0, endAngle: 90, radius: 10 } }');
    expect(code).toContain('{ circle: { radius: 8 } }');
    expect(code).toContain('{ ellipse: { radiusX: 12, radiusY: 6 } }');
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
    expect(code).toContain('scope({ transforms: [{ kind: \'translate\', x: 40, y: 20 }] }, [');
    expect(code).toContain("node('c'");
  });

  it('figure-viewbox：viewBox → figure config；无则 {}', () => {
    const withVb = irToVanillaCode(
      ir([{ type: 'node', id: 'a', position: [0, 0] }], { x: 0, y: 0, width: 100, height: 80 }),
    );
    expect(withVb).toContain('viewBox: { x: 0, y: 0, width: 100, height: 80 }');

    const noVb = irToVanillaCode(ir([{ type: 'node', id: 'a', position: [0, 0] }]));
    expect(noVb).toContain('figure([');
    expect(noVb).not.toContain('figure({}');
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

  it('empty-scene：空 children + 无 config → figure()，不抛', () => {
    expect(() => irToVanillaCode(ir([]))).not.toThrow();
    expect(irToVanillaCode(ir([]))).toContain('const fig = figure();');
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
});
