import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Plot 下沉元数据与运行时链路两条独立路径 */
const Demo: FC = () => (
  <Layout width={720} height={290} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="lower-options"
      position={[-260, -65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>下沉来源选项</Text>
      <Text fill="gray" font={{ size: 12 }}>
        provenance · datumIdField
      </Text>
    </Node>
    <Node
      id="lower"
      position={[0, -65]}
      minimumSize={{ width: 170, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>正常下沉</Text>
      <Text fill="gray" font={{ size: 12 }}>
        生成 Core 图元
      </Text>
    </Node>
    <Node
      id="scene"
      position={[260, -65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>图元 id / meta</Text>
      <Text fill="gray" font={{ size: 12 }}>
        参与 Scene 与 locator
      </Text>
    </Node>

    <Node
      id="lineage-options"
      position={[-260, 65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>链路记录选项</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lineage · host metadata
      </Text>
    </Node>
    <Node
      id="record"
      position={[0, 65]}
      minimumSize={{ width: 170, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>运行时记录</Text>
      <Text fill="gray" font={{ size: 12 }}>
        汇总 Data 与 Plot 语义
      </Text>
    </Node>
    <Node
      id="artifact"
      position={[260, 65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        只通过返回值或回调暴露
      </Text>
    </Node>

    <Draw way={['lower-options', 'lower']} arrow="->" stroke="gray" />
    <Draw way={['lower', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['lineage-options', 'record']} arrow="->" stroke="gray" />
    <Draw way={['record', 'artifact']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
