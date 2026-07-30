import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Data 来源产物进入不同宿主的消费边界 */
const Demo: FC = () => (
  <Layout width={700} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-225, 0]}
      minimumSize={{ width: 190, height: 82 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data 输出边界</Text>
      <Text fill="gray" font={{ size: 12 }}>
        canonical 行
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        来源元数据 · 链路事件
      </Text>
    </Node>
    <Node
      id="plot"
      position={[115, -82]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot</Text>
      <Text fill="gray" font={{ size: 12 }}>
        图元链路（示例宿主）
      </Text>
    </Node>
    <Node
      id="table"
      position={[115, 0]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Table</Text>
      <Text fill="gray" font={{ size: 12 }}>
        汇总行来源与回溯入口
      </Text>
    </Node>
    <Node
      id="other"
      position={[115, 82]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>其它宿主</Text>
      <Text fill="gray" font={{ size: 12 }}>
        按自身契约消费来源
      </Text>
    </Node>

    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['data', 'table']} arrow="->" stroke="gray" />
    <Draw way={['data', 'other']} arrow="->" stroke="gray" />

    <Node position={[284, 0]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      展示与交互语义归宿主所有
    </Node>
  </Layout>
);

export default Demo;
