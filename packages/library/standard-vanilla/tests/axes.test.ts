import type { InputAxes } from '@retikz/standard/presentation';
import { axesDefinition, axesProvider, createAxes } from '@retikz/standard/presentation';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { axes, axesInputEmbedAdapter, grid, gridInputEmbedAdapter } from '../src/presentation';

const input: InputAxes = {
  origin: { position: [100, 80], label: '0' },
  x: {
    extent: 40,
    grid: { spacing: 1, offset: 0.5, style: { dashPattern: [2, 1] } },
    line: { arrows: 'both', arrowDetail: { shape: 'openStealth', scale: 1.25 } },
    ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' } },
  },
  y: {
    extent: { negative: 20, positive: 40 },
    grid: { spacing: 1, offset: -0.5, style: { dashPattern: [2, 1] } },
    ticks: { source: { kind: 'values', values: [-20, 20, 40] } },
  },
};

describe('轴（）', () => {
  it('保留编写的根 ID 并将其重新用于嵌入', () => {
    const embed = axes({ ...input, id: 'authored-axes', meta: { source: 'vanilla' } });
    const contribution = axesInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(contribution.node).toMatchObject({ id: 'authored-axes', meta: { source: 'vanilla' } });
  });

  it('创建一个贡献规范 Axes IR 的嵌入', () => {
    const embed = axes(input);
    const contribution = axesInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.axes' });
    expect(contribution.node).toEqual(createAxes(input));
    expect(contribution.providerDependencies).toEqual({ roots: [axesProvider.key], providers: [axesProvider] });
    expect(axesProvider.makeDefinition([])).toBe(axesDefinition);
  });

  it('与 Grid 共存，并贡献两个定义一次', () => {
    const result = normalizeScene(
      scene({
        children: [grid({ bounds: { start: [-2, -1], end: [2, 1] }, line: { spacing: 1 } }), axes(input)],
      }),
      { adapters: [gridInputEmbedAdapter, axesInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(2);
    expect(result.ir.children.map(child => child.type)).toEqual(['grid', 'axes']);
  });
});
