import type { LowerTex } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { MathJaxExtension } from '@retikz/tex';

import { TexExtensionExample, TexExtensions } from './tex-extensions.controls';

const extensions: Array<MathJaxExtension> = [...TexExtensions];

const renderTexExtensions = (values: TexExtensionsPreviewValues, lowerTex?: LowerTex) => {
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
    <Layout lowerTex={lowerTex}>
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

/** 图形参数 */
export type TexExtensionsPreviewValues = {
  example:
    | 'color'
    | 'none'
    | 'ams'
    | 'newcommand'
    | 'boldsymbol'
    | 'braket'
    | 'cancel'
    | 'cases'
    | 'centernot'
    | 'mathtools';
};

/** 绘制示例图形 */
export const TexExtensionsPreview = (values: TexExtensionsPreviewValues, lowerTex?: LowerTex) =>
  renderTexExtensions(values, lowerTex);
