import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** 同一条 Program DAG 依赖边按上游 outcome 选择下游执行或复用 */
const Demo: FC = () => (
  <Layout width={520} height={330} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="upstream-outcomes">
      <LogicFrameTitle>Upstream outcome</LogicFrameTitle>
      <Node
        id="incremental"
        position={[-130, -105]}
        minimumSize={{ width: 154, height: 38 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        incremental
      </Node>
      <Node
        id="bailout"
        position={[-130, -35]}
        minimumSize={{ width: 154, height: 38 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        bailout
      </Node>
      <Node
        id="fallback"
        position={[-130, 35]}
        minimumSize={{ width: 154, height: 38 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        fallback / full
      </Node>
      <Node
        id="unrelated"
        position={[-130, 105]}
        minimumSize={{ width: 154, height: 38 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        no dependency change
      </Node>
    </LogicFrame>

    <LogicFrame id="dependent-actions">
      <LogicFrameTitle>Dependent branch</LogicFrameTitle>
      <Node
        id="update"
        position={[130, -105]}
        minimumSize={{ width: 170, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        downstream.update()
      </Node>
      <Node
        id="reuse-after-bailout"
        position={[130, -35]}
        minimumSize={{ width: 170, height: 38 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        reuse current artifact
      </Node>
      <Node
        id="run"
        position={[130, 35]}
        minimumSize={{ width: 170, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        downstream.run()
      </Node>
      <Node
        id="reuse-unrelated"
        position={[130, 105]}
        minimumSize={{ width: 170, height: 38 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        reuse current artifact
      </Node>
    </LogicFrame>

    <Draw
      way={[
        'incremental',
        {
          label: {
            text: 'may continue',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'update',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'bailout',
        {
          label: {
            text: 'stop invalidation',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'reuse-after-bailout',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'fallback',
        {
          label: {
            text: 'force full',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'run',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'unrelated',
        {
          label: {
            text: 'skip branch',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'reuse-unrelated',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
  </Layout>
);

export default Demo;
