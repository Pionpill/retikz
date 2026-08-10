import type { ReactNode } from 'react';

import { convertReactNodeToIR, Layout, Node, Path, Step } from '@retikz/react';
import { createLegend, LegendContentKind, LegendDefinition } from '@retikz/standard';
import { forwardRef, Fragment, memo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  LegendItemProps,
  LegendItemsFormProps,
  LegendProps,
  LegendRampFormProps,
  LegendRampProps,
  LegendTickProps,
  LegendTitleProps,
} from '../../src';

import { Legend, LegendItem, LegendRamp, LegendTick, LegendTitle } from '../../src';

const itemSample = (
  <Path stroke="currentColor" strokeWidth={2}>
    <Step kind="move" to={[0, 0]} />
    <Step kind="line" to={[24, 0]} />
  </Path>
);

const itemLabel = <Node position={[0, 0]} text="Active" />;

const contribute = (props: LegendProps) => Legend.embeddableAdapter.contribute(props);

describe('<Legend>', () => {
  it('forwards authored root Scope identity and metadata through both forms', () => {
    const contribution = contribute({
      kind: LegendContentKind.Items,
      id: 'authored-legend',
      meta: { source: 'react' },
      children: <LegendItem itemKey="active" sample={itemSample} />,
    });

    expect(contribution.node).toMatchObject({ id: 'authored-legend', meta: { source: 'react' } });
  });

  it('exports explicit items and ramp forms with required marker props', () => {
    expect(Legend).toBeTypeOf('function');
    expect(LegendTitle).toBeTypeOf('function');
    expect(LegendItem).toBeTypeOf('function');
    expect(LegendRamp).toBeTypeOf('function');
    expect(LegendTick).toBeTypeOf('function');

    expectTypeOf<LegendProps>().toHaveProperty('kind');
    expectTypeOf<LegendProps>().toHaveProperty('children');
    expectTypeOf<LegendProps>().not.toHaveProperty('content');
    expectTypeOf<LegendProps>().not.toHaveProperty('title');
    expectTypeOf<LegendItemsFormProps>().toMatchTypeOf<{ kind: 'items'; children?: ReactNode }>();
    expectTypeOf<LegendRampFormProps>().toMatchTypeOf<{ kind: 'ramp'; children?: ReactNode }>();
    expectTypeOf<LegendTitleProps>().toMatchTypeOf<{ children: ReactNode }>();
    expectTypeOf<LegendItemProps>().toMatchTypeOf<{ itemKey: string; sample: ReactNode }>();
    expectTypeOf<LegendItemProps>().toHaveProperty('children');
    expectTypeOf<LegendRampProps>().toMatchTypeOf<{ children: ReactNode }>();
    expectTypeOf<LegendTickProps>().toMatchTypeOf<{ tickKey: string; offset: number }>();
    expectTypeOf<LegendTickProps>().toHaveProperty('children');
  });

  it('converts items and ramp marker trees to canonical Legend IR', () => {
    const itemsProps = {
      kind: LegendContentKind.Items,
      contentAlign: 'end' as const,
      gap: { row: 6, column: 5 },
      children: (
        <>
          <LegendTitle>
            <Node position={[0, 0]} text="Status" />
          </LegendTitle>
          <LegendItem itemKey="active" sample={itemSample}>
            {itemLabel}
          </LegendItem>
        </>
      ),
    } satisfies LegendItemsFormProps;
    const rampProps = {
      kind: LegendContentKind.Ramp,
      direction: 'horizontal',
      children: (
        <>
          <LegendRamp>
            <Path stroke="#777" strokeWidth={8}>
              <Step kind="move" to={[0, 0]} />
              <Step kind="line" to={[80, 0]} />
            </Path>
          </LegendRamp>
          <LegendTick tickKey="low" offset={0}>
            <Node position={[0, 0]} text="Low" />
          </LegendTick>
          <LegendTick tickKey="high" offset={1}>
            <Node position={[0, 0]} text="High" />
          </LegendTick>
        </>
      ),
    } satisfies LegendRampFormProps;

    expect(contribute(itemsProps).node).toEqual(
      createLegend({
        title: { type: 'node', position: [0, 0], text: 'Status' },
        contentAlign: 'end',
        content: {
          kind: LegendContentKind.Items,
          gap: { row: 6, column: 5 },
          items: [
            {
              key: 'active',
              sample: {
                type: 'path',
                stroke: 'currentColor',
                strokeWidth: 2,
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [24, 0] },
                ],
              },
              label: { type: 'node', position: [0, 0], text: 'Active' },
            },
          ],
        },
      }),
    );
    expect(contribute(rampProps).node).toEqual(
      createLegend({
        content: {
          kind: LegendContentKind.Ramp,
          direction: 'horizontal',
          sample: {
            type: 'path',
            stroke: '#777',
            strokeWidth: 8,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [80, 0] },
            ],
          },
          ticks: [
            { key: 'low', offset: 0, label: { type: 'node', position: [0, 0], text: 'Low' } },
            { key: 'high', offset: 1, label: { type: 'node', position: [0, 0], text: 'High' } },
          ],
        },
      }),
    );
    expect(contribute(itemsProps).makeComposites({})).toEqual([LegendDefinition]);
    expect(contribute(rampProps).makeComposites({})).toEqual([LegendDefinition]);
  });

  it('preserves authored marker order through arrays and Fragments', () => {
    const conditional = false;
    const contribution = contribute({
      kind: LegendContentKind.Items,
      children: [
        null,
        undefined,
        conditional,
        <Fragment key="items">
          <LegendItem key="first" itemKey="first" sample={<Node position={[0, 0]} text="1" />} />
          {[<LegendItem key="second" itemKey="second" sample={<Node position={[0, 0]} text="2" />} />]}
        </Fragment>,
      ],
    });

    expect(contribution.node).toMatchObject({
      content: {
        kind: LegendContentKind.Items,
        items: [
          { key: 'first', sample: { type: 'node', text: '1' } },
          { key: 'second', sample: { type: 'node', text: '2' } },
        ],
      },
    });
  });

  it('accepts empty items and rejects invalid ramp offsets through the Standard schema', () => {
    expect(contribute({ kind: LegendContentKind.Items, children: null }).node).toEqual(
      createLegend({ content: { kind: LegendContentKind.Items, items: [] } }),
    );

    const invalidOffsets = [
      { offset: undefined, error: /offset/i },
      { offset: Number.NaN, error: /offset/i },
      { offset: Number.POSITIVE_INFINITY, error: /offset/i },
      { offset: -0.1, error: /offset/i },
      { offset: 1.1, error: /offset/i },
    ];
    for (const { offset, error } of invalidOffsets) {
      expect(() =>
        contribute({
          kind: LegendContentKind.Ramp,
          children: (
            <>
              <LegendRamp>{itemSample}</LegendRamp>
              <LegendTick tickKey="invalid" offset={offset as number} />
            </>
          ),
        }),
      ).toThrow(error);
    }
    expect(() =>
      contribute({
        kind: LegendContentKind.Ramp,
        children: (
          <>
            <LegendRamp>{itemSample}</LegendRamp>
            <LegendTick tickKey="high" offset={0.8} />
            <LegendTick tickKey="low" offset={0.2} />
          </>
        ),
      }),
    ).toThrow(/offset/i);
  });

  it('rejects invalid marker lists and standalone markers', () => {
    const Unknown = () => <LegendItem itemKey="hidden" sample={itemSample} />;
    const MemoizedItem = memo(Unknown);
    const ForwardedItem = forwardRef<never>(() => <LegendItem itemKey="hidden" sample={itemSample} />);
    const invalidChildren: Array<ReactNode> = [
      'label',
      1,
      <div key="dom" />,
      <Unknown key="function" />,
      <MemoizedItem key="memo" />,
      <ForwardedItem key="forward" />,
      <LegendTick key="tick" tickKey="tick" offset={0} />,
    ];

    for (const children of invalidChildren) {
      expect(() => contribute({ kind: LegendContentKind.Items, children })).toThrow(/Legend/i);
    }
    expect(() =>
      contribute({
        kind: LegendContentKind.Items,
        children: (
          <>
            <LegendTitle>{itemLabel}</LegendTitle>
            <LegendTitle>{itemLabel}</LegendTitle>
          </>
        ),
      }),
    ).toThrow(/one LegendTitle/i);
    expect(() =>
      contribute({ kind: LegendContentKind.Ramp, children: <LegendItem itemKey="item" sample={itemSample} /> }),
    ).toThrow(/Legend/i);
    expect(() => contribute({ kind: LegendContentKind.Ramp, children: null })).toThrow(/one LegendRamp/i);
    expect(() =>
      contribute({
        kind: LegendContentKind.Ramp,
        children: (
          <>
            <LegendRamp>{itemSample}</LegendRamp>
            <LegendRamp>{itemSample}</LegendRamp>
          </>
        ),
      }),
    ).toThrow(/one LegendRamp/i);

    expect(() => convertReactNodeToIR(<LegendTitle>{itemLabel}</LegendTitle>)).toThrow(/direct child of Legend/i);
    expect(() => convertReactNodeToIR(<LegendItem itemKey="item" sample={itemSample} />)).toThrow(
      /direct child of Legend/i,
    );
    expect(() => convertReactNodeToIR(<LegendRamp>{itemSample}</LegendRamp>)).toThrow(/direct child of Legend/i);
    expect(() => convertReactNodeToIR(<LegendTick tickKey="tick" offset={0} />)).toThrow(/direct child of Legend/i);
  });

  it('rejects invalid required and optional slot cardinality before conversion', () => {
    const invalidTitles: Array<ReactNode> = [
      null,
      'Status',
      1,
      <div key="dom" />,
      [itemLabel, <Node key="second" position={[0, 0]} text="Second" />],
      [itemLabel, 'extra'],
    ];
    for (const children of invalidTitles) {
      expect(() =>
        contribute({ kind: LegendContentKind.Items, children: <LegendTitle>{children}</LegendTitle> }),
      ).toThrow(/LegendTitle.*exactly one/i);
    }
    expect(() =>
      contribute({
        kind: LegendContentKind.Items,
        children: <LegendItem itemKey="item" sample={[itemSample, itemLabel]} />,
      }),
    ).toThrow(/LegendItem sample.*exactly one/i);
    expect(() =>
      contribute({
        kind: LegendContentKind.Items,
        children: (
          <LegendItem itemKey="item" sample={itemSample}>
            {itemLabel}
            extra
          </LegendItem>
        ),
      }),
    ).toThrow(/LegendItem label.*at most one/i);
  });

  it('accepts one-child function Sugar without rewriting the public builder', () => {
    const SampleSugar = () => itemSample;
    const InvalidSugar = () => (
      <>
        {itemSample}
        {itemLabel}
      </>
    );

    expect(
      contribute({
        kind: LegendContentKind.Items,
        children: <LegendItem itemKey="sugar" sample={<SampleSugar />} />,
      }).node,
    ).toMatchObject({
      content: { kind: LegendContentKind.Items, items: [{ key: 'sugar', sample: { type: 'path' } }] },
    });
    expect(() =>
      contribute({
        kind: LegendContentKind.Items,
        children: <LegendItem itemKey="invalid" sample={<InvalidSugar />} />,
      }),
    ).toThrow(/LegendItem sample.*exactly one/i);
  });

  it('rejects the removed React plain-data props at runtime', () => {
    const legacyProps = {
      content: { kind: LegendContentKind.Items, items: [] },
      title: { type: 'node', position: [0, 0], text: 'Legacy' },
    };

    expect(() => contribute(legacyProps as unknown as LegendProps)).toThrow(/children.*kind/i);
  });

  it('renders the same static output as direct canonical IR in the same compile environment', () => {
    const props = {
      kind: LegendContentKind.Items,
      children: (
        <LegendItem itemKey="active" sample={itemSample}>
          {itemLabel}
        </LegendItem>
      ),
    } satisfies LegendItemsFormProps;
    const direct = contribute(props).node;
    const directOutput = renderToStaticMarkup(
      <Layout
        ir={{ type: 'scene', version: 1, children: [direct] }}
        composites={[LegendDefinition]}
        width={200}
        height={120}
      />,
    );
    const reactOutput = renderToStaticMarkup(
      <Layout width={200} height={120}>
        <Legend {...props} />
      </Layout>,
    );

    expect(reactOutput).toBe(directOutput);
  });
});
