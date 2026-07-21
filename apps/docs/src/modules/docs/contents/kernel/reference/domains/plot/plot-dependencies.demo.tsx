import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Plot 从宿主 API 经数据处理到 Core IR 的横向主链 */
const Demo: FC = () => (
  <Layout width={760} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="api-group"
      text=" "
      position={[-285, 0]}
      minimumSize={{ width: 180, height: 130 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="API Layer"
      position={[-338, -50]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />
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
    <Node
      id="plot-group"
      text=" "
      position={[105, 0]}
      minimumSize={{ width: 270, height: 100 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="@retikz/plot"
      position={[18, -37]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />
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
