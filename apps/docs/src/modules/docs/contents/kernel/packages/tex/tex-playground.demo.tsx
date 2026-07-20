import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { texPlaygroundControls } from './tex-playground.controls';

export const previewControls = texPlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 在固定取景中比较 TeX 源码、度量模式、字号与 Node 容器 */
const Demo: FC = () => {
  const lowerTex = useLowerTex();
  const values = usePreviewControls(texPlaygroundControls);
  const delimiters = values.displayMode === 'display' ? '$$' : '$';
  const content = `${delimiters}${values.source}${delimiters}`;
  const framed = values.shape !== 'none';

  return (
    <Layout width={400} height={260} viewBox={{ x: -210, y: -135, width: 420, height: 270 }} lowerTex={lowerTex}>
      <Node
        id="formula"
        position={[0, 0]}
        shape={framed ? values.shape : undefined}
        padding={framed ? values.padding : 0}
        fill={framed ? 'lightgray' : 'none'}
        fillOpacity={framed ? 0.18 : undefined}
        stroke={framed ? 'gray' : 'none'}
        cornerRadius={values.shape === 'rectangle' ? 4 : undefined}
        font={{ size: values.fontSize }}
      >
        {content}
      </Node>
    </Layout>
  );
};

export default Demo;
