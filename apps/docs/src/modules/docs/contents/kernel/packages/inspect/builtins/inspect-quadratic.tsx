import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { Scope, Step, Path } from '@retikz/react';

import { InspectionResultPreview } from '@/modules/docs/preview';
import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-quadratic.controls';

export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-quadratic.controls';

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
        viewBox={{ x: -120, y: -110, width: 240, height: 175 }}
      >
        <Scope position={[values.position[0], values.position[1]]}>
          <Path style={{ stroke: 'dimgray', strokeWidth: 3, fill: 'none' }}>
            <Step kind="move" to={values.start} />
            <Step kind="curve" control={values.control} to={values.end} />
          </Path>
        </Scope>
      </InspectionResultPreview>
    );
  },
  'inspect-quadratic',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;

const Preview = preview.Component;

export default Preview;
