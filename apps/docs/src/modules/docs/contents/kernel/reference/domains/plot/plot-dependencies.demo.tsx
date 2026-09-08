import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 从宿主 API 经数据处理到 Core IR 的横向主链 */
const Demo: FC = () => (
  <Layout>
    <LogicFigureFrame id="api-group">
      <LogicFigureFrameTitle>API Layer</LogicFigureFrameTitle>
      <Node
        id="plot-react"
        position={[-285, -20]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 34 } }}
      >
        @retikz/plot-react
      </Node>
      <Node
        id="plot-vanilla"
        position={[-285, 30]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 34 } }}
      >
        @retikz/plot-vanilla
      </Node>
    </LogicFigureFrame>

    <Node
      id="data"
      text={['@retikz/data', { text: 'data processing', fill: 'gray', font: { size: 10 } }]}
      position={[-105, 5]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.06, font: { size: 13 } }}
      layout={{ minimumSize: { width: 125, height: 42 }, lineHeight: 14 }}
    />
    <LogicFigureFrame id="plot-group">
      <LogicFigureFrameTitle>@retikz/plot</LogicFigureFrameTitle>
      <Node
        id="plot"
        text={[
          { text: 'Plot', font: { weight: 'bold' } },
          { text: 'visual grammar', fill: 'gray', font: { size: 10 } },
        ]}
        position={[35, 8]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 110, height: 42 }, lineHeight: 14 }}
      />
      <Node
        id="pipeline"
        text={['Pipeline', { text: 'lower Plot IR', fill: 'gray', font: { size: 10 } }]}
        position={[175, 8]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 120, height: 42 }, lineHeight: 14 }}
      />
    </LogicFigureFrame>
    <Node
      id="core"
      text={['@retikz/core', { text: 'Core IR', fill: 'gray', font: { size: 10 } }]}
      position={[310, 5]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.06, font: { size: 13 } }}
      layout={{ minimumSize: { width: 120, height: 42 }, lineHeight: 14 }}
    />

    <Draw way={['plot-react', 'data']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['plot-vanilla', 'data']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['data', 'plot']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['plot', 'pipeline']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['pipeline', 'core']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
