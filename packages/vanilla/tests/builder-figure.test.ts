import { describe, expect, it } from 'vitest';
import { coordinate } from '../src/builder/coordinate';
import { draw } from '../src/builder/draw';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';

describe('@retikz/vanilla figure() — IR 装配', () => {
  it('figure-ir：hyperscript 把 children 装进 { version:1, type:scene }', () => {
    const fig = figure({ width: 400, height: 300 }, [
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]);
    expect(fig.ir.version).toBe(1);
    expect(fig.ir.type).toBe('scene');
    expect(fig.ir.children).toEqual([
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]);
  });

  it('figure-viewbox：config.viewBox → IR.viewBox；width/height 不进 IR', () => {
    const fig = figure({ width: 400, height: 300, viewBox: { x: 0, y: 0, width: 100, height: 80 } });
    expect(fig.ir.viewBox).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect('width' in fig.ir).toBe(false);
    expect('height' in fig.ir).toBe(false);
  });

  it('hyperscript-eq-fluent：同图两路 ir 相等', () => {
    const hyper = figure({ width: 400, height: 300 }, [
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
      coordinate('mid', { position: [60, 40] }),
    ]);
    const fluent = figure({ width: 400, height: 300 })
      .node('a', { position: [0, 0], text: 'A' })
      .draw(['a', 'b'], { arrow: '->' })
      .coordinate('mid', { position: [60, 40] });
    expect(fluent.ir).toEqual(hyper.ir);
  });

  it('figure-no-config：figure() 全空 → 空 scene', () => {
    expect(figure().ir).toEqual({ version: 1, type: 'scene', children: [] });
  });

  it('figure-children-first：figure(children) 省略 config 直接传子节点，等价 figure({}, children)', () => {
    const direct = figure([node('a', { position: [0, 0], text: 'A' }), draw(['a', 'b'])]);
    const withConfig = figure({}, [node('a', { position: [0, 0], text: 'A' }), draw(['a', 'b'])]);
    expect(direct.ir).toEqual(withConfig.ir);
    expect(direct.ir.children).toHaveLength(2);
  });
});

describe('@retikz/vanilla 公开导出', () => {
  it('public-exports：figure/node/draw/coordinate/scope 从包根导出', async () => {
    const api = await import('../src');
    expect(typeof api.figure).toBe('function');
    expect(typeof api.node).toBe('function');
    expect(typeof api.draw).toBe('function');
    expect(typeof api.coordinate).toBe('function');
    expect(typeof api.scope).toBe('function');
  });
});
