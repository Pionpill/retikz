import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { CircleClipDefinition, EllipseClipDefinition } from '@retikz/standard/clip';

import { defineControlledPreview } from '@/modules/docs/preview';

import { circleEllipseClipControls, previewControlContract } from './circle-ellipse-clip.controls';

export const previewControls = circleEllipseClipControls;

const clippedContent = (centerX: number) => (
  <Node
    position={[centerX, 0]}
    shape="rectangle"
    minimumSize={{ width: 170, height: 150 }}
    stroke="none"
    fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 }}
  />
);

const sourceBoundary = (centerX: number) => (
  <Node
    position={[centerX, 0]}
    shape="rectangle"
    minimumSize={{ width: 170, height: 150 }}
    fill="none"
    stroke="lightgray"
    strokeWidth={1}
    dashPattern={[6, 4]}
  />
);

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={440}
    height={220}
    viewBox={{ x: -220, y: -110, width: 440, height: 220 }}
    clips={[CircleClipDefinition, EllipseClipDefinition]}
  >
    {sourceBoundary(-105)}
    <Scope clip={{ kind: 'circle', cx: -105, cy: 0, r: values.circleRadius }}>{clippedContent(-105)}</Scope>
    {sourceBoundary(105)}
    <Scope
      clip={{
        kind: 'ellipse',
        cx: 105,
        cy: 0,
        rx: values.ellipseRadiusX,
        ry: values.ellipseRadiusY,
      }}
    >
      {clippedContent(105)}
    </Scope>
    <Node position={[-105, 90]} fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
      circle
    </Node>
    <Node position={[105, 90]} fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
      ellipse
    </Node>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 固定展示圆形与椭圆裁剪，并分别调整其半径 */
const Demo: FC = controlledPreview.Component;

export default Demo;
