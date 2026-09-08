import type { FC } from 'react';

import { Block, BlockHeader, Graph } from '@retikz/graph-react';
import { Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockCustomControls, previewControlContract } from './block-custom.controls';

const ACCENT = '#f97316';

export const previewControls = blockCustomControls;

/** 使用开放 slot 与普通 Core Node 组合自定义 Block 内容 */
export const BlockCustomPreview = (values: PreviewControlValuesFor<typeof blockCustomControls>) => (
  <Graph viewBox={{ x: -90, y: -64, width: 420, height: 340 }}>
    <Block id="user-service">
      <BlockHeader
        icon={
          <Node
            position={[0, 0]}
            shape="circle"
            style={{ fill: ACCENT, fillOpacity: 0.1, stroke: 'none', textColor: ACCENT }}
            layout={{ minimumSize: 24, padding: 4 }}
          >
            U
          </Node>
        }
        title="UserService"
        description="应用服务"
        trail={
          <Node
            position={[0, 0]}
            cornerRadius={4}
            style={{ fill: ACCENT, fillOpacity: 0.1, stroke: 'none', textColor: ACCENT, font: { size: 'sm' } }}
            layout={{ padding: { x: 6, y: 2 } }}
          >
            public
          </Node>
        }
      />
      <Node
        position={[0, 0]}
        shape={values.shape}
        rotate={values.rotate}
        cornerRadius={values.cornerRadius}
        style={{
          fill: values.fill,
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          dashed: values.dashed,
          opacity: values.opacity,
          shadow: values.shadow,
          textColor: values.textColor,
          font: { size: values.fontSize },
        }}
        layout={{ padding: values.padding, minimumSize: { width: values.minimumWidth, height: values.minimumHeight } }}
      >
        {values.content}
      </Node>
    </Block>
  </Graph>
);

const controlledPreview = defineControlledPreview(previewControlContract, BlockCustomPreview);

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** Block 自定义元素 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
