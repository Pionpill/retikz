import type { IRFont, IRLineSpec } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeTextControls } from './node-text.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

export const previewControls = nodeTextControls;

/** 将强调选项转换为行级字体覆盖 */
const fontOf = (emphasis: 'normal' | 'bold' | 'italic' | 'bold-italic'): IRFont => ({
  weight: emphasis === 'bold' || emphasis === 'bold-italic' ? 'bold' : 'normal',
  style: emphasis === 'italic' || emphasis === 'bold-italic' ? 'italic' : 'normal',
});

/** Node 多行内容、自动换行与行级样式 playground */
const Demo: FC = () => {
  const values = usePreviewControls(nodeTextControls);
  const lines = values.content.replaceAll('\r', '').split('\n');
  const text = lines.map((line, index): IRLineSpec => {
    const fill = index === 0 ? values.firstFill : index === 1 ? values.secondFill : values.restFill;
    const opacity = index === 0 ? values.firstOpacity : index === 1 ? values.secondOpacity : values.restOpacity;
    const emphasis = index === 0 ? values.firstEmphasis : index === 1 ? values.secondEmphasis : values.restEmphasis;
    return { text: line || ' ', fill, opacity, font: fontOf(emphasis) };
  });

  return (
    <Layout width={600} height={400} viewBox={{ x: -300, y: -200, width: 600, height: 400 }}>
      <Node
        id="Q"
        position={[0, 0]}
        shape={values.shape}
        text={text}
        align={values.align}
        maxTextWidth={values.maxTextWidth}
        lineHeight={values.lineHeight}
        minimumSize={{ width: 80, height: 48 }}
        padding={{ x: 18, y: 12 }}
        fill="lightgray"
        stroke="gray"
      />
    </Layout>
  );
};

export default Demo;
