import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { GridLayout, LayoutItem } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolveLayoutInspectionValues } from '../layout-inspection-controls';
import {
  gridLayoutInspectionFamilyControls,
  gridLayoutPlaygroundControls,
  previewControlContract,
} from './grid-layout-playground.controls';

export const previewControls = gridLayoutPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={440}
    height={250}
    viewBox={{ x: 0, y: 0, width: 440, height: 250 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <GridLayout
      inspect={resolveLayoutInspectionValues(values, gridLayoutInspectionFamilyControls)}
      columns={[
        { kind: 'fraction', factor: 1 },
        { kind: 'fraction', factor: values.fraction },
        { kind: 'fraction', factor: 1 },
      ]}
      rows={[
        { kind: 'fixed', value: 66 },
        { kind: 'fixed', value: 66 },
      ]}
      size={{ x: { kind: 'fixed', value: 350 }, y: { kind: 'fixed', value: 170 } }}
      padding={10}
      autoFlow={values.autoFlow}
      columnGap={values.columnGap}
      rowGap={values.rowGap}
      justifyItems={values.justifyItems}
      alignItems={values.alignItems}
    >
      <LayoutItem kind="grid" itemKey="a">
        <Node position={[0, 0]} text="A" minimumSize={{ width: 42, height: 32 }} fill="#dbeafe" stroke="#2563eb" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="b">
        <Node position={[0, 0]} text="B" minimumSize={{ width: 58, height: 42 }} fill="#dcfce7" stroke="#16a34a" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="c" column={{ span: 2 }}>
        <Node position={[0, 0]} text="C × 2" minimumSize={{ width: 78, height: 34 }} fill="#fef3c7" stroke="#d97706" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="d">
        <Node position={[0, 0]} text="D" minimumSize={{ width: 42, height: 48 }} fill="#f3e8ff" stroke="#9333ea" />
      </LayoutItem>
    </GridLayout>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** GridLayout track、auto-flow、gap 与 alignment playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
