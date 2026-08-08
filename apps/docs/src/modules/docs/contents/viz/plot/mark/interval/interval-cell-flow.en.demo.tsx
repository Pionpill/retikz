import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

type FlowNode = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  width: number;
  color: 'darkorange' | 'dodgerblue' | 'darkviolet' | 'gray';
};

const desktopNodes: Array<FlowNode> = [
  {
    id: 'desktop-input',
    position: [-300, 0],
    title: 'Interval input',
    detail: 'shortcuts · bounds',
    width: 150,
    color: 'darkorange',
  },
  {
    id: 'desktop-normalize',
    position: [-125, 0],
    title: 'Normalize bounds',
    detail: 'band · span · extent · …',
    width: 150,
    color: 'dodgerblue',
  },
  {
    id: 'desktop-cell',
    position: [40, 0],
    title: 'Logical Cell',
    detail: 'role → [lo, hi]',
    width: 130,
    color: 'dodgerblue',
  },
  {
    id: 'desktop-project',
    position: [200, 0],
    title: 'Coordinate projection',
    detail: 'frame.projectCell',
    width: 140,
    color: 'darkviolet',
  },
];

const mobileNodes: Array<FlowNode> = [
  {
    id: 'mobile-input',
    position: [0, -50],
    title: 'Interval input',
    detail: 'shortcuts · bounds',
    width: 230,
    color: 'darkorange',
  },
  {
    id: 'mobile-cell',
    position: [0, 0],
    title: 'Role-interval Cell',
    detail: 'bounds → role [lo, hi]',
    width: 230,
    color: 'dodgerblue',
  },
  {
    id: 'mobile-project',
    position: [0, 50],
    title: 'Project and lower',
    detail: 'projectCell → Core Node',
    width: 230,
    color: 'darkviolet',
  },
];

/** Main IntervalMark lowering path from interval input to the Core Node layer */
const Demo: FC = () => (
  <>
    <div className="hidden sm:block">
      <Layout width={860} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
        {desktopNodes.map(node => (
          <Node
            key={node.id}
            id={node.id}
            position={node.position}
            minimumSize={{ width: node.width, height: 50 }}
            stroke={node.color}
            fill={node.color}
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{node.title}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {node.detail}
            </Text>
          </Node>
        ))}
        {desktopNodes.slice(0, -1).map((node, index) => (
          <Draw key={node.id} way={[node.id, desktopNodes[index + 1].id]} arrow="->" />
        ))}
        <LogicFigureFrame id="desktop-node-layer">
          <LogicFigureFrameTitle>Core Node layer</LogicFigureFrameTitle>
          {['rect', 'sector', 'contour'].map((kind, index) => (
            <Node
              key={kind}
              id={`desktop-${kind}`}
              position={[350, -60 + index * 60]}
              minimumSize={{ width: 130, height: 40 }}
              stroke="gray"
              fill="gray"
              fillOpacity={0.06}
              cornerRadius={4}
              align="middle"
            >
              {kind}
            </Node>
          ))}
        </LogicFigureFrame>
        {['rect', 'sector', 'contour'].map(kind => (
          <Draw key={kind} way={['desktop-project', `desktop-${kind}`]} arrow="->" />
        ))}
      </Layout>
    </div>

    <div className="sm:hidden">
      <Layout width={360} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
        {mobileNodes.map(node => (
          <Node
            key={node.id}
            id={node.id}
            position={node.position}
            minimumSize={{ width: node.width, height: 32 }}
            stroke={node.color}
            fill={node.color}
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={13}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{node.title}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {node.detail}
            </Text>
          </Node>
        ))}
        {mobileNodes.slice(0, -1).map((node, index) => (
          <Draw key={node.id} way={[node.id, mobileNodes[index + 1].id]} arrow="->" />
        ))}
      </Layout>
    </div>
  </>
);

export default Demo;
