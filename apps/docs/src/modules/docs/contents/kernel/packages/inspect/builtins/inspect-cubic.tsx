import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { Scope, Step, Path } from '@retikz/react';

import { InspectionResultPreview } from '@/modules/docs/preview';
import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-cubic.controls';

export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-cubic.controls';

const registry = createDefaultInspectorRegistry();

const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  values => {
    return (
      <InspectionResultPreview
        requests={[
          {
            inspector: PATH_INSPECTOR_KEY,
            options: { controlPoints: values.controlPoints, vertices: values.vertices, labels: values.labels },
          },
        ]}
        registry={registry}
        viewBox={{ x: -120, y: -115, width: 240, height: 230 }}
      >
        <Scope position={[values.position[0], values.position[1]]}>
          <Path style={{ stroke: 'dimgray', strokeWidth: 3, fill: 'none' }}>
            <Step kind="move" to={values.start} />
            <Step kind="cubic" control1={values.control1} control2={values.control2} to={values.end} />
          </Path>
        </Scope>
      </InspectionResultPreview>
    );
  },
  'inspect-cubic',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;

const Preview = preview.Component;

export default Preview;
