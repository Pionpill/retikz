import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Scope, Step } from '@retikz/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-quadratic.controls';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-quadratic.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  values => {
    return (
      <InspectLayout registry={registry} width={380} height={360}>
        <Scope transforms={[{ kind: 'translate', x: values.position[0], y: values.position[1] }]}>
          <InspectPath
            request={{
              inspector: PATH_INSPECTOR_KEY,
              options: { controlPoints: values.controlPoints, vertices: values.vertices, labels: values.labels },
            }}
            style={{ stroke: 'dimgray', strokeWidth: 3, fill: 'none' }}
          >
            <Step kind="move" to={values.start} />
            <Step kind="curve" control={values.control} to={values.end} />
          </InspectPath>
        </Scope>
      </InspectLayout>
    );
  },
  'inspect-quadratic',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
