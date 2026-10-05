import { Layout } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';
import type { FC } from 'react';

import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { previewControlContract, texExtensionsControls } from './tex-extensions.controls';
import { TexExtensions } from './tex-extensions.controls';
import { TexExtensionsPreview } from './tex-extensions.preview';

export const previewControls = texExtensionsControls;

const extensions = [...TexExtensions];

/** 在 MathJax 配置切换期间保留稳定取景，不把原始 TeX 当普通文本显示 */
const renderTexExtensionsLoading = () => <Layout />;

const controlledPreview = defineControlledPreview(previewControlContract, values => TexExtensionsPreview(values));

export const previewSource = controlledPreview.source;

/** 在固定取景中查看不同 MathJax 扩展的公式结果 */
const Demo: FC = () => {
  const values = usePreviewControls(texExtensionsControls);
  const lowerTexState = useLowerTex({ extensions });

  return lowerTexState.status === 'ready'
    ? TexExtensionsPreview(values, lowerTexState.lowerTex)
    : renderTexExtensionsLoading();
};

export default Demo;
