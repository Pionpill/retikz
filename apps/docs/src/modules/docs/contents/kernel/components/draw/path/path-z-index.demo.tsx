import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathZIndexControls } from './path-z-index.controls';

export const previewControls = pathZIndexControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/**
 * Path zIndex 显式栈序
 * @description 固定两个重叠矩形，通过面板改变先声明的蓝色 Path 的 zIndex
 */
const Demo: FC = () => {
  const values = usePreviewControls(pathZIndexControls);

  return (
    <Layout width={220} height={200} viewBox={{ x: 0, y: 0, width: 220, height: 200 }}>
      <Path fill="dodgerblue" stroke="dodgerblue" strokeWidth={2} zIndex={values.zIndex}>
        <Step kind="move" to={[20, 20]} />
        <Step kind="line" to={[120, 20]} />
        <Step kind="line" to={[120, 120]} />
        <Step kind="line" to={[20, 120]} />
        <Step kind="cycle" />
      </Path>
      <Path fill="red" stroke="red" strokeWidth={2}>
        <Step kind="move" to={[70, 70]} />
        <Step kind="line" to={[170, 70]} />
        <Step kind="line" to={[170, 170]} />
        <Step kind="line" to={[70, 170]} />
        <Step kind="cycle" />
      </Path>
    </Layout>
  );
};

export default Demo;
