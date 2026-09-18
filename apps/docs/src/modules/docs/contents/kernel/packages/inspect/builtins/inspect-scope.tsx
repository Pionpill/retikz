import { createDefaultInspectorRegistry, SCOPE_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectScope } from '@retikz/inspect/react';
import { Node } from '@retikz/react';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-scope.controls';
import { inspectScopeI18n } from './inspect-scope.i18n';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-scope.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  (values, lang) => {
    const i18n = inspectScopeI18n[lang];
    return (
      <InspectLayout registry={registry} width={380} height={360}>
        <InspectScope
          transforms={[
            { kind: 'translate', x: values.position[0], y: values.position[1] },
            { kind: 'rotate', degrees: values.rotate },
          ]}
          request={{
            inspector: SCOPE_INSPECTOR_KEY,
            options: { envelope: values.envelope, origin: values.origin, axes: values.axes, labels: values.labels },
          }}
        >
          <Node
            position={[65, 50]}
            shape="rectangle"
            style={{ fill: '#ecfdf5', stroke: '#047857', strokeWidth: 2, textColor: '#064e3b' }}
            layout={{ minimumSize: { width: values.width, height: values.height }, padding: 10 }}
          >
            {i18n.target}
          </Node>
          <Node
            position={[-45, -85]}
            shape="rectangle"
            style={{ fill: '#ecfdf5', stroke: '#047857', strokeWidth: 2, textColor: '#064e3b' }}
            layout={{ minimumSize: { width: values.width, height: values.height }, padding: 10 }}
          >
            {i18n.target}
          </Node>
        </InspectScope>
      </InspectLayout>
    );
  },
  'inspect-scope',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
const Preview = preview.Component;

export default Preview;
