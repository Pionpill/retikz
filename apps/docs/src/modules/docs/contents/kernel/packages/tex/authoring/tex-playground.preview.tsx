import type { LowerTex } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

const renderTexPlayground = (values: TexPlaygroundPreviewValues, lowerTex?: LowerTex) => {
  const delimiters = values.displayMode === 'display' ? '$$' : '$';
  const content = `${delimiters}${values.source}${delimiters}`;

  return (
    <Layout lowerTex={lowerTex}>
      <Node
        id="formula"
        position={[0, 0]}
        style={{ stroke: 'none', font: { size: values.fontSize } }}
        layout={{ padding: 0 }}
      >
        {content}
      </Node>
    </Layout>
  );
};

/** 图形参数 */
export type TexPlaygroundPreviewValues = {
  source: string;
  displayMode: 'display' | 'inline';
  fontSize: number;
};

/** 绘制示例图形 */
export const TexPlaygroundPreview = (values: TexPlaygroundPreviewValues, lowerTex?: LowerTex) =>
  renderTexPlayground(values, lowerTex);
