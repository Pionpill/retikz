import type { FC, ReactNode } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stepActionsControls } from './step-actions.controls';

export const previewControls = stepActionsControls;

type StepActionValues = PreviewControlValuesFor<typeof stepActionsControls>;

/** 渲染面板选中的 Step 基本动作 */
const actionOf = (values: StepActionValues): ReactNode => {
  switch (values.actionKind) {
    case 'line':
      return (
        <Path>
          <Step kind="move" to="A" />
          <Step kind="line" to="B" />
        </Path>
      );
    case 'move':
      return (
        <Path>
          <Step kind="move" to={[-90, -55]} />
          <Step kind="line" to={[-15, -5]} />
          <Step kind="move" to={[15, 5]} />
          <Step kind="line" to={[90, 55]} />
        </Path>
      );
    case 'fold':
      if (values.via === '-|-' || values.via === '|-|') {
        return (
          <Path stroke="dodgerblue" strokeWidth={2}>
            <Step kind="move" to="A" />
            <Step kind="fold" via={values.via} fraction={values.fraction} to="B" />
          </Path>
        );
      }
      return (
        <Path stroke="dodgerblue" strokeWidth={2}>
          <Step kind="move" to="A" />
          <Step kind="fold" via={values.via} to="B" />
        </Path>
      );
    case 'cycle':
      return (
        <Path fill="#dbeafe">
          <Step kind="move" to="A" />
          <Step kind="line" to="B" />
          <Step kind="line" to="C" />
          <Step kind="cycle" />
        </Path>
      );
    case 'rectangle':
      return (
        <Path fill="#dbeafe">
          <Step kind="rectangle" from={[-90, -55]} to={[90, 55]} cornerRadius={values.cornerRadius} />
        </Path>
      );
  }
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={360} height={240} viewBox={{ x: -140, y: -120, width: 280, height: 240 }}>
      {values.actionKind !== 'rectangle' && values.actionKind !== 'move' && (
        <>
          <Node id="A" position={[-90, -45]} stroke="gray" dashed>
            a
          </Node>
          <Node id="B" position={[90, 45]} stroke="gray" dashed>
            b
          </Node>
          {values.actionKind === 'cycle' && (
            <Node id="C" position={[0, 90]} stroke="gray" dashed>
              c
            </Node>
          )}
        </>
      )}
      {values.actionKind === 'fold' && (
        <Path stroke="gray" dashPattern={[1, 4]} lineCap="round">
          <Step kind="move" to="A.center" />
          <Step kind="line" to="B.center" />
        </Path>
      )}
      {actionOf(values)}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Step line / fold / cycle / rectangle playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
