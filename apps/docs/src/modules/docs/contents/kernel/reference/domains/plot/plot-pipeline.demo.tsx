import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 从 Viz 数据处理到 Kernel Scene 的分组主链 */
const Demo: FC = () => (
  <Layout width={760} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="viz-group">
      <LogicFigureFrameTitle>Viz</LogicFigureFrameTitle>
      <Node
        id="data"
        text={['Data', { text: 'external datasets', fill: 'gray', font: { size: 10 } }]}
        position={[-305, -5]}
        minimumSize={{ width: 90, height: 46 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
      <Node
        id="plot"
        text={[
          { text: 'Plot', font: { weight: 'bold' } },
          { text: 'visual grammar', fill: 'gray', font: { size: 10 } },
        ]}
        position={[-205, -5]}
        minimumSize={{ width: 90, height: 46 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
      <Node
        id="pipeline"
        text={['Pipeline', { text: 'prepare · resolve · lower', fill: 'gray', font: { size: 10 } }]}
        position={[-80, -5]}
        minimumSize={{ width: 150, height: 46 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
    </LogicFigureFrame>
    <LogicFigureFrame id="kernel-group">
      <LogicFigureFrameTitle>Kernel</LogicFigureFrameTitle>
      <Node
        id="core"
        text={['Core', { text: 'graphical primitives', fill: 'gray', font: { size: 10 } }]}
        position={[75, -5]}
        minimumSize={{ width: 110, height: 46 }}
        stroke="darkviolet"
        fill="darkviolet"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
      <Node
        id="compile"
        text={['Compile', { text: 'assemble Scene', fill: 'gray', font: { size: 10 } }]}
        position={[195, -5]}
        minimumSize={{ width: 110, height: 46 }}
        stroke="darkviolet"
        fill="darkviolet"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
      <Node
        id="scene"
        text={['Scene', { text: 'renderer input', fill: 'gray', font: { size: 10 } }]}
        position={[305, -5]}
        minimumSize={{ width: 90, height: 46 }}
        stroke="darkviolet"
        fill="darkviolet"
        fillOpacity={0.06}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={14}
      />
    </LogicFigureFrame>

    <Node
      id="definition"
      text={['Definition', { text: 'built-in · custom', fill: 'gray', font: { size: 10 } }]}
      position={[-205, 70]}
      minimumSize={{ width: 120, height: 44 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={14}
    />

    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['plot', 'pipeline']} arrow="->" stroke="gray" />
    <Draw way={['pipeline', 'core']} arrow="->" stroke="gray" />
    <Draw way={['core', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['definition', 'plot']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
