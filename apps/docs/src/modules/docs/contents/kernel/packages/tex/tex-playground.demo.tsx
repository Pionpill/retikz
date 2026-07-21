import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { previewControlContract, texPlaygroundControls } from './tex-playground.controls';

export const previewControls = texPlaygroundControls;

type TexPlaygroundValues = PreviewControlValuesFor<typeof texPlaygroundControls>;

/** 使用给定 controls 值构造 TeX playground */
const renderTexPlayground = (values: TexPlaygroundValues, lowerTex?: ReturnType<typeof useLowerTex>) => {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => renderTexPlayground(values));

export const previewSource = controlledPreview.source;

/** 在固定取景中比较 TeX 源码、度量模式、字号与 Node 容器 */
const Demo: FC = () => {
  const lowerTex = useLowerTex();
  const values = usePreviewControls(texPlaygroundControls);
  return renderTexPlayground(values, lowerTex);
};

export default Demo;
