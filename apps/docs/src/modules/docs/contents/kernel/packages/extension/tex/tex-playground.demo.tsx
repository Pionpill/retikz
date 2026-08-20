import type { LowerTex } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { previewControlContract, texPlaygroundControls } from './tex-playground.controls';

export const previewControls = texPlaygroundControls;

type TexPlaygroundValues = PreviewControlValuesFor<typeof texPlaygroundControls>;

/** 使用给定 controls 值构造 TeX playground */
const renderTexPlayground = (values: TexPlaygroundValues, lowerTex?: LowerTex) => {
  const delimiters = values.displayMode === 'display' ? '$$' : '$';
  const content = `${delimiters}${values.source}${delimiters}`;

  return (
    <Layout width={400} height={260} viewBox={{ x: -210, y: -135, width: 420, height: 270 }} lowerTex={lowerTex}>
      <Node id="formula" position={[0, 0]} stroke="none" padding={0} font={{ size: values.fontSize }}>
        {content}
      </Node>
    </Layout>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => renderTexPlayground(values));

export const previewSource = controlledPreview.source;

/** 在 MathJax 配置切换期间保留稳定取景，不把原始 TeX 当普通文本显示 */
const renderTexPlaygroundLoading = () => (
  <Layout width={400} height={260} viewBox={{ x: -210, y: -135, width: 420, height: 270 }} />
);

/** 在固定取景中比较 TeX 源码、度量模式与字号 */
const Demo: FC = () => {
  const values = usePreviewControls(texPlaygroundControls);
  const lowerTexState = useLowerTex({ profile: 'math' });
  return lowerTexState.status === 'ready'
    ? renderTexPlayground(values, lowerTexState.lowerTex)
    : renderTexPlaygroundLoading();
};

export default Demo;
