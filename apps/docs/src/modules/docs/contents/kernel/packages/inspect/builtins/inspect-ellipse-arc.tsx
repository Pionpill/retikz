import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Step } from '@retikz/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-ellipse-arc.controls';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-ellipse-arc.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  values => {
    return (
      <InspectLayout registry={registry} viewBox={{ x: -130, y: -90, width: 260, height: 120 }}>
        <InspectPath
          request={{
            inspector: PATH_INSPECTOR_KEY,
            options: {
              arcGeometry: values.arcGeometry,
              ellipseAxes: values.ellipseAxes,
              vertices: values.vertices,
              labels: values.labels,
            },
          }}
          style={{ stroke: 'dimgray', strokeWidth: 3, fill: 'none' }}
        >
          <Step
            kind="move"
            to={[
              values.position[0] + values.radiusX * Math.cos((values.startAngle * Math.PI) / 180),
              values.position[1] + values.radiusY * Math.sin((values.startAngle * Math.PI) / 180),
            ]}
          />
          <Step
            kind="arc"
            center={values.position}
            radius={{ x: values.radiusX, y: values.radiusY }}
            startAngle={values.startAngle}
            endAngle={values.endAngle}
          />
        </InspectPath>
      </InspectLayout>
    );
  },
  'inspect-ellipse-arc',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
