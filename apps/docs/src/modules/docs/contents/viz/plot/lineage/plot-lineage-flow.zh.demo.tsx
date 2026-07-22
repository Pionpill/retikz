import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Plot 在 Data 链路上补充图形语义的运行时流程 */
const Demo: FC = () => (
  <Layout width={720} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-270, 0]}
      minimumSize={{ width: 146, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data 链路</Text>
      <Text fill="gray" font={{ size: 12 }}>
        来源 · transform
      </Text>
    </Node>
    <Node
      id="plot"
      position={[-55, 0]}
      minimumSize={{ width: 180, height: 76 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot 语义补全</Text>
      <Text fill="gray" font={{ size: 12 }}>
        图元 · 编码 · 比例尺
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        布局 · 宿主元数据
      </Text>
    </Node>
    <Node
      id="run"
      position={[165, 0]}
      minimumSize={{ width: 150, height: 64 }}
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
      position={[320, 0]}
      minimumSize={{ width: 105, height: 64 }}
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

    <Node position={[15, 78]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      Plot 读取 Data 来源，但图元、比例尺和布局语义由 Plot 自己拥有
    </Node>
  </Layout>
);

export default Demo;
