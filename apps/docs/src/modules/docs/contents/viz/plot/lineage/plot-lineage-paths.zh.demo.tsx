import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Plot 下沉元数据与运行时链路两条独立路径 */
const Demo: FC = () => (
  <Layout width={560} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="lower-options"
      position={[-185, -50]}
      minimumSize={{ width: 145, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>来源下沉</Text>
      <Text fill="gray" font={{ size: 12 }}>
        provenance · datum id
      </Text>
    </Node>
    <Node
      id="lower"
      position={[0, -50]}
      minimumSize={{ width: 140, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Core 下沉</Text>
      <Text fill="gray" font={{ size: 12 }}>
        生成图元
      </Text>
    </Node>
    <Node
      id="scene"
      position={[185, -50]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Scene 元数据</Text>
      <Text fill="gray" font={{ size: 12 }}>
        图元 id · meta
      </Text>
    </Node>

    <Node
      id="lineage-options"
      position={[-185, 50]}
      minimumSize={{ width: 145, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>运行时溯源</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lineage · host metadata
      </Text>
    </Node>
    <Node
      id="record"
      position={[0, 50]}
      minimumSize={{ width: 140, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>语义汇总</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Data · Plot
      </Text>
    </Node>
    <Node
      id="artifact"
      position={[185, 50]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        返回值 · 回调
      </Text>
    </Node>

    <Draw way={['lower-options', 'lower']} arrow="->" stroke="gray" />
    <Draw way={['lower', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['lineage-options', 'record']} arrow="->" stroke="gray" />
    <Draw way={['record', 'artifact']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
