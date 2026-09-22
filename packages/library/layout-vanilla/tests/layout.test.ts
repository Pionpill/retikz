import {
  createGridLayout,
  FlexLayoutDefinition,
  FlexLayoutProvider,
  GridLayoutDefinition,
  GridLayoutProvider,
  GridLayoutSchema,
  LayoutItemKind,
  OverlayLayoutDefinition,
  OverlayLayoutProvider,
} from '@retikz/layout';
import {
  flexLayout,
  FlexLayoutInputEmbedAdapter,
  gridLayout,
  GridLayoutInputEmbedAdapter,
  LayoutInputEmbedAdapters,
  overlayLayout,
  OverlayLayoutInputEmbedAdapter,
} from '@retikz/layout-vanilla';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const nestedGrid = createGridLayout({ columns: [{ kind: 'fixed', value: 10 }] });

describe('Layout Vanilla family', () => {
  it('roots only the authored capability and publishes one stable exact-key provider', () => {
    const normalized = normalizeScene(
      scene({
        children: [flexLayout({}), gridLayout({ columns: [{ kind: 'fixed', value: 10 }] }), overlayLayout({})],
      }),
      { adapters: LayoutInputEmbedAdapters },
    );

    expect(normalized.contributions).toEqual([
      { roots: [FlexLayoutProvider.key], providers: [FlexLayoutProvider] },
      { roots: [GridLayoutProvider.key], providers: [GridLayoutProvider] },
      { roots: [OverlayLayoutProvider.key], providers: [OverlayLayoutProvider] },
    ]);
    expect(FlexLayoutProvider.makeDefinition({})).toBe(FlexLayoutDefinition);
    expect(GridLayoutProvider.makeDefinition({})).toBe(GridLayoutDefinition);
    expect(OverlayLayoutProvider.makeDefinition({})).toBe(OverlayLayoutDefinition);
  });

  it('builds exact embed specs and normalizes the family definitions once', () => {
    const input = scene({
      children: [
        flexLayout({
          gap: { column: 4, row: 8 },
          children: [{ kind: LayoutItemKind.Flex, key: 'nested', child: nestedGrid }],
        }),
        gridLayout({ columns: [{ kind: 'fixed', value: 10 }] }),
        overlayLayout({}),
      ],
    });
    const normalized = normalizeScene(input, { adapters: LayoutInputEmbedAdapters });

    expect(input.children.map(child => ('kind' in child ? child.kind : undefined))).toEqual([
      'layout.flexLayout',
      'layout.gridLayout',
      'layout.overlayLayout',
    ]);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['flexLayout', 'gridLayout', 'overlayLayout']);
    expect(normalized.ir.children[0]).toMatchObject({ gap: { column: 4, row: 8 } });
    expect(normalized.contributions.flatMap(contribution => contribution.providers)).toEqual([
      FlexLayoutProvider,
      GridLayoutProvider,
      OverlayLayoutProvider,
    ]);
  });

  it('keeps an omitted item key out of Source IR', () => {
    const normalized = normalizeScene(
      scene({
        children: [
          flexLayout({
            children: [{ kind: LayoutItemKind.Flex, child: { type: 'node', position: [0, 0] } }],
          }),
        ],
      }),
      { adapters: LayoutInputEmbedAdapters },
    );

    const item = (normalized.ir.children[0] as { children: Array<Record<string, unknown>> }).children[0];
    expect(item).not.toHaveProperty('key');
  });

  it('exports a shallow-frozen family adapter array in container order', () => {
    expect(LayoutInputEmbedAdapters).toEqual([
      FlexLayoutInputEmbedAdapter,
      GridLayoutInputEmbedAdapter,
      OverlayLayoutInputEmbedAdapter,
    ]);
    expect(Object.isFrozen(LayoutInputEmbedAdapters)).toBe(true);
    expect(Object.isFrozen(FlexLayoutInputEmbedAdapter)).toBe(false);
  });

  it('rejects an external Vanilla embed payload at the Source schema boundary', () => {
    const embed = flexLayout({});

    expect(() =>
      GridLayoutSchema.parse({
        namespace: 'layout',
        type: 'gridLayout',
        columns: [{ kind: 'fixed', value: 10 }],
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'invalid',
            child: embed,
          },
        ],
      }),
    ).toThrow();
  });

  it('normalizes nested canonical layouts for SVG SSR without DOM state', () => {
    const input = scene({
      children: [
        flexLayout({
          children: [
            {
              kind: LayoutItemKind.Flex,
              key: 'grid',
              child: nestedGrid,
            },
          ],
        }),
      ],
    });
    const normalized = normalizeScene(input, {
      adapters: LayoutInputEmbedAdapters,
    });

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: [
        {
          kind: 'flex',
          key: 'grid',
          child: { namespace: 'layout', type: 'gridLayout' },
        },
      ],
    });
    expect(normalized.contributions.flatMap(contribution => contribution.providers)).toEqual([FlexLayoutProvider]);
    expect(
      renderToSvgString(input, {
        adapters: LayoutInputEmbedAdapters,
        compile: { composites: [GridLayoutDefinition] },
      }),
    ).toMatch(/^<svg/);
  });

  it('forwards nested Layout dependencies through Input items without React participation', () => {
    const nestedGridEmbed = gridLayout({ columns: [{ kind: 'fixed', value: 10 }] });
    const input = scene({
      children: [
        flexLayout({
          children: [
            {
              kind: LayoutItemKind.Flex,
              key: 'grid',
              child: nestedGridEmbed,
            },
          ],
        }),
      ],
    });

    const normalized = normalizeScene(input, { adapters: LayoutInputEmbedAdapters });

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: [{ kind: LayoutItemKind.Flex, key: 'grid', child: { namespace: 'layout', type: 'gridLayout' } }],
    });
    expect(normalized.contributions[0]).toEqual({
      roots: [FlexLayoutProvider.key, GridLayoutProvider.key],
      providers: [FlexLayoutProvider, GridLayoutProvider],
    });
  });
});
