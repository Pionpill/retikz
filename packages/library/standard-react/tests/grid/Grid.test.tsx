import { createInputScene } from '@retikz/react';
import type { GridInput } from '@retikz/standard/presentation';
import { createGrid, GridDefinition, GridProvider } from '@retikz/standard/presentation';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Grid } from '../../src/presentation';
import { synchronousAdapters } from '../helpers/synchronous-adapters';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
};

describe('<Grid>', () => {
  it('转发编写的根 Scope 身份和元数据不变', () => {
    const result = normalizeReactInput(
      <Grid
        id="authored-grid"
        meta={{ source: 'react' }}
        bounds={{ start: [0, 0], end: [20, 10] }}
        line={{ spacing: 10 }}
      />,
    );

    expect(result.ir.children[0]).toMatchObject({
      id: 'authored-grid',
      meta: { source: 'react' },
    });
  });

  it('提供相同的 Standard Grid IR 和稳定的精确键提供者', () => {
    const first = normalizeReactInput(<Grid bounds={{ start: [0, 0], end: [20, 10] }} line={{ spacing: 10 }} />);
    const second = normalizeReactInput(<Grid bounds={{ start: [0, 0], end: [20, 10] }} line={{ spacing: 10 }} />);

    expect(first.ir.children[0]).toMatchObject({ namespace: 'standard', type: 'grid' });
    expect(first.contributions[0]).toEqual({ roots: [GridProvider.key], providers: [GridProvider] });
    expect(second.contributions[0]?.providers[0]).toBe(GridProvider);
    expect(GridProvider.makeDefinition([])).toBe(GridDefinition);
  });

  it('通过共享 Grid 输入接受中心形式笛卡尔位置', () => {
    const input = {
      bounds: { position: [20, 10], width: 40, height: 20 },
      line: { spacing: 10 },
    } satisfies GridInput;

    expect(normalizeReactInput(<Grid {...input} />).ir.children[0]).toEqual(createGrid(input));
  });

  it('通过共享 Grid 输入接受 PolarPosition 中心', () => {
    const input = {
      bounds: {
        position: { origin: [10, 5], angle: 90, radius: 20 },
        width: 20,
        height: 10,
      },
      line: { spacing: 10 },
    } satisfies GridInput;

    expect(normalizeReactInput(<Grid {...input} />).ir.children[0]).toEqual(createGrid(input));
  });
});
