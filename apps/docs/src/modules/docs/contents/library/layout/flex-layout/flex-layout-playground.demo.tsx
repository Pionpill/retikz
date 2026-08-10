import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { InspectFlexLayout, LayoutInspectLayout } from '@retikz/layout-react/inspect';
import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolveLayoutInspectionValues } from '../layout-inspection-controls';
import {
  flexLayoutInspectionFamilyControls,
  flexLayoutPlaygroundControls,
  previewControlContract,
} from './flex-layout-playground.controls';

export const previewControls = flexLayoutPlaygroundControls;

const createPreview = (inspecting: boolean) =>
  defineControlledPreview(previewControlContract, values => {
    const children = (
      <>
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
      </>
    );
    const layoutProps = {
      size: { x: { kind: 'fixed', value: 340 }, y: { kind: 'fixed', value: 170 } },
      padding: 12,
      gap: { column: 8, row: 8 },
      direction: values.direction,
      wrap: values.wrap,
      alignItems: values.alignItems,
      alignContent: 'center',
    } as const;
    const hostProps = {
      width: 440,
      height: 250,
      viewBox: { x: 0, y: 0, width: 440, height: 250 },
      style: { maxWidth: '100%', height: 'auto' },
    } as const;

    return inspecting ? (
      <LayoutInspectLayout {...hostProps}>
        <InspectFlexLayout
          {...layoutProps}
          inspect={resolveLayoutInspectionValues(values, flexLayoutInspectionFamilyControls)}
        >
          {children}
        </InspectFlexLayout>
      </LayoutInspectLayout>
    ) : (
      <Layout {...hostProps}>
        <FlexLayout {...layoutProps}>{children}</FlexLayout>
      </Layout>
    );
  });

const controlledPreview = createPreview(true);
const canonicalPreview = createPreview(false);

export const previewSource = canonicalPreview.source;

/** FlexLayout direction、wrap、alignment 与 grow/shrink playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
