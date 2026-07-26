import type { FC, ReactNode } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawOrthogonalControls, previewControlContract } from './draw-orthogonal.controls';

export const previewControls = drawOrthogonalControls;

type DrawOrthogonalValues = PreviewControlValuesFor<typeof drawOrthogonalControls>;

/** 根据面板状态生成对应的 Draw way */
const connectionOf = (values: DrawOrthogonalValues): ReactNode => {
  if (values.connection === 'horizontal') {
    return <Draw way={['A', { horizontalTo: 'B' }]} stroke="#2563eb" strokeWidth={2} />;
  }

  if (values.connection === 'vertical') {
    return <Draw way={['A', { verticalTo: 'B' }]} stroke="#2563eb" strokeWidth={2} />;
  }

  if (values.via === '-|' || values.via === '|-') {
    return <Draw way={['A', values.via, 'B']} stroke="#2563eb" strokeWidth={2} />;
  }

  return <Draw way={['A', { via: values.via, fraction: values.fraction }, 'B']} stroke="#2563eb" strokeWidth={2} />;
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
    <Draw way={['A.center', 'B.center']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
    {connectionOf(values)}
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 用固定端点比较 Draw 的单轴投影与四种折线连接 */
const Demo: FC = controlledPreview.Component;

export default Demo;
