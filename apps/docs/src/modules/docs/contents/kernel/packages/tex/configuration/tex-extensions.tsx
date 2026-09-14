import type { LowerTex } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { MathJaxExtensionValue } from '@retikz/tex';
import { useLowerTex } from '@retikz/tex/react';
import type { FC } from 'react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import {
  previewControlContract,
  TexExtensionExample,
  TexExtensions,
  texExtensionsControls,
} from './tex-extensions.controls';

export const previewControls = texExtensionsControls;

type TexExtensionsValues = PreviewControlValuesFor<typeof texExtensionsControls>;

const extensions: Array<MathJaxExtensionValue> = [...TexExtensions];

/** 在 MathJax 配置切换期间保留稳定取景，不把原始 TeX 当普通文本显示 */
const renderTexExtensionsLoading = () => <Layout viewBox={{ x: -220, y: -135, width: 440, height: 270 }} />;

/** 根据固定 extensions 和公式示例展示 MathJax 配置效果 */
const renderTexExtensions = (values: TexExtensionsValues, lowerTex?: LowerTex) => {
  const source = TexExtensionExample[values.example];
  const extensionLines = extensions.reduce<Array<string>>(
    (lines, extension) => {
      const current = lines[lines.length - 1] ?? '';
      const next = current.length === 0 ? extension : `${current}, ${extension}`;
      return current.length > 0 && next.length > 34 ? [...lines, extension] : [...lines.slice(0, -1), next];
    },
    extensions.length === 0 ? ['none'] : [],
  );
  const extensionStatus = [
    {
      runs: [{ text: 'Extensions: ', font: { weight: 'bold' as const } }, { text: extensionLines[0] ?? 'none' }],
    },
    ...extensionLines.slice(1).map(line => ({ runs: [{ text: line }] })),
  ];

  return (
    <Layout viewBox={{ x: -220, y: -135, width: 440, height: 270 }} lowerTex={lowerTex}>
      <Node
        position={[0, -25]}
        text={extensionStatus}
        style={{ stroke: 'none', font: { size: 14 } }}
        layout={{ padding: 0 }}
      />
      <Node position={[0, 48]} style={{ stroke: 'none', font: { size: 22 } }} layout={{ padding: 0 }}>
        {`$$${source}$$`}
      </Node>
    </Layout>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => renderTexExtensions(values));

export const previewSource = controlledPreview.source;

/** 在固定取景中查看不同 MathJax 扩展的公式结果 */
const Demo: FC = () => {
  const values = usePreviewControls(texExtensionsControls);
  const lowerTexState = useLowerTex({ extensions });
  return lowerTexState.status === 'ready'
    ? renderTexExtensions(values, lowerTexState.lowerTex)
    : renderTexExtensionsLoading();
};

export default Demo;
