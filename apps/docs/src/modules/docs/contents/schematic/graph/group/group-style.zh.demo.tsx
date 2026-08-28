import type { FC } from 'react';

import { Entity, Graph, Group, Relation } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { groupStyleControls, previewControlContract } from './group-style.controls';

export const previewControls = groupStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const backgroundColor = typeof values.backgroundColor === 'string' ? values.backgroundColor : '#e2e8f0';
  const backgroundOpacity = typeof values.backgroundOpacity === 'number' ? values.backgroundOpacity : 0.08;
  const borderColor = typeof values.borderColor === 'string' ? values.borderColor : '#64748b';
  const borderWidth = typeof values.borderWidth === 'number' ? values.borderWidth : 1;
  const borderOpacity = typeof values.borderOpacity === 'number' ? values.borderOpacity : 1;
  const cornerRadius = typeof values.cornerRadius === 'number' ? values.cornerRadius : 4;
  const padding = typeof values.padding === 'number' ? values.padding : 10;
  const borderLineStyle =
    values.borderLineStyle === 'dotted'
      ? { dashPattern: [1, 4], lineCap: 'round' as const }
      : values.borderLineStyle === 'dashed'
        ? { dashPattern: [6, 4] }
        : {};

  return (
    <Graph width={440} height={220} viewBox={{ x: -90, y: -71.6, width: 440, height: 220 }}>
      <Group
        id="group-style"
        padding={padding}
        cornerRadius={cornerRadius}
        background={{ fill: backgroundColor, fillOpacity: backgroundOpacity }}
        border={{ stroke: borderColor, strokeWidth: borderWidth, strokeOpacity: borderOpacity, ...borderLineStyle }}
        caption={{ title: { text: '运行时' }, description: { text: '编译与渲染' } }}
      >
        <Entity id="compiler" role="activity" position={[130, 145]} textColor="currentColor">
          编译
        </Entity>
        <Entity id="renderer" role="participant" position={[310, 145]} textColor="currentColor">
          渲染器
        </Entity>
        <Relation role="flow" source={{ id: 'compiler' }} target={{ id: 'renderer' }} />
      </Group>
    </Graph>
  );
});

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Group 外框颜色、线型、圆角与内边距 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
