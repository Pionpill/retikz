import { Layout } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';
import type { FC } from 'react';

import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { previewControlContract, texPlaygroundControls } from './tex-playground.controls';
import { TexPlaygroundPreview } from './tex-playground.preview';

export const previewControls = texPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => TexPlaygroundPreview(values));

export const previewSource = controlledPreview.source;

/** 在 MathJax 配置切换期间保留稳定取景，不把原始 TeX 当普通文本显示 */
const renderTexPlaygroundLoading = () => <Layout />;

/** 在固定取景中比较 TeX 源码、度量模式与字号 */
const Demo: FC = () => {
  const values = usePreviewControls(texPlaygroundControls);
  const lowerTexState = useLowerTex({ profile: 'math' });
  return lowerTexState.status === 'ready'
    ? TexPlaygroundPreview(values, lowerTexState.lowerTex)
    : renderTexPlaygroundLoading();
};

export default Demo;
