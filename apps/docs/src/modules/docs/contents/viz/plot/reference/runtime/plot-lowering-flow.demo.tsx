import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Plot 主 lowering 与 lineage、locator 独立运行路径的关系 */
const Demo: FC = () => (
  <Layout width={520} height={500} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inputs"
      position={[0, -185]}
      minimumSize={{ width: 138, height: 58 }}
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

    <LogicFrame id="plot-lowering">
      <LogicFrameTitle>@retikz/plot</LogicFrameTitle>
      <Node
        id="prepare"
        position={[0, -100]}
        minimumSize={{ width: 148, height: 58 }}
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
        position={[0, -15]}
        minimumSize={{ width: 164, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Plot lowering</Text>
        <Text fill="gray" font={{ size: 12 }}>
          transform · frame · channel · mark
        </Text>
      </Node>
      <Node
        id="lineage"
        position={[185, -60]}
        minimumSize={{ width: 138, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>lineage</Text>
        <Text fill="gray" font={{ size: 12 }}>
          independent recompute
        </Text>
      </Node>
      <Node
        id="definitions"
        position={[-170, -100]}
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
      <Node
        id="locator"
        position={[185, 20]}
        minimumSize={{ width: 138, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>locator</Text>
        <Text fill="gray" font={{ size: 12 }}>
          independent recompute
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="core-compile">
      <LogicFrameTitle>@retikz/core</LogicFrameTitle>
      <Node
        id="core-ir"
        position={[0, 140]}
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
        position={[0, 225]}
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
          compileToScene output
        </Text>
      </Node>
    </LogicFrame>

    <Draw way={['inputs', 'prepare']} arrow="->" stroke="gray" />
    <Draw way={['prepare', 'lower-semantics']} arrow="->" stroke="gray" />
    <Draw way={['lower-semantics', 'core-ir']} arrow="->" stroke="gray" />
    <Draw way={['core-ir', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['definitions', 'prepare']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={['inputs', [105, -150], [105, -60], { id: 'lineage', anchor: 'left' }]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={['inputs', [105, -150], [105, 20], { id: 'locator', anchor: 'left' }]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
  </Layout>
);

export default Demo;
