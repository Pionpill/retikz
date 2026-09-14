import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Step } from '@retikz/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-arc.controls';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-arc.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  values => {
    return (
      <InspectLayout
        registry={registry}
        width={380}
        height={360}
        viewBox={{ x: -190, y: -180, width: 380, height: 360 }}
      >
        <InspectPath
          request={{
            inspector: PATH_INSPECTOR_KEY,
            options: { arcGeometry: values.arcGeometry, vertices: values.vertices, labels: values.labels },
          }}
          style={{ stroke: 'dimgray', strokeWidth: 3, fill: 'none' }}
        >
          <Step
            kind="move"
            to={[
              values.position[0] + values.radius * Math.cos((values.startAngle * Math.PI) / 180),
              values.position[1] + values.radius * Math.sin((values.startAngle * Math.PI) / 180),
            ]}
          />
          <Step
            kind="arc"
            center={values.position}
            radius={values.radius}
            startAngle={values.startAngle}
            endAngle={values.endAngle}
          />
        </InspectPath>
      </InspectLayout>
    );
  },
  'inspect-arc',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
