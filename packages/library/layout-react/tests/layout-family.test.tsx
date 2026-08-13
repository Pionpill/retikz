import type { LayoutItemProps } from '@retikz/layout-react';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC } from 'react';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  FlexLayoutDefinition,
  FlexLayoutProvider,
  GridLayoutDefinition,
  GridLayoutProvider,
  LayoutItemKind,
  OverlayLayoutDefinition,
  OverlayLayoutProvider,
} from '@retikz/layout';
import { FlexLayout, GridLayout, LayoutItem, OverlayLayout } from '@retikz/layout-react';
import { buildIRWithContributions, Node } from '@retikz/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

type ForeignProps = Readonly<{ id: string }>;
type ForeignComponent = FC<ForeignProps> & {
  isTier2Embeddable: true;
  embeddableAdapter: EmbeddableTier2Adapter<ForeignProps>;
};

const Foreign = (() => null) as unknown as ForeignComponent;
Foreign.displayName = 'Foreign';
Foreign.isTier2Embeddable = true;
Foreign.embeddableAdapter = {
  displayName: 'Foreign',
  contribute: props => ({
    node: { type: 'node', id: props.id, position: [0, 0] },
    providerDependencies: { roots: [], providers: [] },
  }),
};

describe('Layout React layout family', () => {
  it('converts nested Flex/Grid/Overlay JSX and folds definitions into one family contribution', () => {
    const result = buildIRWithContributions(
      <FlexLayout direction="row" gap={{ column: 4, row: 8 }}>
        <>
          <LayoutItem kind="flex" itemKey="grid" grow={1}>
            <GridLayout columns={[{ kind: 'fixed', value: 20 }]}>
              <LayoutItem kind="grid" itemKey="overlay">
                <OverlayLayout>
                  <LayoutItem kind="overlay" itemKey="leaf">
                    <Node id="leaf" position={[0, 0]} />
                  </LayoutItem>
                </OverlayLayout>
              </LayoutItem>
            </GridLayout>
          </LayoutItem>
        </>
      </FlexLayout>,
    );

    expect(result.ir.children).toEqual([
      createFlexLayout({
        direction: 'row',
        gap: { column: 4, row: 8 },
        children: [
          {
            kind: LayoutItemKind.Flex,
            key: 'grid',
            grow: 1,
            child: createGridLayout({
              columns: [{ kind: 'fixed', value: 20 }],
              children: [
                {
                  kind: LayoutItemKind.Grid,
                  key: 'overlay',
                  child: createOverlayLayout({
                    children: [
                      {
                        kind: LayoutItemKind.Overlay,
                        key: 'leaf',
                        child: { type: 'node', id: 'leaf', position: [0, 0] },
                      },
                    ],
                  }),
                },
              ],
            }),
          },
        ],
      }),
    ]);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]?.roots).toEqual([
      FlexLayoutProvider.key,
      GridLayoutProvider.key,
      OverlayLayoutProvider.key,
    ]);
    expect(result.contributions[0]?.providers).toEqual([FlexLayoutProvider, GridLayoutProvider, OverlayLayoutProvider]);
    expect(FlexLayoutProvider.makeDefinition({})).toBe(FlexLayoutDefinition);
    expect(GridLayoutProvider.makeDefinition({})).toBe(GridLayoutDefinition);
    expect(OverlayLayoutProvider.makeDefinition({})).toBe(OverlayLayoutDefinition);
  });

  it('uses itemKey instead of the reserved React key and accepts explicit IR as the sole child source', () => {
    const contribution = FlexLayout.embeddableAdapter.contribute({
      children: <LayoutItem key="react-key" kind="flex" itemKey="ir-key" ir={{ type: 'node', position: [1, 2] }} />,
    });

    expect(contribution.node).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', key: 'ir-key', child: { type: 'node', position: [1, 2] } }],
    });
  });

  it('roots only the authored container and reuses its stable single-key provider', () => {
    const flex = FlexLayout.embeddableAdapter.contribute({});
    const grid = GridLayout.embeddableAdapter.contribute({ columns: [{ kind: 'fixed', value: 10 }] });
    const overlay = OverlayLayout.embeddableAdapter.contribute({});

    expect(flex.providerDependencies).toEqual({ roots: [FlexLayoutProvider.key], providers: [FlexLayoutProvider] });
    expect(grid.providerDependencies).toEqual({ roots: [GridLayoutProvider.key], providers: [GridLayoutProvider] });
    expect(overlay.providerDependencies).toEqual({
      roots: [OverlayLayoutProvider.key],
      providers: [OverlayLayoutProvider],
    });
    expect(FlexLayout.embeddableAdapter.contribute({}).providerDependencies.providers[0]).toBe(FlexLayoutProvider);
  });

  it('fails loudly for standalone, ordinary direct, mismatched and multiple children', () => {
    const empty = { kind: 'flex', itemKey: 'empty' } as unknown as LayoutItemProps;

    expect(() =>
      buildIRWithContributions(<LayoutItem kind="flex" itemKey="loose" ir={{ type: 'node', position: [0, 0] }} />),
    ).toThrow(/direct child of FlexLayout, GridLayout, or OverlayLayout/i);
    expect(() => FlexLayout.embeddableAdapter.contribute({ children: <Node position={[0, 0]} /> })).toThrow(
      /direct children must be LayoutItem/i,
    );
    expect(() =>
      FlexLayout.embeddableAdapter.contribute({
        children: <LayoutItem kind="grid" itemKey="wrong" ir={{ type: 'node', position: [0, 0] }} />,
      }),
    ).toThrow(/expects LayoutItem kind "flex"/i);
    expect(() =>
      FlexLayout.embeddableAdapter.contribute({
        children: (
          <LayoutItem kind="flex" itemKey="many">
            <Node position={[0, 0]} />
            <Node position={[1, 1]} />
          </LayoutItem>
        ),
      }),
    ).toThrow(/exactly one IRChild/i);
    expect(() =>
      FlexLayout.embeddableAdapter.contribute({
        children: createElement(LayoutItem, empty),
      }),
    ).toThrow(/exactly one of children or ir/i);
  });

  it('rejects ambiguous child sources and foreign Tier 2 contributions', () => {
    const ambiguous = {
      kind: 'flex',
      itemKey: 'ambiguous',
      ir: { type: 'node' },
      children: <Node position={[0, 0]} />,
    } as unknown as LayoutItemProps;

    expect(() => FlexLayout.embeddableAdapter.contribute({ children: createElement(LayoutItem, ambiguous) })).toThrow(
      /exactly one of children or ir/i,
    );
    expect(() =>
      FlexLayout.embeddableAdapter.contribute({
        children: (
          <LayoutItem kind="flex" itemKey="foreign">
            <Foreign id="foreign" />
          </LayoutItem>
        ),
      }),
    ).toThrow('LayoutItem cannot forward foreign Tier 2 contributions');
  });
});
