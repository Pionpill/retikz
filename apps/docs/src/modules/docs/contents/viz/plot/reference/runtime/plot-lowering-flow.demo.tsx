import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 主 lowering 与 lineage、locator 独立运行路径的关系 */
const Demo: FC = () => (
  <Layout width={800} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inputs"
      position={[-320, -10]}
      minimumSize={{ width: 130, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>runtime inputs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        spec · datasets · options
      </Text>
    </Node>

    <LogicFigureFrame id="plot-lowering">
      <LogicFigureFrameTitle>@retikz/plot</LogicFigureFrameTitle>
      <Node
        id="prepare"
        position={[-150, -10]}
        minimumSize={{ width: 140, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>data preparation</Text>
        <Text fill="gray" font={{ size: 12 }}>
          registries · normalize
        </Text>
      </Node>
      <Node
        id="lower-semantics"
        position={[20, -10]}
        minimumSize={{ width: 150, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Plot lowering</Text>
        <Text fill="gray" font={{ size: 12 }}>
          transform · frame · marks
        </Text>
      </Node>
    </LogicFigureFrame>

    <LogicFigureFrame id="core-compile">
      <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
      <Node
        id="core-ir"
        position={[195, -10]}
        minimumSize={{ width: 112, height: 58 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Core IR</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Scope · Node · Path
        </Text>
      </Node>
      <Node
        id="scene"
        position={[335, -10]}
        minimumSize={{ width: 112, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Scene</Text>
        <Text fill="gray" font={{ size: 12 }}>
          compile output
        </Text>
      </Node>
    </LogicFigureFrame>

    <Node
      id="runtime-queries"
      position={[-320, 100]}
      minimumSize={{ width: 146, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>runtime-only queries</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lineage · locator
      </Text>
    </Node>
    <Node
      id="definitions"
      position={[-150, 100]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Definitions</Text>
      <Text fill="gray" font={{ size: 12 }}>
        built-in · custom
      </Text>
    </Node>

    <Draw way={['inputs', 'prepare']} arrow="->" stroke="gray" />
    <Draw way={['prepare', 'lower-semantics']} arrow="->" stroke="gray" />
    <Draw way={['lower-semantics', 'core-ir']} arrow="->" stroke="gray" />
    <Draw way={['core-ir', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['definitions', 'prepare']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['inputs', 'runtime-queries']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
