import type { FC } from 'react';

import { Entity, Graph } from '@retikz/graph-react';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityGatewayControls, previewControlContract } from './entity-gateway.controls';
import { defineEntityAppearanceProps } from './entity-role-controls';

export const previewControls = entityGatewayControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Graph width={360} height={180} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity role="gateway" {...defineEntityAppearanceProps(values.color)} position={[180, 90]}>
      {values.content}
    </Entity>
  </Graph>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** 网关 role 的视觉与文本 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
