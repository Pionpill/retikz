import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { LayoutItemProps } from '@retikz/standard-react';
import type { FC } from 'react';

import { buildIRWithContributions, Layout, Node, Scope } from '@retikz/react';
import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  FlexLayoutDefinition,
  GridLayoutDefinition,
  LayoutItemKind,
  OverlayLayoutDefinition,
} from '@retikz/standard';
import { FlexLayout, GridLayout, LayoutItem, OverlayLayout } from '@retikz/standard-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
  namespace: 'example.foreign',
  contribute: props => ({
    node: { type: 'node', id: props.id, position: [0, 0] },
    datasets: {},
    makeComposites: () => [],
  }),
};

describe('Standard React layout family', () => {
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
    expect(result.contributions[0].namespace).toBe('standard.layout');
    expect(result.contributions[0].makeComposites({})).toEqual([
      FlexLayoutDefinition,
      GridLayoutDefinition,
      OverlayLayoutDefinition,
    ]);
    expect(result.contributions[0].makeComposites({})).not.toBe(result.contributions[0].makeComposites({}));
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

  it('shares one maker across all three container adapters', () => {
    const flex = FlexLayout.embeddableAdapter.contribute({});
    const grid = GridLayout.embeddableAdapter.contribute({ columns: [{ kind: 'fixed', value: 10 }] });
    const overlay = OverlayLayout.embeddableAdapter.contribute({});

    expect(FlexLayout.embeddableAdapter.namespace).toBe('standard.layout');
    expect(GridLayout.embeddableAdapter.namespace).toBe('standard.layout');
    expect(OverlayLayout.embeddableAdapter.namespace).toBe('standard.layout');
    expect(flex.makeComposites).toBe(grid.makeComposites);
    expect(grid.makeComposites).toBe(overlay.makeComposites);
  });

  it('keeps component and Scope inspection policies in a nested authored sidecar only', () => {
    const result = buildIRWithContributions(
      <Scope inspect={{ layout: { overflow: false } }}>
        <FlexLayout inspect={{ gaps: false }}>
          <LayoutItem kind="flex" itemKey="nested">
            <GridLayout inspect={{ tracks: false }} columns={[{ kind: 'fixed', value: 20 }]}>
              <LayoutItem kind="grid" itemKey="leaf">
                <Node position={[0, 0]} />
              </LayoutItem>
            </GridLayout>
          </LayoutItem>
        </FlexLayout>
      </Scope>,
    );

    expect(result.ir).not.toHaveProperty('inspection');
    expect(result.ir.children[0]).not.toHaveProperty('inspect');
    expect(result.inspectionRoots).toEqual([
      {
        locator: {
          target: 'composite',
          path: [
            { kind: 'sceneChild', index: 0 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        tree: {
          policy: {
            inherited: { layout: { overflow: false } },
            self: { gaps: false },
          },
          children: [
            [
              {
                locator: { target: 'composite', path: [] },
                tree: { policy: { self: { tracks: false } } },
              },
            ],
          ],
        },
      },
    ]);
  });

  it('materializes component-local inspection in static SVG without adding inspect to IR', () => {
    const output = renderToStaticMarkup(
      <Layout idPrefix="standard-react-inspection">
        <FlexLayout inspect={{ gaps: true }}>
          <LayoutItem kind="flex" itemKey="leaf">
            <Node position={[0, 0]} text="leaf" />
          </LayoutItem>
        </FlexLayout>
      </Layout>,
    );

    expect(output).toContain('data-retikz-inspection="layout"');
    expect(output).not.toContain('inspect=');
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
    ).toThrow('Standard LayoutItem cannot forward foreign Tier 2 contributions');
  });
});
