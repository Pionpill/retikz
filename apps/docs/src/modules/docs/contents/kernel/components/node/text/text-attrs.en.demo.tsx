import type { FC } from 'react';

import { Layout, Node, Text } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, textAttrsControls } from './text-attrs.en.controls';

export const previewControls = textAttrsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout width={400} height={181} viewBox={{ x: -210, y: -95, width: 420, height: 190 }}>
      <Node id="text" position={[0, 0]} align="start" padding={18} textColor="#64748b">
        Inherit Node style
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
          Text line override
        </Text>
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Text line-level property override playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
