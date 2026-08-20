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
        stroke="seagreen"
        fill="seagreen"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        type + config
      </Node>
      <Node
        id="chart-presentation"
        position={[-110, 0]}
        stroke="seagreen"
        fill="seagreen"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        presentation
      </Node>
      <Node
        id="chart-canvas"
        position={[-110, 50]}
        stroke="seagreen"
        fill="seagreen"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        canvas + theme
      </Node>
    </LogicFigureFrame>
    <LogicFigureFrame id="plot-owner">
      <LogicFigureFrameTitle>Plot owner</LogicFigureFrameTitle>
      <Node
        id="plot-data"
        position={[110, -50]}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        data + transform
      </Node>
      <Node
        id="plot-grammar"
        position={[110, 0]}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        scales + coordinates
      </Node>
      <Node
        id="plot-content"
        position={[110, 50]}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
      >
        marks + guides
      </Node>
    </LogicFigureFrame>
  </Layout>
);

export default Demo;
