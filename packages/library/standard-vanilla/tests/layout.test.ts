import {
  createGridLayout,
  FlexLayoutDefinition,
  GridLayoutDefinition,
  LayoutItemKind,
  OverlayLayoutDefinition,
} from '@retikz/standard';
import {
  flexLayout,
  FlexLayoutVanillaAdapter,
  gridLayout,
  GridLayoutVanillaAdapter,
  overlayLayout,
  OverlayLayoutVanillaAdapter,
  StandardLayoutVanillaAdapters,
} from '@retikz/standard-vanilla';
import { normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const nestedGrid = createGridLayout({ columns: [{ kind: 'fixed', value: 10 }] });

/** 构造 adapter identity 之外不参与 Standard lowering 的最小宿主上下文 */
const contextFor = (kind: string) => ({
  id: kind,
  kind,
  namespace: 'standard.layout',
  layerId: 'root',
  identityPath: ['root', kind],
});

describe('Standard Vanilla layout family', () => {
  it('uses one namespace and one stable mutable-copy composite maker', () => {
    const flex = FlexLayoutVanillaAdapter.lower({}, contextFor('standard.flexLayout'));
    const grid = GridLayoutVanillaAdapter.lower(
      { columns: [{ kind: 'fixed', value: 10 }] },
      contextFor('standard.gridLayout'),
    );
    const overlay = OverlayLayoutVanillaAdapter.lower({}, contextFor('standard.overlayLayout'));

    expect([
      FlexLayoutVanillaAdapter.namespace,
      GridLayoutVanillaAdapter.namespace,
      OverlayLayoutVanillaAdapter.namespace,
    ]).toEqual(['standard.layout', 'standard.layout', 'standard.layout']);
    expect(flex.makeComposites).toBe(grid.makeComposites);
    expect(grid.makeComposites).toBe(overlay.makeComposites);
    expect(flex.makeComposites({})).toEqual([FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition]);
    expect(flex.makeComposites({})).not.toBe(flex.makeComposites({}));
    expect(Object.isFrozen(flex.makeComposites({}))).toBe(false);
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
    const normalized = normalizeFigureSpec(figure, { adapters: StandardLayoutVanillaAdapters });

    expect(figure.children.map(child => child.kind)).toEqual([
      'standard.flexLayout',
      'standard.gridLayout',
      'standard.overlayLayout',
    ]);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['flexLayout', 'gridLayout', 'overlayLayout']);
    expect(normalized.ir.children[0]).toMatchObject({ gap: { column: 4, row: 8 } });
    expect(normalized.composites).toEqual([FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition]);
  });

  it('exports a shallow-frozen family adapter array in container order', () => {
    expect(StandardLayoutVanillaAdapters).toEqual([
      FlexLayoutVanillaAdapter,
      GridLayoutVanillaAdapter,
      OverlayLayoutVanillaAdapter,
    ]);
    expect(Object.isFrozen(StandardLayoutVanillaAdapters)).toBe(true);
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
    const normalized = normalizeFigureSpec(figure, { adapters: StandardLayoutVanillaAdapters });

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'standard',
      type: 'flexLayout',
      children: [
        {
          kind: 'flex',
          key: 'grid',
          child: { namespace: 'standard', type: 'gridLayout' },
        },
      ],
    });
    expect(normalized.composites).toEqual([FlexLayoutDefinition, GridLayoutDefinition, OverlayLayoutDefinition]);
    expect(renderToSvgString(figure, { adapters: StandardLayoutVanillaAdapters })).toMatch(/^<svg/);
  });
});
