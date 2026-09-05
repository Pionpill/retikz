import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Plot 下沉元数据与运行时链路两条独立路径 */
const Demo: FC = () => (
  <Layout width={560} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="lower-options"
      position={[-185, -50]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 145, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>来源下沉</Text>
      <Text fill="gray" font={{ size: 12 }}>
        provenance · datum id
      </Text>
    </Node>
    <Node
      id="lower"
      position={[0, -50]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 140, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Core 下沉</Text>
      <Text fill="gray" font={{ size: 12 }}>
        生成图元
      </Text>
    </Node>
    <Node
      id="scene"
      position={[185, -50]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ minimumSize: { width: 150, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Scene 元数据</Text>
      <Text fill="gray" font={{ size: 12 }}>
        图元 id · meta
      </Text>
    </Node>

    <Node
      id="lineage-options"
      position={[-185, 50]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 145, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>运行时溯源</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lineage · host metadata
      </Text>
    </Node>
    <Node
      id="record"
      position={[0, 50]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 140, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>语义汇总</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Data · Plot
      </Text>
    </Node>
    <Node
      id="artifact"
      position={[185, 50]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.07 }}
      layout={{ minimumSize: { width: 150, height: 64 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        返回值 · 回调
      </Text>
    </Node>

    <Draw way={['lower-options', 'lower']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['lower', 'scene']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['lineage-options', 'record']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['record', 'artifact']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
