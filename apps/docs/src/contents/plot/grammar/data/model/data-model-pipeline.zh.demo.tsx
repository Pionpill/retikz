import { Draw, Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * 数据模型页 "技术原理" 流程插图
 * @description lowering 前 Plot 收集引用字段 → 校验契约 → 确定类型 → 整理成字段元信息，供比例尺 / 坐标轴 / 图例 / 校验共用。
 */
const Demo: FC = () => (
  <Layout width={700} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="collect" position={[-255, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>收集字段</Text>
      <Text fill="gray" font={{ size: 12 }}>
        引用的逻辑字段
      </Text>
    </Node>
    <Node id="validate" position={[-95, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>校验契约</Text>
      <Text fill="gray" font={{ size: 12 }}>
        model 引用 · 去重
      </Text>
    </Node>
    <Node id="resolve" position={[80, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>确定类型</Text>
      <Text fill="gray" font={{ size: 12 }}>
        显式 / format / 推断
      </Text>
    </Node>
    <Node id="meta" position={[235, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>字段元信息</Text>
      <Text fill="gray" font={{ size: 12 }}>
        类型 + 分类顺序
      </Text>
    </Node>

    <Draw way={['collect', 'validate']} arrow="->" />
    <Draw way={['validate', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'meta']} arrow="->" />

    <Node id="note" position={[235, 72]} stroke="none" align="center">
      <Text fill="gray" font={{ size: 12 }}>
        比例尺 · 坐标轴 · 图例 · 校验
      </Text>
    </Node>
    <Draw way={['note', 'meta']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
