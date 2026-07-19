import type { FC } from 'react';

import { Layout, Node, Text } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { textAttrsControls } from './text-attrs.controls';

export const previewControls = textAttrsControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Text 行级属性覆盖 playground */
const Demo: FC = () => {
  const values = usePreviewControls(textAttrsControls);

  return (
    <Layout width={420} height={190} viewBox={{ x: -210, y: -95, width: 420, height: 190 }}>
      <Node id="text" position={[0, 0]} align="start" padding={18} textColor="#64748b">
        继承 Node 样式
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
          Text 行级覆盖
        </Text>
      </Node>
    </Layout>
  );
};

export default Demo;
