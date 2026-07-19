import type { IRNodeLabelInput } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeLabelControls } from './node-label.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

export const previewControls = nodeLabelControls;

/** Node 标签附着、朝向、样式与引线 playground */
const Demo: FC = () => {
  const values = usePreviewControls(nodeLabelControls);
  const position: IRNodeLabelInput['position'] =
    values.positionMode === 'angle'
      ? values.positionAngle
      : values.positionMode === 'boundary'
        ? { boundary: values.boundary, fraction: values.fraction }
        : values.direction;
  const rotate: IRNodeLabelInput['rotate'] = values.rotateMode === 'angle' ? values.rotateAngle : values.rotateMode;
  const pin: IRNodeLabelInput['pin'] =
    values.placement === 'outside' && values.pinStyle !== 'none'
      ? {
          stroke: values.pinColor,
          strokeWidth: values.pinWidth,
          ...(values.pinStyle === 'dashed' ? { dashPattern: [4, 3], dashOffset: values.pinDashOffset } : {}),
        }
      : undefined;

  return (
    <Layout width={520} height={320} viewBox={{ x: -260, y: -160, width: 520, height: 320 }}>
      <Node
        id="Q"
        position={[0, 0]}
        minimumSize={{ width: 120, height: 76 }}
        padding={{ x: 18, y: 12 }}
        fill="lightgray"
        stroke="gray"
        label={{
          text: values.labelText,
          position,
          placement: values.placement,
          distance: values.distance,
          rotate,
          keepUpright: values.keepUpright,
          textColor: values.labelTextColor,
          font: { size: values.labelFontSize },
          opacity: values.labelOpacity,
          pin,
        }}
      >
        q
      </Node>
    </Layout>
  );
};

export default Demo;
