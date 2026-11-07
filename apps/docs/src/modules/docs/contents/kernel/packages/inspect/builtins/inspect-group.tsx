import { createDefaultInspectorRegistry, GROUP_INSPECTOR_KEY } from '@retikz/inspect';
import { Node, Scope } from '@retikz/react';

import { InspectionResultPreview } from '@/modules/docs/preview';
import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-group.controls';
import { inspectGroupI18n } from './inspect-group.i18n';

export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-group.controls';

const registry = createDefaultInspectorRegistry();

const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  (values, lang) => {
    const i18n = inspectGroupI18n[lang];
    return (
      <InspectionResultPreview
        requests={[
          {
            inspector: GROUP_INSPECTOR_KEY,
            options: { origin: values.origin, axes: values.axes, labels: values.labels },
          },
        ]}
        registry={registry}
        viewBox={{ x: -135, y: -175, width: 300, height: 325 }}
      >
        <Scope
          transforms={[
            { kind: 'translate', x: values.position[0], y: values.position[1] },
            { kind: 'rotate', degrees: values.rotate },
          ]}
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
        </Scope>
      </InspectionResultPreview>
    );
  },
  'inspect-group',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;

const Preview = preview.Component;

export default Preview;
