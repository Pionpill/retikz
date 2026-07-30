import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Plot 在 Data 链路上补充图形语义的运行时流程 */
const Demo: FC = () => (
  <Layout width={600} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-230, 0]}
      minimumSize={{ width: 116, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data 来源</Text>
      <Text fill="gray" font={{ size: 12 }}>
        来源 · transform
      </Text>
    </Node>
    <Node
      id="plot"
      position={[-70, 0]}
      minimumSize={{ width: 160, height: 76 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot 语义</Text>
      <Text fill="gray" font={{ size: 12 }}>
        图元 · 编码 · 比例尺
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        布局 · 宿主元数据
      </Text>
    </Node>
    <Node
      id="run"
      position={[100, 0]}
      minimumSize={{ width: 145, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        运行时产物
      </Text>
    </Node>
    <Node
      id="tools"
      position={[240, 0]}
      minimumSize={{ width: 92, height: 64 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>宿主工具</Text>
      <Text fill="gray" font={{ size: 12 }}>
        审计 · 定位
      </Text>
    </Node>

    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['plot', 'run']} arrow="->" stroke="gray" />
    <Draw way={['run', 'tools']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
