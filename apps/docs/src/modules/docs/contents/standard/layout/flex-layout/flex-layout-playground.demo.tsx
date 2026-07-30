import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { FlexLayout, LayoutItem } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { flexLayoutPlaygroundControls, previewControlContract } from './flex-layout-playground.controls';

export const previewControls = flexLayoutPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={440}
    height={250}
    viewBox={{ x: 0, y: 0, width: 440, height: 250 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <FlexLayout
      inspect={values.inspect}
      size={{ x: { kind: 'fixed', value: 340 }, y: { kind: 'fixed', value: 170 } }}
      padding={12}
      columnGap={8}
      rowGap={8}
      direction={values.direction}
      wrap={values.wrap}
      alignItems={values.alignItems}
      alignContent="center"
    >
      <LayoutItem kind="flex" itemKey="a" basis={values.basis} grow={values.grow} shrink={1}>
        <Node position={[0, 0]} text="A" minimumSize={{ width: 48, height: 34 }} fill="#dbeafe" stroke="#2563eb" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="b" basis={values.basis} grow={0} shrink={values.shrink}>
        <Node position={[0, 0]} text="B" minimumSize={{ width: 48, height: 52 }} fill="#dcfce7" stroke="#16a34a" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="c" basis={values.basis} grow={1} shrink={1}>
        <Node position={[0, 0]} text="C" minimumSize={{ width: 48, height: 42 }} fill="#fef3c7" stroke="#d97706" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="d" basis={values.basis} grow={0} shrink={1}>
        <Node position={[0, 0]} text="D" minimumSize={{ width: 48, height: 30 }} fill="#f3e8ff" stroke="#9333ea" />
      </LayoutItem>
    </FlexLayout>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** FlexLayout direction、wrap、alignment 与 grow/shrink playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
