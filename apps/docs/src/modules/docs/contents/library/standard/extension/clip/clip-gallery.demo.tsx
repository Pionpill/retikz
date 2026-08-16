import type { IRClip } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import {
  CircleClipDefinition,
  CircleClipShapeDefinition,
  CompoundClipDefinition,
  CompoundClipShapeDefinition,
  EllipseClipDefinition,
  EllipseClipShapeDefinition,
  PolygonClipDefinition,
  PolygonClipShapeDefinition,
} from '@retikz/standard/clip';

import { defineControlledPreview } from '@/modules/docs/preview';

import { clipGalleryControls, previewControlContract } from './clip-gallery.controls';

export const previewControls = clipGalleryControls;

type ClipChoice = 'rect' | 'circle' | 'ellipse' | 'polygon';

const clipOf = (kind: ClipChoice, centerX: number): IRClip => {
  if (kind === 'rect') return { kind, x: centerX - 52, y: -48, width: 104, height: 96 };
  if (kind === 'ellipse') return { kind, cx: centerX, cy: 0, rx: 58, ry: 42 };
  if (kind === 'polygon') {
    return {
      kind,
      points: [
        [centerX, -54],
        [centerX + 58, -18],
        [centerX + 36, 50],
        [centerX - 36, 50],
        [centerX - 58, -18],
      ],
    };
  }
  return { kind, cx: centerX, cy: 0, r: 48 };
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const renderRegion = (kind: ClipChoice, centerX: number) => (
    <Scope
      clip={{
        kind: 'compound',
        fillRule: 'nonzero',
        children: [clipOf(kind, centerX)],
      }}
    >
      <Node
        position={[centerX, 0]}
        shape="rectangle"
        minimumSize={{ width: 150, height: 130 }}
        stroke="none"
        fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 }}
      />
    </Scope>
  );

  return (
    <Layout
      width={520}
      height={210}
      viewBox={{ x: -260, y: -105, width: 520, height: 210 }}
      clips={[CompoundClipDefinition, CircleClipDefinition, EllipseClipDefinition, PolygonClipDefinition]}
      clipShapes={[
        CompoundClipShapeDefinition,
        CircleClipShapeDefinition,
        EllipseClipShapeDefinition,
        PolygonClipShapeDefinition,
      ]}
    >
      {renderRegion(values.leftClip, values.leftX)}
      {renderRegion(values.rightClip, values.rightX)}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 展示左右两个区域如何分别使用不同的基础裁剪并由 compound 组合承载 */
const Demo: FC = controlledPreview.Component;

export default Demo;
