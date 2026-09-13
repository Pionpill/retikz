import { CLIP_INSPECTOR_KEY, createDefaultInspectorRegistry } from '@retikz/inspect';
import { InspectLayout } from '@retikz/inspect/react';
import { Node, Scope } from '@retikz/react';
import { PathClipDefinition } from '@retikz/standard/clip';

import { defineControlledBuiltinInspectPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-clip.controls';
import { inspectClipI18n } from './inspect-clip.i18n';
export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-clip.controls';

const registry = createDefaultInspectorRegistry();
const preview = defineControlledBuiltinInspectPreview(
  createPreviewControlContract,
  (values, lang) => {
    const i18n = inspectClipI18n[lang];
    return (
      <InspectLayout
        registry={registry}
        width={380}
        height={360}
        viewBox={{ x: -190, y: -180, width: 380, height: 360 }}
        clips={[PathClipDefinition]}
        request={{ inspector: CLIP_INSPECTOR_KEY, options: { outline: values.outline, labels: values.labels } }}
      >
        <Scope
          transforms={[{ kind: 'translate', x: values.position[0], y: values.position[1] }]}
          clip={{
            kind: 'path',
            fillRule: 'evenodd',
            commands: [
              { kind: 'move', to: [-values.width / 2, -values.height / 2] },
              { kind: 'line', to: [values.width / 2, -values.height / 2] },
              { kind: 'line', to: [values.width / 2, values.height / 2] },
              { kind: 'line', to: [-values.width / 2, values.height / 2] },
              { kind: 'close' },
              { kind: 'move', to: [-values.hole, 0] },
              { kind: 'line', to: [0, -values.hole] },
              { kind: 'line', to: [values.hole, 0] },
              { kind: 'line', to: [0, values.hole] },
              { kind: 'close' },
            ],
          }}
        >
          <Node
            position={[0, 0]}
            shape="rectangle"
            style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 } }}
            layout={{ minimumSize: { width: 300, height: 220 }, padding: 0 }}
          >
            {i18n.target}
          </Node>
        </Scope>
      </InspectLayout>
    );
  },
  'inspect-clip',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;
export default preview.Component;
