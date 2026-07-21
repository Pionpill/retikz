import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { blendPlaygroundControls, previewControlContract } from './blend-playground.controls';

export const previewControls = blendPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const blendMode = values.mode;

  return (
    <Layout width={260} height={200}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        fill={values.background}
        minimumSize={{ width: 220, height: 160 }}
        stroke="none"
      />
      <Node position={[-26, 0]} shape="circle" fill={values.sourceA} minimumSize={100} stroke="none" />
      <Node
        position={[26, 0]}
        shape="circle"
        fill={values.sourceB}
        minimumSize={100}
        stroke="none"
        blendMode={blendMode}
        opacity={values.opacity}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 固定重叠结构，让面板探索全部 blendMode 与输入颜色 */
const Demo: FC = controlledPreview.Component;

export default Demo;
