import { LayoutItemKind, gridLayoutDefinition, createGridLayout } from '@retikz/layout';
import type { InputEmbedAdapter, InputEmbedContribution } from '@retikz/vanilla';
import { embed, compileToScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { flexLayout, gridLayout, overlayLayout } from '../src';

describe('Layout 子项归一化', () => {
  it('每个嵌套子项只下沉一次', () => {
    let executed = 0;
    const makeContribution = (): InputEmbedContribution => ({
      node: { type: 'node', position: [0, 0], text: 'prepared-child' },
      providerDependencies: { roots: [], providers: [] },
    });
    const adapter: InputEmbedAdapter<unknown> = {
      kind: 'prepared',
      lower: () => {
        executed++;
        return makeContribution();
      },
    };
    const child = embed({ adapter, props: {} });
    const containers = [
      flexLayout({ children: [{ kind: LayoutItemKind.Flex, child }] }),
      gridLayout({ columns: [{ kind: 'content', mode: 'natural' }], children: [{ kind: LayoutItemKind.Grid, child }] }),
      overlayLayout({ children: [{ kind: LayoutItemKind.Overlay, child }] }),
    ];

    for (const container of containers) {
      const input = { type: 'scene' as const, children: [container] };
      const actual = compileToScene(input);
      expect(JSON.stringify(actual.compileResult.scene)).toContain('prepared-child');
    }

    expect(executed).toBe(3);
  });

  it('将嵌套准备好的复合绑定重新定位到 Layout 项 Source 字段', () => {
    const leafDefinition = {
      ...gridLayoutDefinition,
      compile: (
        _node: Parameters<typeof gridLayoutDefinition.compile>[0],
        context: Parameters<typeof gridLayoutDefinition.compile>[1],
      ) => ({
        children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: String(context.runtimeInput) }],
      }),
    };
    const adapter: InputEmbedAdapter<unknown> = {
      kind: 'prepared',
      lower: () => ({
        node: createGridLayout({ columns: [{ kind: 'fixed', value: 1 }] }),
        runtimeInputs: [{ path: [], input: 'nested-bound-ready' }],
        providerDependencies: { roots: [], providers: [] },
      }),
    };
    const result = compileToScene(
      {
        type: 'scene',
        children: [
          flexLayout({
            children: [{ kind: LayoutItemKind.Flex, child: embed({ adapter, props: {} }) }],
          }),
        ],
      },
      {
        compile: { composites: [leafDefinition] },
      },
    );

    expect(JSON.stringify(result.compileResult.scene)).toContain('nested-bound-ready');
  });
});
