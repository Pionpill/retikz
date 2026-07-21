import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathRoundedCornersControls, previewControlContract } from './path-rounded-corners.controls';

export const previewControls = pathRoundedCornersControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={191} viewBox={{ x: -220, y: -105, width: 440, height: 210 }}>
      <Path stroke="lightgray" strokeWidth={values.strokeWidth} lineJoin={values.lineJoin}>
        <Step kind="move" to={[-170, -30]} />
        <Step to={[0, -75]} />
        <Step to={[170, -30]} />
      </Path>
      <Path stroke="black" strokeWidth={1}>
        <Step kind="move" to={[-170, -30]} />
        <Step to={[0, -75]} />
        <Step to={[170, -30]} />
      </Path>

      <Path stroke="lightblue" strokeWidth={values.strokeWidth} roundedCorners={values.radius}>
        <Step kind="move" to={[-170, 55]} />
        <Step to={[0, 10]} />
        <Step to={[170, 55]} />
      </Path>
      <Path stroke="steelblue" strokeWidth={1} roundedCorners={values.radius}>
        <Step kind="move" to={[-170, 55]} />
        <Step to={[0, 10]} />
        <Step to={[170, 55]} />
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
