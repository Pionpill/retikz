import type { InputGrid } from '@retikz/standard/presentation';
import { createGrid, gridDefinition, gridProvider } from '@retikz/standard/presentation';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { grid, gridInputEmbedAdapter } from '../src/presentation';

describe('网格（）', () => {
  it('保留编写的根 ID 并将其重新用于嵌入', () => {
    const embed = grid({
      id: 'authored-grid',
      meta: { source: 'vanilla' },
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });
    const contribution = gridInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(contribution.node).toMatchObject({ id: 'authored-grid', meta: { source: 'vanilla' } });
  });

  it('创建一个嵌入件，其适配器下沉到相同的 Standard Grid IR', () => {
    const embed = grid({
      bounds: { start: [0, 0], end: [20, 10] },
      line: { spacing: 10 },
    });
    const contribution = gridInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(embed).toMatchObject({ type: 'embed', kind: 'standard.grid' });
    expect(contribution.node).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(contribution.providerDependencies).toEqual({ roots: [gridProvider.key], providers: [gridProvider] });
    expect(gridProvider.makeDefinition([])).toBe(gridDefinition);
  });

  it('通过一个稳定的定义生成器合并多个 Grid 嵌入', () => {
    const result = normalizeScene(
      scene({
        children: [
          grid({ bounds: { start: [0, 0], end: [20, 10] }, line: { spacing: 10 } }),
          grid({ bounds: { start: [30, 0], end: [50, 10] }, line: { spacing: 10 } }),
        ],
      }),
      { adapters: [gridInputEmbedAdapter] },
    );

    expect(result.contributions).toHaveLength(2);
  });

  it('通过共享 Grid 输入接受中心形式笛卡尔位置', () => {
    const input: InputGrid = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      line: { spacing: 10 },
    };
    const embed = grid(input);
    const contribution = gridInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });

  it('通过共享 Grid 输入接受 PolarPosition 中心', () => {
    const input: InputGrid = {
      bounds: {
        position: { origin: [10, 5], angle: 90, radius: 20 },
        width: 20,
        height: 10,
      },
      line: { spacing: 10 },
    };
    const embed = grid(input);
    const contribution = gridInputEmbedAdapter.lower(embed.props, {
      id: 'runtime',
      kind: embed.kind,
      layerId: 'main',
      identityPath: ['main', 'runtime'],
    });

    expect(contribution.node).toEqual(createGrid(input));
  });
});
