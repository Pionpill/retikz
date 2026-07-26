import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

type FlowNodeProps = {
  id: string;
  position: [number, number];
  title: string;
  detail: string;
  stroke: string;
};

/** 绘制统一的双行流程节点 */
const FlowNode: FC<FlowNodeProps> = ({ id, position, title, detail, stroke }) => (
  <Node
    id={id}
    position={position}
    text={[
      { text: title, font: { size: 14, weight: 'bold' } },
      { text: detail, fill: 'gray', font: { size: 13 } },
    ]}
    stroke={stroke}
    fill={stroke}
    fillOpacity={0.08}
    cornerRadius={4}
    minimumSize={{ width: 160, height: 52 }}
    padding={{ x: 8, y: 6 }}
    lineHeight={17}
  />
);

/** Text 行颜色覆盖与 Node contrast 解析路径 */
const Demo: FC = () => (
  <Layout width={560} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <FlowNode
      id="explicit-input"
      position={[-195, -65]}
      title="Text.fill"
      detail="explicit line color"
      stroke="darkorange"
    />
    <FlowNode id="explicit-step" position={[0, -65]} title="override" detail="skip inheritance" stroke="dimgray" />
    <FlowNode
      id="explicit-output"
      position={[195, -65]}
      title="explicit color"
      detail="current line"
      stroke="dodgerblue"
    />

    <FlowNode id="opaque-input" position={[-195, 0]} title="Contrast" detail="static opaque fill" stroke="darkorange" />
    <FlowNode id="opaque-step" position={[0, 0]} title="compare" detail="WCAG luminance" stroke="dimgray" />
    <FlowNode
      id="opaque-output"
      position={[195, 0]}
      title="#000000 / #ffffff"
      detail="inherited line"
      stroke="dodgerblue"
    />

    <FlowNode id="fallback-input" position={[-195, 65]} title="Contrast" detail="unresolved fill" stroke="darkorange" />
    <FlowNode id="fallback-step" position={[0, 65]} title="fallback" detail="emit warning" stroke="red" />
    <FlowNode
      id="fallback-output"
      position={[195, 65]}
      title="currentColor"
      detail="inherited line"
      stroke="dodgerblue"
    />

    <Draw way={['explicit-input', 'explicit-step']} stroke="gray" arrow="->" />
    <Draw way={['explicit-step', 'explicit-output']} stroke="gray" arrow="->" />
    <Draw way={['opaque-input', 'opaque-step']} stroke="gray" arrow="->" />
    <Draw way={['opaque-step', 'opaque-output']} stroke="gray" arrow="->" />
    <Draw way={['fallback-input', 'fallback-step']} stroke="gray" arrow="->" />
    <Draw way={['fallback-step', 'fallback-output']} stroke="gray" arrow="->" />
  </Layout>
);

export default Demo;
