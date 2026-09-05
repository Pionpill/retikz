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
        style={{ fill: values.background, stroke: 'none' }}
        layout={{ minimumSize: { width: 220, height: 160 } }}
      />
      <Node
        position={[-26, 0]}
        shape="circle"
        style={{ fill: values.sourceA, stroke: 'none' }}
        layout={{ minimumSize: 100 }}
      />
      <Node
        position={[26, 0]}
        shape="circle"
        style={{ fill: values.sourceB, stroke: 'none', blendMode, opacity: values.opacity }}
        layout={{ minimumSize: 100 }}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 固定重叠结构，让面板探索全部 blendMode 与输入颜色 */
const Demo: FC = controlledPreview.Component;

export default Demo;
