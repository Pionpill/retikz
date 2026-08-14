import type { LayoutItemProps } from '@retikz/layout-react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

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
import { createInputScene, Node } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

type ForeignProps = Readonly<{ id: string }>;
type ForeignComponent = FC<ForeignProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: AnyInputEmbedAdapter;
};

const Foreign = (() => null) as unknown as ForeignComponent;
Foreign.displayName = 'Foreign';
Foreign.isTier2Embeddable = true;
Foreign.inputEmbedAdapter = {
  kind: 'test.foreign',
  lower: props => ({
    node: { type: 'node', id: (props as ForeignProps).id, position: [0, 0] },
    providerDependencies: { roots: [], providers: [] },
  }),
};

/** 以 React 真实 authoring 路径归一化 Layout family JSX */
const normalizeReactInput = (children: ReactNode) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('Layout React layout family', () => {
  it('converts nested Flex/Grid/Overlay JSX and forwards one ordered Layout contribution', () => {
    const result = normalizeReactInput(
      <FlexLayout direction="row" gap={{ column: 4, row: 8 }}>
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
    const result = normalizeReactInput(
      <FlexLayout>
        <LayoutItem key="react-key" kind="flex" itemKey="ir-key" ir={{ type: 'node', position: [1, 2] }} />
      </FlexLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', key: 'ir-key', child: { type: 'node', position: [1, 2] } }],
    });
  });

  it('roots only the authored container and reuses its stable single-key provider', () => {
    const flex = normalizeReactInput(<FlexLayout />);
    const grid = normalizeReactInput(<GridLayout columns={[{ kind: 'fixed', value: 10 }]} />);
    const overlay = normalizeReactInput(<OverlayLayout />);

    expect(flex.contributions[0]).toEqual({ roots: [FlexLayoutProvider.key], providers: [FlexLayoutProvider] });
    expect(grid.contributions[0]).toEqual({ roots: [GridLayoutProvider.key], providers: [GridLayoutProvider] });
    expect(overlay.contributions[0]).toEqual({
      roots: [OverlayLayoutProvider.key],
      providers: [OverlayLayoutProvider],
    });
    expect(normalizeReactInput(<FlexLayout />).contributions[0]?.providers[0]).toBe(FlexLayoutProvider);
  });

  it('fails loudly for standalone, ordinary direct, mismatched and multiple children', () => {
    const empty = { kind: 'flex', itemKey: 'empty' } as unknown as LayoutItemProps;

    expect(() =>
      normalizeReactInput(<LayoutItem kind="flex" itemKey="loose" ir={{ type: 'node', position: [0, 0] }} />),
    ).toThrow(/direct child of FlexLayout, GridLayout, or OverlayLayout/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <Node position={[0, 0]} />
        </FlexLayout>,
      ),
    ).toThrow(/direct children must be LayoutItem/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <LayoutItem kind="grid" itemKey="wrong" ir={{ type: 'node', position: [0, 0] }} />
        </FlexLayout>,
      ),
    ).toThrow(/expects LayoutItem kind "flex"/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <LayoutItem kind="flex" itemKey="many">
            <Node position={[0, 0]} />
            <Node position={[1, 1]} />
          </LayoutItem>
        </FlexLayout>,
      ),
    ).toThrow(/exactly one authoring child/i);
    expect(() => normalizeReactInput(<FlexLayout>{createElement(LayoutItem, empty)}</FlexLayout>)).toThrow(
      /exactly one of children or ir/i,
    );
  });

  it('rejects ambiguous child sources and forwards foreign Tier 2 child input through Vanilla', () => {
    const ambiguous = {
      kind: 'flex',
      itemKey: 'ambiguous',
      ir: { type: 'node' },
      children: <Node position={[0, 0]} />,
    } as unknown as LayoutItemProps;

    expect(() => normalizeReactInput(<FlexLayout>{createElement(LayoutItem, ambiguous)}</FlexLayout>)).toThrow(
      /exactly one of children or ir/i,
    );
    const result = normalizeReactInput(
      <FlexLayout>
        <LayoutItem kind="flex" itemKey="foreign">
          <Foreign id="foreign" />
        </LayoutItem>
      </FlexLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', key: 'foreign', child: { type: 'node', id: 'foreign', position: [0, 0] } }],
    });
  });
});
