import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { CircleClipDefinition, CompoundClipDefinition } from '@retikz/standard/clip';

import { defineControlledPreview } from '@/modules/docs/preview';

import { compoundClipControls, previewControlContract } from './compound-clip.controls';

export const previewControls = compoundClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={380}
    height={220}
    viewBox={{ x: -165, y: -100, width: 330, height: 200 }}
    clips={[CompoundClipDefinition, CircleClipDefinition]}
  >
    <Node
      position={[0, 0]}
      shape="rectangle"
      minimumSize={{ width: 300, height: 170 }}
      fill="none"
      stroke="lightgray"
      strokeWidth={1}
      dashPattern={[6, 4]}
    />
    <Scope
      clip={{
        kind: 'compound',
        fillRule: values.fillRule,
        children: [
          { kind: 'circle', cx: -values.offset / 2, cy: 0, r: values.radius },
          { kind: 'circle', cx: values.offset / 2, cy: 0, r: values.radius },
        ],
      }}
    >
      <Node
        position={[0, 0]}
        shape="rectangle"
        minimumSize={{ width: 300, height: 170 }}
        stroke="none"
        fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 }}
      />
    </Scope>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 固定两个圆形 child，并调整其几何参数与组合填充规则 */
const Demo: FC = controlledPreview.Component;

export default Demo;
