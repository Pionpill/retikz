import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

type FlowNode = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width: number;
  height?: number;
  lineHeight?: number;
  color: 'darkorange' | 'dodgerblue' | 'darkviolet' | 'gray';
};

const desktopNodes: Array<FlowNode> = [
  {
    id: 'relation-rows',
    position: [-340, 0],
    title: 'Relation rows',
    detail: 'existing edges or host data',
    width: 140,
    color: 'darkorange',
  },
  {
    id: 'relation-transform',
    position: [-180, 0],
    title: 'Local transform',
    detail: 'derive rows when needed',
    width: 140,
    color: 'darkorange',
  },
  {
    id: 'relation-targets',
    position: [-15, 0],
    title: 'Resolve both targets',
    detail: 'id · anchorId · project',
    width: 150,
    color: 'dodgerblue',
  },
  {
    id: 'relation-route',
    position: [170, -55],
    title: 'Build path steps',
    detail: 'route · routing · via',
    width: 150,
    color: 'darkviolet',
  },
  {
    id: 'relation-ribbon',
    position: [170, 55],
    title: 'Build ribbon',
    detail: 'width · endWidth',
    width: 150,
    color: 'darkviolet',
  },
  {
    id: 'relation-core-path',
    position: [350, 0],
    title: 'Core Path',
    detail: 'path or ribbon kind',
    width: 140,
    color: 'gray',
  },
];

const mobileNodes: Array<FlowNode> = [
  {
    id: 'mobile-relation-rows',
    position: [0, -100],
    title: 'Relation rows',
    detail: 'local transform may derive them',
    width: 230,
    height: 36,
    lineHeight: 14,
    color: 'darkorange',
  },
  {
    id: 'mobile-relation-targets',
    position: [0, -40],
    title: 'Resolve both targets',
    detail: 'id · anchorId · project',
    width: 230,
    height: 36,
    lineHeight: 14,
    color: 'dodgerblue',
  },
  {
    id: 'mobile-relation-route',
    position: [-78, 25],
    title: 'Path steps',
    detail: 'route · routing · via',
    width: 135,
    height: 36,
    lineHeight: 14,
    color: 'darkviolet',
  },
  {
    id: 'mobile-relation-ribbon',
    position: [78, 25],
    title: 'Ribbon',
    detail: 'width · endWidth',
    width: 135,
    height: 36,
    lineHeight: 14,
    color: 'darkviolet',
  },
  {
    id: 'mobile-relation-core-path',
    position: [0, 90],
    title: 'Core Path',
    detail: 'shared lowering output',
    width: 230,
    height: 36,
    lineHeight: 14,
    color: 'gray',
  },
];

/** 以统一双行样式渲染一个 RelationMark 下沉角色 */
const renderFlowNode = (node: FlowNode) => (
  <Node
    key={node.id}
    id={node.id}
    position={node.position}
    minimumSize={{ width: node.width, height: node.height ?? 44 }}
    stroke={node.color}
    fill={node.color}
    fillOpacity={0.08}
    cornerRadius={4}
    align="middle"
    lineHeight={node.lineHeight ?? 15}
  >
    <Text font={{ size: 14, weight: 'bold' }}>{node.title}</Text>
    <Text fill="gray" font={{ size: 12 }}>
      {node.detail}
    </Text>
  </Node>
);

/** RelationMark 从数据行到 Core Path 的下沉主链 */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={860} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
        {desktopNodes.map(renderFlowNode)}
        <Draw way={['relation-rows', 'relation-transform']} arrow="->" />
        <Draw way={['relation-transform', 'relation-targets']} arrow="->" />
        <Draw way={['relation-targets', 'relation-route']} arrow="->" />
        <Draw way={['relation-targets', 'relation-ribbon']} arrow="->" />
        <Draw way={['relation-route', 'relation-core-path']} arrow="->" />
        <Draw way={['relation-ribbon', 'relation-core-path']} arrow="->" />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
        {mobileNodes.map(renderFlowNode)}
        <Draw way={['mobile-relation-rows', 'mobile-relation-targets']} arrow="->" />
        <Draw way={['mobile-relation-targets', 'mobile-relation-route']} arrow="->" />
        <Draw way={['mobile-relation-targets', 'mobile-relation-ribbon']} arrow="->" />
        <Draw way={['mobile-relation-route', 'mobile-relation-core-path']} arrow="->" />
        <Draw way={['mobile-relation-ribbon', 'mobile-relation-core-path']} arrow="->" />
      </Layout>
    </div>
  </>
);

export default Demo;
