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
import {
  FlexLayout,
  GridLayout,
  FlexLayoutItem,
  GridLayoutItem,
  OverlayLayoutItem,
  OverlayLayout,
} from '@retikz/layout-react';
import { createInputScene, Node } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import { normalizeScene } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { synchronousAdapters } from './helpers/synchronous-adapters';

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
  return normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
};

describe('Layout React layout family', () => {
  it('converts nested Flex/Grid/Overlay JSX and forwards one ordered Layout contribution', () => {
    const result = normalizeReactInput(
      <FlexLayout direction="row" gap={{ column: 4, row: 8 }}>
        <FlexLayoutItem itemKey="grid" grow={1}>
          <GridLayout columns={[{ kind: 'fixed', value: 20 }]}>
            <GridLayoutItem itemKey="overlay">
              <OverlayLayout>
                <OverlayLayoutItem itemKey="leaf">
                  <Node id="leaf" position={[0, 0]} />
                </OverlayLayoutItem>
              </OverlayLayout>
            </GridLayoutItem>
          </GridLayout>
        </FlexLayoutItem>
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
        <FlexLayoutItem key="react-key" itemKey="ir-key" ir={{ type: 'node', position: [1, 2] }} />
      </FlexLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', key: 'ir-key', child: { type: 'node', position: [1, 2] } }],
    });
  });

  it('keeps an omitted itemKey out of Source IR', () => {
    const result = normalizeReactInput(
      <FlexLayout>
        <FlexLayoutItem ir={{ type: 'node', position: [1, 2] }} />
      </FlexLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', child: { type: 'node', position: [1, 2] } }],
    });
    expect((result.ir.children[0] as { children: Array<Record<string, unknown>> }).children[0]).not.toHaveProperty(
      'key',
    );
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
    expect(() =>
      normalizeReactInput(<FlexLayoutItem itemKey="loose" ir={{ type: 'node', position: [0, 0] }} />),
    ).toThrow(/FlexLayoutItem must be a direct child of FlexLayout/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <Node position={[0, 0]} />
        </FlexLayout>,
      ),
    ).toThrow(/expects FlexLayoutItem/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <GridLayoutItem itemKey="wrong" ir={{ type: 'node', position: [0, 0] }} />
        </FlexLayout>,
      ),
    ).toThrow(/expects FlexLayoutItem/i);
    expect(() =>
      normalizeReactInput(
        <FlexLayout>
          <FlexLayoutItem itemKey="many">
            <Node position={[0, 0]} />
            <Node position={[1, 1]} />
          </FlexLayoutItem>
        </FlexLayout>,
      ),
    ).toThrow(/exactly one authoring child/i);
  });

  it('preserves item order through fragments, arrays and empty conditional children', () => {
    const result = normalizeReactInput(
      <GridLayout columns={[{ kind: 'fixed', value: 20 }]}>
        <>
          {false}
          <GridLayoutItem itemKey="first" ir={{ type: 'node', id: 'first', position: [0, 0] }} />
          {[<GridLayoutItem key="second" itemKey="second" ir={{ type: 'node', id: 'second', position: [0, 0] }} />]}
          {null}
        </>
      </GridLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'gridLayout',
      children: [
        { kind: 'grid', key: 'first', child: { id: 'first' } },
        { kind: 'grid', key: 'second', child: { id: 'second' } },
      ],
    });
  });

  it('rejects mismatched items in Grid and Overlay containers', () => {
    expect(() =>
      normalizeReactInput(
        <GridLayout columns={[{ kind: 'fixed', value: 20 }]}>
          <OverlayLayoutItem ir={{ type: 'node', position: [0, 0] }} />
        </GridLayout>,
      ),
    ).toThrow(/expects GridLayoutItem/i);
    expect(() =>
      normalizeReactInput(
        <OverlayLayout>
          <FlexLayoutItem ir={{ type: 'node', position: [0, 0] }} />
        </OverlayLayout>,
      ),
    ).toThrow(/expects OverlayLayoutItem/i);
  });

  it('forwards foreign Tier 2 child input through Vanilla', () => {
    const result = normalizeReactInput(
      <FlexLayout>
        <FlexLayoutItem itemKey="foreign">
          <Foreign id="foreign" />
        </FlexLayoutItem>
      </FlexLayout>,
    );

    expect(result.ir.children[0]).toMatchObject({
      type: 'flexLayout',
      children: [{ kind: 'flex', key: 'foreign', child: { type: 'node', id: 'foreign', position: [0, 0] } }],
    });
  });
});
