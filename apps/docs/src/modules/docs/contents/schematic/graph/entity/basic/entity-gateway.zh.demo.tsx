import { EntityRole } from '@retikz/graph';
import { Entity } from '@retikz/graph-react';
import type { FC } from 'react';

import { LogicFigure } from '@/modules/docs/components/logic-figure';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityGatewayControls, previewControlContract } from './entity-gateway.controls';
import { defineEntityAppearanceProps } from './entity-role-controls';

export const previewControls = entityGatewayControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <LogicFigure semanticColors={!values.status} viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      role={EntityRole.Gateway}
      kind={values.kind || undefined}
      status={values.status || undefined}
      {...defineEntityAppearanceProps(values.color)}
      position={[180, 90]}
    >
      {values.content}
    </Entity>
  </LogicFigure>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** 网关 role 的视觉与文本 controls demo */
const Demo: FC = controlledPreview.Component;

export default Demo;
