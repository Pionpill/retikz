import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 数据模型页 "技术原理" 流程插图（英文）
 * @description lowering 前 Plot 收集引用字段 → 校验契约 → 确定类型 → 整理成字段元信息，供比例尺 / 坐标轴 / 图例 / 校验共用。
 */
const Demo: FC = () => (
  <Layout width={720} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="collect" position={[-265, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Collect fields</Text>
      <Text fill="gray" font={{ size: 12 }}>
        referenced fields
      </Text>
    </Node>
    <Node id="validate" position={[-95, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Validate</Text>
      <Text fill="gray" font={{ size: 12 }}>
        model refs · dedup
      </Text>
    </Node>
    <Node id="resolve" position={[85, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Resolve type</Text>
      <Text fill="gray" font={{ size: 12 }}>
        explicit / format / infer
      </Text>
    </Node>
    <Node id="meta" position={[255, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Field metadata</Text>
      <Text fill="gray" font={{ size: 12 }}>
        type + order
      </Text>
    </Node>

    <Draw way={['collect', 'validate']} arrow="->" />
    <Draw way={['validate', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'meta']} arrow="->" />

    <Node id="note" position={[255, 72]} stroke="none" align="center">
      <Text fill="gray" font={{ size: 12 }}>
        scales · axes · legends · validation
      </Text>
    </Node>
    <Draw way={['note', 'meta']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
