import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import { Step } from '@retikz/react';

import { createGraphPreviewSource } from '@/modules/docs/preview';

/** Relation 通过稳定 endpoint 与直接的 Core-compatible route 连接 Entity */
const Demo: FC = () => (
  <Graph width={620} height={220}>
    <Entity id="start" role="event" position={[80, 70]}>
      开始
    </Entity>
    <Entity id="process" role="activity" position={[300, 70]}>
      处理
    </Entity>
    <Entity id="store" role="resource" position={[520, 150]}>
      存储
    </Entity>
    <Relation
      id="start-process"
      role="flow"
      source={{ id: 'start' }}
      target={{ id: 'process' }}
      labels={[
        {
          text: '下一步',
          position: 0.5,
          textColor: '#c2410c',
          font: { weight: 'bold' },
          opacity: 0.8,
        },
      ]}
      way={['start', 'process']}
    />
    <Relation
      id="process-store"
      role="dependency"
      source={{ id: 'process' }}
      target={{ id: 'store' }}
      dashPattern={[6, 4]}
      labels={[{ text: '写入', position: 0.5 }]}
    >
      <Step kind="move" to="process" />
      <Step kind="fold" via={FoldStepVia.HorizontalThenVertical} to="store" />
    </Relation>
  </Graph>
);

export const previewSource = createGraphPreviewSource(() => Demo({}));

export default Demo;
