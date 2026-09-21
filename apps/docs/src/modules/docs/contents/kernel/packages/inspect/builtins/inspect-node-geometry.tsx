import { createDefaultInspectorRegistry, NODE_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectNode } from '@retikz/inspect/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-node-geometry.controls';
import { inspectNodeGeometryI18n } from './inspect-node-geometry.i18n';

export {
  createPreviewControlContract,
  previewControlContract,
  previewControls,
} from './inspect-node-geometry.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  (values, lang) => {
    const i18n = inspectNodeGeometryI18n[lang];
    return (
      <InspectLayout registry={registry} viewBox={{ x: -110, y: -90, width: 220, height: 180 }}>
        <InspectNode
          position={values.position}
          shape="ellipse"
          rotate={values.rotate}
          scale={{ x: values.scaleX, y: values.scaleY }}
          request={{
            inspector: NODE_INSPECTOR_KEY,
            options: {
              outline: values.outline,
              boundary: values.boundary,
              box: values.box,
              bounds: values.bounds,
              content: values.content,
              baselines: values.baselines,
              keyPoints: values.keyPoints,
              labels: values.labels,
            },
          }}
          style={{ fill: '#dbeafe', stroke: '#1e3a8a', strokeWidth: 2, textColor: '#172554' }}
          layout={{ minimumSize: { width: values.width, height: values.height }, padding: 12 }}
        >
          {i18n.target}
        </InspectNode>
      </InspectLayout>
    );
  },
  'inspect-node-geometry',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
