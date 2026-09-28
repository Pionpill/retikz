import { FlexLayoutDefinition } from '@retikz/layout';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-inspection.controls';
import { createInspectionScene } from './flex-inspection.data';

export { createPreviewControlContract } from './flex-inspection.controls';
export const previewControls = previewControlContract.controls;
const preview = defineFlexPreview(
  previewControlContract,
  values => <Layout ir={createInspectionScene(values)} extensions={{ composites: [FlexLayoutDefinition] }} />,
  values => ({
    rules: [
      {
        kind: 'request',
        inspector: FLEX_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: values.slots, allocation: values.allocation, visual: false },
          spacing: false,
          lines: true,
          gaps: values.gaps,
          distributedSpace: false,
          overflow: false,
          alignmentGuides: false,
        },
      },
    ],
  }),
);
export const previewSource = preview.source;
/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
