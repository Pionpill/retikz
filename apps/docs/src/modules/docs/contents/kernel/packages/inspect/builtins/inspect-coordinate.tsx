import { COORDINATE_INSPECTOR_KEY, createDefaultInspectorRegistry } from '@retikz/inspect';
import { InspectCoordinate, InspectLayout } from '@retikz/inspect/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-coordinate.controls';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-coordinate.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  values => {
    return (
      <InspectLayout registry={registry} viewBox={{ x: -10, y: -10, width: 130, height: 130 }}>
        <InspectCoordinate
          id="A"
          position={values.position}
          request={{ inspector: COORDINATE_INSPECTOR_KEY, options: values.enabled ? { labels: values.labels } : false }}
        />
      </InspectLayout>
    );
  },
  'inspect-coordinate',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
