import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

type FlowNode = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width: number;
  height?: number;
  lineHeight?: number;
  color: 'darkorange' | 'dodgerblue' | 'darkviolet';
};

const desktopNodes: Array<FlowNode> = [
  {
    id: 'reference-input',
    position: [-330, 0],
    title: 'Reference 输入',
    detail: 'x / y · 上界 · kind',
    width: 150,
    color: 'darkorange',
  },
  {
    id: 'reference-classify',
    position: [-145, 0],
    title: '校验并分类',
    detail: '形态 · 常量一份 / 字段逐行',
    width: 180,
    color: 'dodgerblue',
  },
  {
    id: 'reference-line-steps',
    position: [55, -65],
    title: 'Line steps',
    detail: 'referenceLineSteps',
    width: 150,
    color: 'darkviolet',
  },
  {
    id: 'reference-cell',
    position: [25, 65],
    title: '逻辑 Cell',
    detail: 'role → [lo, hi]',
    width: 140,
    color: 'dodgerblue',
  },
  {
    id: 'reference-project',
    position: [205, 65],
    title: '坐标投影',
    detail: 'frame.projectCell',
    width: 150,
    color: 'darkviolet',
  },
];

const mobileNodes: Array<FlowNode> = [
  {
    id: 'mobile-reference-input',
    position: [0, -52],
    title: 'Reference 输入',
    detail: 'x / y · 上界 · kind',
    width: 240,
    height: 40,
    lineHeight: 14,
    color: 'darkorange',
  },
  {
    id: 'mobile-reference-classify',
    position: [0, 0],
    title: '校验并分类',
    detail: '形态 · 一份 / 逐行',
    width: 240,
    height: 40,
    lineHeight: 14,
    color: 'dodgerblue',
  },
  {
    id: 'mobile-reference-line',
    position: [-83, 52],
    title: 'Line',
    detail: 'steps → Core Path',
    width: 150,
    height: 40,
    lineHeight: 14,
    color: 'darkviolet',
  },
  {
    id: 'mobile-reference-cell',
    position: [83, 52],
    title: 'Band / Region',
    detail: 'Cell → Core Node',
    width: 150,
    height: 40,
    lineHeight: 14,
    color: 'dodgerblue',
  },
];

/** 以统一双行样式渲染一个流程角色 */
const renderFlowNode = (node: FlowNode) => (
  <Node
    key={node.id}
    id={node.id}
    position={node.position}
    minimumSize={{ width: node.width, height: node.height ?? 50 }}
    stroke={node.color}
    fill={node.color}
    fillOpacity={0.08}
    cornerRadius={4}
    align="middle"
    lineHeight={node.lineHeight ?? 16}
  >
    <Text font={{ size: 14, weight: 'bold' }}>{node.title}</Text>
    <Text fill="gray" font={{ size: 12 }}>
      {node.detail}
    </Text>
  </Node>
);

/** ReferenceMark 从输入分类到 Core primitive 的下沉分支 */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={860} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
        {desktopNodes.map(renderFlowNode)}
        <LogicFrame id="reference-core-primitives">
          <LogicFrameTitle>Core primitives</LogicFrameTitle>
          <Node
            id="reference-core-path"
            position={[370, -65]}
            minimumSize={{ width: 130, height: 42 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.06}
            cornerRadius={4}
            align="middle"
          >
            Core Path
          </Node>
          <Node
            id="reference-core-node"
            position={[370, 65]}
            minimumSize={{ width: 130, height: 42 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.06}
            cornerRadius={4}
            align="middle"
          >
            Core Node
          </Node>
        </LogicFrame>
        <Draw way={['reference-input', 'reference-classify']} arrow="->" />
        <Draw way={['reference-classify', 'reference-line-steps']} arrow="->" />
        <Draw way={['reference-classify', 'reference-cell']} arrow="->" />
        <Draw way={['reference-line-steps', 'reference-core-path']} arrow="->" />
        <Draw way={['reference-cell', 'reference-project']} arrow="->" />
        <Draw way={['reference-project', 'reference-core-node']} arrow="->" />
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={154} style={{ maxWidth: '100%', height: 'auto' }}>
        {mobileNodes.map(renderFlowNode)}
        <Draw way={['mobile-reference-input', 'mobile-reference-classify']} arrow="->" />
        <Draw way={['mobile-reference-classify', 'mobile-reference-line']} arrow="->" />
        <Draw way={['mobile-reference-classify', 'mobile-reference-cell']} arrow="->" />
      </Layout>
    </div>
  </>
);

export default Demo;
