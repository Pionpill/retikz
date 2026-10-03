import { LayoutItemKind, GridLayoutDefinition, createGridLayout } from '@retikz/layout';
import type { InputEmbedAdapter, InputEmbedContribution } from '@retikz/vanilla';
import { processToStaticInputResult, processToStaticInputResultAsync } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { flexLayout, gridLayout, overlayLayout, LayoutInputEmbedAdapters } from '../src';

describe('Layout async authoring', () => {
  it('prepares nested children once with synchronous contribution parity', async () => {
    let executed = 0;
    const makeContribution = (): InputEmbedContribution => ({
      node: { type: 'node', position: [0, 0], text: 'prepared-child' },
      providerDependencies: { roots: [], providers: [] },
    });
    const adapter: InputEmbedAdapter<unknown> & Required<Pick<InputEmbedAdapter<unknown>, 'lower' | 'prepare'>> = {
      kind: 'prepared',
      lower: makeContribution,
      prepare: () => ({
        execute: () => {
          executed++;
          return Promise.resolve(makeContribution());
        },
      }),
    };
    const child = { type: 'embed' as const, kind: 'prepared', props: {} };
    const containers = [
      flexLayout({ children: [{ kind: LayoutItemKind.Flex, child }] }),
      gridLayout({ columns: [{ kind: 'content', mode: 'natural' }], children: [{ kind: LayoutItemKind.Grid, child }] }),
      overlayLayout({ children: [{ kind: LayoutItemKind.Overlay, child }] }),
    ];
    const options = { adapters: [...LayoutInputEmbedAdapters, adapter] };
    for (const container of containers) {
      const input = { children: [container] };
      const expected = processToStaticInputResult(input, options);
      const actual = await processToStaticInputResultAsync(input, options);
      expect(actual.scene).toEqual(expected.scene);
      expect(JSON.stringify(actual.scene)).toContain('prepared-child');
    }
    expect(executed).toBe(3);
  });

  it('relocates a nested prepared composite binding to the Layout item Source field', async () => {
    const leafDefinition = {
      ...GridLayoutDefinition,
      compile: (
        _node: Parameters<typeof GridLayoutDefinition.compile>[0],
        context: Parameters<typeof GridLayoutDefinition.compile>[1],
      ) => ({
        children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: String(context.runtimeInput) }],
      }),
    };
    const adapter: InputEmbedAdapter<unknown> & Required<Pick<InputEmbedAdapter<unknown>, 'prepare'>> = {
      kind: 'prepared',
      prepare: () => ({
        execute: () => ({
          node: createGridLayout({ columns: [{ kind: 'fixed', value: 1 }] }),
          runtimeInputs: [{ path: [], input: 'nested-bound-ready' }],
          providerDependencies: { roots: [], providers: [] },
        }),
      }),
    };
    const result = await processToStaticInputResultAsync(
      {
        children: [
          flexLayout({
            children: [{ kind: LayoutItemKind.Flex, child: { type: 'embed', kind: 'prepared', props: {} } }],
          }),
        ],
      },
      {
        adapters: [...LayoutInputEmbedAdapters, adapter],
        compile: { composites: [leafDefinition] },
      },
    );
    expect(JSON.stringify(result.scene)).toContain('nested-bound-ready');
  });
});
