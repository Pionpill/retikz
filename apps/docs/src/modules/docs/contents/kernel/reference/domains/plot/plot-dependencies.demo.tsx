import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 从宿主 API 经数据处理到 Core IR 的横向主链 */
const Demo: FC = () => (
  <Layout width={760} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="api-group">
      <LogicFrameTitle>API Layer</LogicFrameTitle>
      <Node
        id="plot-react"
        position={[-285, -20]}
        minimumSize={{ width: 150, height: 34 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        @retikz/plot-react
      </Node>
      <Node
        id="plot-vanilla"
        position={[-285, 30]}
        minimumSize={{ width: 150, height: 34 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        @retikz/plot-vanilla
      </Node>
    </LogicFrame>

    <Node
      id="data"
      text={['@retikz/data', { text: 'data processing', fill: 'gray', font: { size: 10 } }]}
      position={[-105, 5]}
      minimumSize={{ width: 125, height: 42 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={14}
    />
    <LogicFrame id="plot-group">
      <LogicFrameTitle>@retikz/plot</LogicFrameTitle>
      <Node
        id="plot"
        text={[
          { text: 'Plot', font: { weight: 'bold' } },
          { text: 'visual grammar', fill: 'gray', font: { size: 10 } },
        ]}
        position={[35, 8]}
        minimumSize={{ width: 110, height: 42 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
      <Node
        id="pipeline"
        text={['Pipeline', { text: 'lower Plot IR', fill: 'gray', font: { size: 10 } }]}
        position={[175, 8]}
        minimumSize={{ width: 120, height: 42 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
    </LogicFrame>
    <Node
      id="core"
      text={['@retikz/core', { text: 'Core IR', fill: 'gray', font: { size: 10 } }]}
      position={[310, 5]}
      minimumSize={{ width: 120, height: 42 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={14}
    />

    <Draw way={['plot-react', 'data']} arrow="->" stroke="gray" />
    <Draw way={['plot-vanilla', 'data']} arrow="->" stroke="gray" />
    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['plot', 'pipeline']} arrow="->" stroke="gray" />
    <Draw way={['pipeline', 'core']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
