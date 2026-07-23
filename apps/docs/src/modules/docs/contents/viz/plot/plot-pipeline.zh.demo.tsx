import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 从 authoring 到 renderer 的主流程与运行时旁路 */
const Demo: FC = () => (
  <Layout width={740} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="authoring"
      position={[-350, -12]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>声明入口</Text>
      <Text fill="gray" font={{ size: 12 }}>
        React · Vanilla · spec
      </Text>
    </Node>
    <LogicFrame id="plot-group">
      <LogicFrameTitle>@retikz/plot</LogicFrameTitle>
      <Node
        id="plot-ir"
        position={[-200, -12]}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Plot IR</Text>
        <Text fill="gray" font={{ size: 12 }}>
          JSON 图表语义
        </Text>
      </Node>
      <Node
        id="lower"
        position={[-64, -12]}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>lowerPlots</Text>
        <Text fill="gray" font={{ size: 12 }}>
          变换 · 映射 · 下沉
        </Text>
      </Node>
    </LogicFrame>
    <Node
      id="core-ir"
      position={[72, -12]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Core IR</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Scope · Node · Path
      </Text>
    </Node>
    <Node
      id="scene"
      position={[202, -12]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Scene</Text>
      <Text fill="gray" font={{ size: 12 }}>
        compileToScene
      </Text>
    </Node>
    <Node
      id="renderers"
      position={[322, -12]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>渲染器</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SVG · Canvas
      </Text>
    </Node>

    <Node
      id="datasets"
      position={[-64, 78]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      外部数据集
    </Node>
    <Node
      id="runtime-info"
      position={[90, 78]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      lineage · locator · diagnostics
    </Node>

    <Draw way={['authoring', 'plot-ir']} arrow="->" />
    <Draw way={['plot-ir', 'lower']} arrow="->" />
    <Draw way={['lower', 'core-ir']} arrow="->" />
    <Draw way={['core-ir', 'scene']} arrow="->" />
    <Draw way={['scene', 'renderers']} arrow="->" />
    <Draw way={['datasets', 'lower']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['lower', 'runtime-info']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
