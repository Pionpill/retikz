import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathRoundedCornersControls } from './path-rounded-corners.controls';

export const previewControls = pathRoundedCornersControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/**
 * 折线几何圆角与描边拐点 playground
 * @description 上方 lineJoin 只改变描边；下方 roundedCorners 改变路径中心线几何
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathRoundedCornersControls);

  return (
    <Layout width={440} height={260} viewBox={{ x: -220, y: -130, width: 440, height: 260 }}>
      <Path stroke="lightgray" strokeWidth={values.strokeWidth} lineJoin={values.lineJoin}>
        <Step kind="move" to={[-170, -50]} />
        <Step to={[0, -105]} />
        <Step to={[170, -50]} />
      </Path>
      <Path stroke="black" strokeWidth={1}>
        <Step kind="move" to={[-170, -50]} />
        <Step to={[0, -105]} />
        <Step to={[170, -50]} />
      </Path>

      <Path stroke="lightblue" strokeWidth={values.strokeWidth} roundedCorners={values.radius}>
        <Step kind="move" to={[-170, 75]} />
        <Step to={[0, 20]} />
        <Step to={[170, 75]} />
      </Path>
      <Path stroke="steelblue" strokeWidth={1} roundedCorners={values.radius}>
        <Step kind="move" to={[-170, 75]} />
        <Step to={[0, 20]} />
        <Step to={[170, 75]} />
      </Path>
    </Layout>
  );
};

export default Demo;
