import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathRoundedCornersControls, previewControlContract } from './path-rounded-corners.controls';

export const previewControls = pathRoundedCornersControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={{ x: -200, y: -130, width: 400, height: 260 }}>
      <Path style={{ stroke: '#94a3b8', strokeWidth: values.strokeWidth, lineJoin: values.lineJoin }}>
        <Step kind="move" to={[-150, -85]} />
        <Step to={[0, -85]} />
        <Step to={[0, -25]} />
      </Path>
      <Path style={{ stroke: '#334155', strokeWidth: 2 }}>
        <Step kind="move" to={[-150, -85]} />
        <Step to={[0, -85]} />
        <Step to={[0, -25]} />
      </Path>

      <Path roundedCorners={values.radius} style={{ stroke: '#93c5fd', strokeWidth: values.strokeWidth }}>
        <Step kind="move" to={[-150, 85]} />
        <Step to={[0, 85]} />
        <Step to={[0, 25]} />
      </Path>
      <Path roundedCorners={values.radius} style={{ stroke: '#2563eb', strokeWidth: 2 }}>
        <Step kind="move" to={[-150, 85]} />
        <Step to={[0, 85]} />
        <Step to={[0, 25]} />
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * 折线几何圆角与描边拐点 playground
 * @description 上方 lineJoin 只改变描边；下方 roundedCorners 改变路径中心线几何
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
