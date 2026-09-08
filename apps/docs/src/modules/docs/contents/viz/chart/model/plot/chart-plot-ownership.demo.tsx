import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Chart 外壳与 Plot 绘图语法保持相邻但独立的 owner 边界 */
const Demo: FC = () => (
  <Layout
    width={460}
    height={200}
    viewBox={{ x: -205, y: -100, width: 410, height: 200 }}
    fontSize={13}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <LogicFigureFrame id="chart-owner">
      <LogicFigureFrameTitle>Chart owner</LogicFigureFrameTitle>
      <Node
        id="chart-type"
        position={[-110, -50]}
        cornerRadius={4}
        style={{ stroke: 'seagreen', fill: 'seagreen', fillOpacity: 0.08 }}
      >
        family + chart
      </Node>
      <Node
        id="chart-presentation"
        position={[-110, 0]}
        cornerRadius={4}
        style={{ stroke: 'seagreen', fill: 'seagreen', fillOpacity: 0.08 }}
      >
        presentation
      </Node>
      <Node
        id="chart-canvas"
        position={[-110, 50]}
        cornerRadius={4}
        style={{ stroke: 'seagreen', fill: 'seagreen', fillOpacity: 0.08 }}
      >
        layout + Chart Theme
      </Node>
    </LogicFigureFrame>
    <LogicFigureFrame id="plot-owner">
      <LogicFigureFrameTitle>Plot owner</LogicFigureFrameTitle>
      <Node
        id="plot-data"
        position={[110, -50]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      >
        data + transform
      </Node>
      <Node
        id="plot-grammar"
        position={[110, 0]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      >
        scales + coordinates
      </Node>
      <Node
        id="plot-content"
        position={[110, 50]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      >
        marks + guides
      </Node>
    </LogicFigureFrame>
  </Layout>
);

export default Demo;
