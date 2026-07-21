import type { IRNodeTarget } from '@retikz/core';
import type { FC } from 'react';

import { Draw, Layout, Node, Rectangle } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { contourBoundaryPlaygroundControls, previewControlContract } from './contour-boundary-playground.controls';

export const previewControls = contourBoundaryPlaygroundControls;

type ContourBoundaryValues = PreviewControlValuesFor<typeof contourBoundaryPlaygroundControls>;
type AnchorChoice = ContourBoundaryValues['anchor'];

const CONTOUR_POINTS: Array<[number, number]> = [
  [-42, -46],
  [20, -46],
  [42, -10],
  [20, 38],
  [-42, 48],
];

/** 将自动、标准方位或数字控件转换为有效的节点端点引用 */
const targetOf = (anchor: AnchorChoice, anchorAngle: number): IRNodeTarget => ({
  id: 'shape',
  ...(anchor === 'auto' ? {} : { anchor: anchor === 'angle' ? anchorAngle : anchor }),
});

/** 让连线从来源节点的可连接边界开始 */
const sourceTarget: IRNodeTarget = { id: 'source' };

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const points =
    values.pointSet === 'shifted'
      ? CONTOUR_POINTS.map(([x, y]): [number, number] => [x + 200, y + 200])
      : CONTOUR_POINTS;
  const radians = (values.sourceAngle * Math.PI) / 180;
  const sourcePosition: [number, number] = [
    values.sourceDistance * Math.cos(radians),
    values.sourceDistance * Math.sin(radians),
  ];

  return (
    <Layout width={400} height={430} viewBox={{ x: -215, y: -215, width: 430, height: 430 }}>
      <Rectangle
        center={[0, 0]}
        width={84}
        height={94}
        stroke="lightgray"
        strokeOpacity={0.55}
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Node
        id="shape"
        position={[0, 0]}
        shape={{ type: 'contour', params: { points, cornerRadius: values.cornerRadius } }}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={2.5}
      />
      <Node id="source" position={sourcePosition} shape="circle" minimumSize={18} fill="gray" stroke="none" />
      <Draw way={[sourceTarget, targetOf(values.anchor, values.anchorAngle)]} arrow="->" stroke="gray" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Contour 的精确连接边界与 AABB 对照 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
