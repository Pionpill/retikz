import type { GridLayoutInput } from '@retikz/layout';
import type { FC } from 'react';

import { GridLayout, LayoutItem } from '@retikz/layout-react';
import { InspectGridLayout, LayoutInspectLayout } from '@retikz/layout-react/inspect';
import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolveLayoutInspectionValues } from '../layout-inspection-controls';
import {
  gridLayoutInspectionFamilyControls,
  gridLayoutPlaygroundControls,
  previewControlContract,
} from './grid-layout-playground.controls';

export const previewControls = gridLayoutPlaygroundControls;

const createPreview = (inspecting: boolean) =>
  defineControlledPreview(previewControlContract, values => {
    const children = (
      <>
        <LayoutItem kind="grid" itemKey="a">
          <Node
            position={[0, 0]}
            text="A"
            style={{ fill: '#dbeafe', stroke: '#2563eb' }}
            layout={{ minimumSize: { width: 42, height: 32 } }}
          />
        </LayoutItem>
        <LayoutItem kind="grid" itemKey="b">
          <Node
            position={[0, 0]}
            text="B"
            style={{ fill: '#dcfce7', stroke: '#16a34a' }}
            layout={{ minimumSize: { width: 58, height: 42 } }}
          />
        </LayoutItem>
        <LayoutItem kind="grid" itemKey="c" column={{ span: 2 }}>
          <Node
            position={[0, 0]}
            text="C × 2"
            style={{ fill: '#fef3c7', stroke: '#d97706' }}
            layout={{ minimumSize: { width: 78, height: 34 } }}
          />
        </LayoutItem>
        <LayoutItem kind="grid" itemKey="d">
          <Node
            position={[0, 0]}
            text="D"
            style={{ fill: '#f3e8ff', stroke: '#9333ea' }}
            layout={{ minimumSize: { width: 42, height: 48 } }}
          />
        </LayoutItem>
      </>
    );
    const layoutProps = {
      columns: [
        { kind: 'fraction', factor: 1 },
        { kind: 'fraction', factor: values.fraction },
        { kind: 'fraction', factor: 1 },
      ],
      rows: [
        { kind: 'fixed', value: 66 },
        { kind: 'fixed', value: 66 },
      ],
      size: { x: { kind: 'fixed', value: 350 }, y: { kind: 'fixed', value: 170 } },
      padding: 10,
      autoFlow: values.autoFlow,
      columnGap: values.columnGap,
      rowGap: values.rowGap,
      justifyItems: values.justifyItems,
      alignItems: values.alignItems,
    } satisfies Omit<GridLayoutInput, 'children'>;
    const hostProps = {
      viewBox: { x: 0, y: 0, width: 440, height: 250 },
    } as const;

    return inspecting ? (
      <LayoutInspectLayout {...hostProps}>
        <InspectGridLayout
          {...layoutProps}
          inspect={resolveLayoutInspectionValues(values, gridLayoutInspectionFamilyControls)}
        >
          {children}
        </InspectGridLayout>
      </LayoutInspectLayout>
    ) : (
      <Layout {...hostProps}>
        <GridLayout {...layoutProps}>{children}</GridLayout>
      </Layout>
    );
  });

const controlledPreview = createPreview(true);
const canonicalPreview = createPreview(false);

export const previewSource = canonicalPreview.source;

/** GridLayout track、auto-flow、gap 与 alignment playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
