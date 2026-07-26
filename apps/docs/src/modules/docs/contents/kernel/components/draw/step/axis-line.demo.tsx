import type { FC, ReactNode } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { axisLineControls, previewControlContract } from './axis-line.controls';

export const previewControls = axisLineControls;

type AxisLineValues = PreviewControlValuesFor<typeof axisLineControls>;

/** 渲染面板选中的正交连接 */
const connectionOf = (values: AxisLineValues): ReactNode => {
  if (values.connection === 'fold') {
    if (values.via === '-|' || values.via === '|-') {
      return (
        <Path stroke="dodgerblue" strokeWidth={2}>
          <Step kind="move" to="A" />
          <Step kind="fold" via={values.via} to="B" />
        </Path>
      );
    }

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
      <Step kind="axis-line" axis={values.connection} to="B" />
    </Path>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={400}
    height={220}
    viewBox={{ x: -150, y: -100, width: 300, height: 200 }}
    nodeDefault={{ shape: 'rectangle', stroke: 'gray', dashed: true }}
  >
    <Node id="A" position={[-100, -45]}>
      a
    </Node>
    <Node id="B" position={[100, 45]}>
      b
    </Node>
    <Path stroke="gray" dashPattern={[1, 4]} lineCap="round">
      <Step kind="move" to="A.center" />
      <Step kind="line" to="B.center" />
    </Path>
    {connectionOf(values)}
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 用固定端点比较单轴投影与四种折线连接 */
const Demo: FC = controlledPreview.Component;

export default Demo;
