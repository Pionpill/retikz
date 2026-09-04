import type { IRGeometryLabel } from '@retikz/core';
import type { ReactNode } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

import type { PathLabelRoutePlaygroundValues } from './path-label-route-playground.controls';

export type PathLabelRoutePlaygroundCopy = {
  source: string;
  target: string;
  label: string;
};

const SourcePosition: [number, number] = [-145, -85];
const TargetPosition: [number, number] = [145, 85];
const SmoothPoints: Array<[number, number] | 'B'> = [[-115, 105], [25, -105], 'B'];

/** 由路线控件选择连接两个固定节点的 Step */
const routeStepOf = (route: PathLabelRoutePlaygroundValues['route']): ReactNode => {
  switch (route) {
    case 'line':
      return <Step kind="line" to="B" />;
    case 'fold':
      return <Step kind="fold" via="-|" to="B" />;
    case 'curve':
      return <Step kind="curve" control={[0, -120]} to="B" />;
    case 'cubic':
      return <Step kind="cubic" control1={[-95, 115]} control2={[95, -115]} to="B" />;
    case 'bend':
      return <Step kind="bend" bendDirection="left" bendAngle={58} to="B" />;
    case 'smooth':
      return <Step kind="smooth" points={SmoothPoints} tension={1} />;
  }
};

/** 将面板中的居中概念值转换为 Path label 的真实作者输入 */
const labelOf = (values: PathLabelRoutePlaygroundValues, text: string): IRGeometryLabel => {
  const base = {
    text,
    position: values.position,
    textColor: 'currentColor',
    font: { size: 13 },
  };

  return values.side === 'center' ? { ...base, sloped: true } : { ...base, side: values.side };
};

/** 渲染固定端点、可变路线与可变标签位置的 Path playground */
export const renderPathLabelRoutePlayground = (
  values: PathLabelRoutePlaygroundValues,
  copy: PathLabelRoutePlaygroundCopy,
): ReactNode => (
  <Layout width={420} height={300} viewBox={{ x: -210, y: -140, width: 420, height: 280 }}>
    <Node
      id="A"
      position={SourcePosition}
      fill="transparent"
      minimumSize={{ width: 48, height: 32 }}
      stroke="currentColor"
      textColor="currentColor"
    >
      {copy.source}
    </Node>
    <Node
      id="B"
      position={TargetPosition}
      fill="transparent"
      minimumSize={{ width: 48, height: 32 }}
      stroke="currentColor"
      textColor="currentColor"
    >
      {copy.target}
    </Node>
    <Path label={labelOf(values, copy.label)} stroke="currentColor">
      <Step kind="move" to="A" />
      {routeStepOf(values.route)}
    </Path>
  </Layout>
);
