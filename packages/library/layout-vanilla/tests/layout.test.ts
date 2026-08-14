import {
  createGridLayout,
  FlexLayoutDefinition,
  FlexLayoutProvider,
  GridLayoutDefinition,
  GridLayoutProvider,
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
        children: [
          flexLayout('flex', {}),
          gridLayout('grid', { columns: [{ kind: 'fixed', value: 10 }] }),
          overlayLayout('overlay', {}),
        ],
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
        flexLayout('flex', {
          gap: { column: 4, row: 8 },
          children: [{ kind: LayoutItemKind.Flex, key: 'nested', child: nestedGrid }],
        }),
        gridLayout('grid', { columns: [{ kind: 'fixed', value: 10 }] }),
        overlayLayout('overlay', {}),
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

  it('exports a shallow-frozen family adapter array in container order', () => {
    expect(LayoutInputEmbedAdapters).toEqual([
      FlexLayoutInputEmbedAdapter,
      GridLayoutInputEmbedAdapter,
      OverlayLayoutInputEmbedAdapter,
    ]);
    expect(Object.isFrozen(LayoutInputEmbedAdapters)).toBe(true);
    expect(Object.isFrozen(FlexLayoutInputEmbedAdapter)).toBe(false);
  });

  it('rejects a Vanilla embed spec where canonical nested IR is required', () => {
    const embed = flexLayout('nested', {});

    expect(() =>
      createGridLayout({
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
        flexLayout('outer', {
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
    const nestedGridEmbed = gridLayout('grid', { columns: [{ kind: 'fixed', value: 10 }] });
    const input = scene({
      children: [
        flexLayout('outer', {
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
