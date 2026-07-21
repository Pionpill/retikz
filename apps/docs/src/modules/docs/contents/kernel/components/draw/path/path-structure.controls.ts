import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 基础结构 playground 的中文属性面板 */
export const pathStructureControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path 基础结构',
  sections: [
    {
      label: '路径结构',
      controls: [
        {
          kind: 'select',
          id: 'structure',
          label: '结构',
          defaultValue: 'polyline',
          options: [
            { value: 'polyline', label: '折线' },
            { value: 'subpaths', label: '多子路径' },
            { value: 'fill', label: '填充' },
          ],
        },
        {
          kind: 'color',
          id: 'fill',
          label: '填充色',
          defaultValue: '#1e90ff',
          visibleWhen: { controlId: 'structure', oneOf: ['fill'] },
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathStructureControls,
  canonicalValues: { structure: 'polyline', fill: '#1e90ff' },
  relatedApis: ['Path.children', 'Path.fill'],
} satisfies PreviewControlContract;
