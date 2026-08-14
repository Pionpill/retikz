import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { DiamondArrowDefinition, OpenDiamondArrowDefinition } from '@retikz/standard/arrow';

import { defineControlledPreview } from '@/modules/docs/preview';

import { diamondArrowsControls, previewControlContract } from './diamond-arrows.controls';

export const previewControls = diamondArrowsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const detail = { color: values.color, scale: values.scale, lineWidth: values.lineWidth };
  return (
    <Layout
      width={460}
      height={180}
      viewBox={{ x: -210, y: -80, width: 420, height: 160 }}
      arrows={[DiamondArrowDefinition, OpenDiamondArrowDefinition]}
    >
      <Draw
        way={[
          [-140, 10],
          [-20, 10],
        ]}
        arrow="->"
        arrowDetail={{ ...detail, end: { ...detail, shape: 'diamond' } }}
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <Draw
        way={[
          [20, 10],
          [140, 10],
        ]}
        arrow="->"
        arrowDetail={{ ...detail, end: { ...detail, shape: 'openDiamond' } }}
        stroke="#94a3b8"
        strokeWidth={2}
      />
      <Node position={[-80, -35]} fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
        diamond
      </Node>
      <Node position={[80, -35]} fill="none" stroke="none" font={{ size: 12 }} textColor="gray">
        openDiamond
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 对照实心与空心菱形箭头 */
const Demo: FC = controlledPreview.Component;

export default Demo;
