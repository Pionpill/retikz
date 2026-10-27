import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  flexLayoutDefinition,
  flexLayoutProvider,
  gridLayoutDefinition,
  gridLayoutProvider,
  LayoutItemKind,
  overlayLayoutDefinition,
  overlayLayoutProvider,
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

describe('Layout React 布局系列', () => {
  it('转换嵌套的 Flex/Grid/Overlay JSX 并转发一个有序的 Layout 贡献', () => {
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
      flexLayoutProvider.key,
      gridLayoutProvider.key,
      overlayLayoutProvider.key,
    ]);
    expect(result.contributions[0]?.providers).toEqual([flexLayoutProvider, gridLayoutProvider, overlayLayoutProvider]);
    expect(flexLayoutProvider.makeDefinition([])).toBe(flexLayoutDefinition);
    expect(gridLayoutProvider.makeDefinition([])).toBe(gridLayoutDefinition);
    expect(overlayLayoutProvider.makeDefinition([])).toBe(overlayLayoutDefinition);
  });

  it('使用 itemKey 而不是保留的 React 键，并接受显式 IR 作为唯一子源', () => {
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

  it('将省略的 itemKey 保留在 Source IR 之外', () => {
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

  it('仅将显式容器作为根并复用稳定的单键提供者', () => {
    const flex = normalizeReactInput(<FlexLayout />);
    const grid = normalizeReactInput(<GridLayout columns={[{ kind: 'fixed', value: 10 }]} />);
    const overlay = normalizeReactInput(<OverlayLayout />);

    expect(flex.contributions[0]).toEqual({ roots: [flexLayoutProvider.key], providers: [flexLayoutProvider] });
    expect(grid.contributions[0]).toEqual({ roots: [gridLayoutProvider.key], providers: [gridLayoutProvider] });
    expect(overlay.contributions[0]).toEqual({
      roots: [overlayLayoutProvider.key],
      providers: [overlayLayoutProvider],
    });
    expect(normalizeReactInput(<FlexLayout />).contributions[0]?.providers[0]).toBe(flexLayoutProvider);
  });

  it('对于独立、普通直接、不匹配和多个孩子来说，明确报错', () => {
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

  it('通过片段、数组和空条件子项保留项目顺序', () => {
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

  it('拒绝 Grid 和 Overlay 容器中不匹配的项目', () => {
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

  it('通过 Vanilla 转发外部 Tier 2 子输入', () => {
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
