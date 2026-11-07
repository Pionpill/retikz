import { pathClipDefinition } from '@retikz/extension';
import { CLIP_INSPECTOR_KEY, createDefaultInspectorRegistry } from '@retikz/inspect';
import { Node, Scope } from '@retikz/react';

import { InspectionResultPreview } from '@/modules/docs/preview';
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
      <InspectionResultPreview
        requests={[{ inspector: CLIP_INSPECTOR_KEY, options: { outline: values.outline } }]}
        registry={registry}
        viewBox={{ x: -180, y: -140, width: 360, height: 280 }}
        extensions={{ clips: [pathClipDefinition] }}
      >
        <Scope
          position={[values.position[0], values.position[1]]}
          clip={{
            kind: 'path',
            params: {
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
            },
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
      </InspectionResultPreview>
    );
  },
  'inspect-clip',
);

/** Derive all views from the same drawing and current controls. */
export const previewSource = preview.source;

const Preview = preview.Component;

export default Preview;
