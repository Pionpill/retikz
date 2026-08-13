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
  FlexLayoutVanillaAdapter,
  gridLayout,
  GridLayoutVanillaAdapter,
  LayoutVanillaAdapters,
  overlayLayout,
  OverlayLayoutVanillaAdapter,
} from '@retikz/layout-vanilla';
import { normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const nestedGrid = createGridLayout({ columns: [{ kind: 'fixed', value: 10 }] });

/** 构造 adapter identity 之外不参与 Layout lowering 的最小宿主上下文 */
const contextFor = (kind: string) => ({
  id: kind,
  kind,
  layerId: 'root',
  identityPath: ['root', kind],
});

describe('Layout Vanilla family', () => {
  it('roots only the authored capability and publishes one stable exact-key provider', () => {
    const flex = FlexLayoutVanillaAdapter.lower({}, contextFor('layout.flexLayout'));
    const grid = GridLayoutVanillaAdapter.lower(
      { columns: [{ kind: 'fixed', value: 10 }] },
      contextFor('layout.gridLayout'),
    );
    const overlay = OverlayLayoutVanillaAdapter.lower({}, contextFor('layout.overlayLayout'));

    expect(flex.providerDependencies).toEqual({ roots: [FlexLayoutProvider.key], providers: [FlexLayoutProvider] });
    expect(grid.providerDependencies).toEqual({ roots: [GridLayoutProvider.key], providers: [GridLayoutProvider] });
    expect(overlay.providerDependencies).toEqual({
      roots: [OverlayLayoutProvider.key],
      providers: [OverlayLayoutProvider],
    });
    expect(FlexLayoutProvider.makeDefinition({})).toBe(FlexLayoutDefinition);
    expect(GridLayoutProvider.makeDefinition({})).toBe(GridLayoutDefinition);
    expect(OverlayLayoutProvider.makeDefinition({})).toBe(OverlayLayoutDefinition);
  });

  it('builds exact embed specs and normalizes the family definitions once', () => {
    const figure = {
      type: 'figure' as const,
      version: 1 as const,
      children: [
        flexLayout('flex', {
          gap: { column: 4, row: 8 },
          children: [{ kind: LayoutItemKind.Flex, key: 'nested', child: nestedGrid }],
        }),
        gridLayout('grid', { columns: [{ kind: 'fixed', value: 10 }] }),
        overlayLayout('overlay', {}),
      ],
    };
    const normalized = normalizeFigureSpec(figure, { adapters: LayoutVanillaAdapters });

    expect(figure.children.map(child => child.kind)).toEqual([
      'layout.flexLayout',
      'layout.gridLayout',
      'layout.overlayLayout',
    ]);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['flexLayout', 'gridLayout', 'overlayLayout']);
    expect(normalized.ir.children[0]).toMatchObject({ gap: { column: 4, row: 8 } });
    expect(normalized.providerDefinitions.composites).toEqual([
      FlexLayoutDefinition,
      GridLayoutDefinition,
      OverlayLayoutDefinition,
    ]);
  });

  it('exports a shallow-frozen family adapter array in container order', () => {
    expect(LayoutVanillaAdapters).toEqual([
      FlexLayoutVanillaAdapter,
      GridLayoutVanillaAdapter,
      OverlayLayoutVanillaAdapter,
    ]);
    expect(Object.isFrozen(LayoutVanillaAdapters)).toBe(true);
    expect(Object.isFrozen(FlexLayoutVanillaAdapter)).toBe(false);
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
    const figure = {
      type: 'figure' as const,
      version: 1 as const,
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
    };
    const normalized = normalizeFigureSpec(figure, {
      adapters: LayoutVanillaAdapters,
      composites: [GridLayoutDefinition],
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
    expect(normalized.providerDefinitions.composites).toEqual([FlexLayoutDefinition, GridLayoutDefinition]);
    expect(
      renderToSvgString(figure, {
        adapters: LayoutVanillaAdapters,
        compile: { composites: [GridLayoutDefinition] },
      }),
    ).toMatch(/^<svg/);
  });
});
