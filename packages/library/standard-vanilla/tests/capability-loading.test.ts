import { axes, frame, grid, legend, surface, surfaceChild } from '@retikz/standard-vanilla/presentation';
import { createGrid, gridDefinition, LegendContentKind } from '@retikz/standard/presentation';
import { compileToScene, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const input = scene({
  children: [
    grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } }),
    axes({ x: { extent: 20 }, y: { extent: 20 } }),
    frame({ children: [{ type: 'node', position: [0, 0], text: 'Contract' }] }),
    surface({ child: surfaceChild({ type: 'node', position: [0, 0], text: 'Surface' }) }),
    legend({
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'node', sample: { type: 'node', position: [0, 0], text: 'N' } }],
      },
    }),
  ],
});

describe('Standard Vanilla 定义加载', () => {
  it('无需注册即可归一化各工厂构造的嵌入项', () => {
    const normalized = normalizeScene(input);

    expect(normalized.contributions).toHaveLength(5);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame', 'surface', 'legend']);
  });

  it('使用显式定义编译直接 Standard IR，没有适配器', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })],
    };

    expect(() =>
      renderToSvgString(compileToScene(ir, { compile: { composites: [gridDefinition] } }).scene),
    ).not.toThrow();
  });

  it('对相同显式定义对象进行去重，并拒绝同一键上的不同对象', () => {
    expect(() =>
      renderToSvgString(
        compileToScene(
          scene({ children: [grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
          { compile: { composites: [gridDefinition] } },
        ).scene,
      ),
    ).not.toThrow();
    expect(() =>
      renderToSvgString(
        compileToScene(
          scene({ children: [grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
          { compile: { composites: [{ ...gridDefinition }] } },
        ).scene,
      ),
    ).toThrow(/definition conflict.*standard\.grid/i);
  });
});
