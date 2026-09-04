import type { FC } from 'react';

import { Block, BlockHeader, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockCustomControls, previewControlContract } from './block-custom.en.controls';

const ACCENT = '#f97316';

export const previewControls = blockCustomControls;

/** Composes custom Block content from open slots and an ordinary Core Node */
export const BlockCustomPreview = (values: PreviewControlValuesFor<typeof blockCustomControls>) => (
  <Graph width={420} height={340} viewBox={{ x: -90, y: -64, width: 420, height: 340 }}>
    <Block id="user-service">
      <BlockHeader
        icon={
          <Node
            position={[0, 0]}
            shape="circle"
            minimumSize={24}
            padding={4}
            fill={ACCENT}
            fillOpacity={0.1}
            stroke="none"
            textColor={ACCENT}
          >
            U
          </Node>
        }
        title="UserService"
        description="Application service"
        trail={
          <Node
            position={[0, 0]}
            padding={{ x: 6, y: 2 }}
            fill={ACCENT}
            fillOpacity={0.1}
            stroke="none"
            textColor={ACCENT}
            font={{ size: 'sm' }}
            cornerRadius={4}
          >
            public
          </Node>
        }
      />
      <Node
        position={[0, 0]}
        shape={values.shape}
        padding={values.padding}
        minimumSize={{ width: values.minimumWidth, height: values.minimumHeight }}
        rotate={values.rotate}
        cornerRadius={values.cornerRadius}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        dashed={values.dashed}
        opacity={values.opacity}
        shadow={values.shadow}
        textColor={values.textColor}
        font={{ size: values.fontSize }}
      >
        {values.content}
      </Node>
    </Block>
  </Graph>
);

const controlledPreview = defineControlledPreview(previewControlContract, BlockCustomPreview);

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Custom Block elements controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
