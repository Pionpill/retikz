import type { FC } from 'react';

import { Layout, Node, Text } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,textAttrsControls } from './text-attrs.controls';

export const previewControls = textAttrsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={181} viewBox={{ x: -210, y: -95, width: 420, height: 190 }}>
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
});

export const previewSource = controlledPreview.source;

/** Text 行级属性覆盖 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
