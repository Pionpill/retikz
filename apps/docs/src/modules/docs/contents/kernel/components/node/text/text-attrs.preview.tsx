import { Layout, Node, Text } from '@retikz/react';

import type { Lang } from '@/i18n';

import { textAttrsI18n } from './text-attrs.i18n';

/** 图形参数 */
export type TextAttrsPreviewValues = {
  fill: string;
  opacity: number;
  fontFamily: 'sans-serif' | 'serif' | 'monospace';
  fontSize: number;
  fontWeight: 'bold' | 'normal';
  fontStyle: 'normal' | 'italic';
};

/** 绘制示例图形 */
export const TextAttrsPreview = (values: TextAttrsPreviewValues, lang: Lang) => {
  const i18n = textAttrsI18n[lang];
  return (
    <Layout>
      <Node id="text" position={[0, 0]} style={{ textColor: '#64748b' }} layout={{ align: 'start', padding: 18 }}>
        {i18n.inheritNodeStyle}
        <Text
          fill={values.fill}
          opacity={values.opacity}
          font={{
            family: values.fontFamily,
            size: values.fontSize,
            weight: values.fontWeight,
            style: values.fontStyle,
          }}
        >
          {i18n.textLineOverride}
        </Text>
      </Node>
    </Layout>
  );
};
