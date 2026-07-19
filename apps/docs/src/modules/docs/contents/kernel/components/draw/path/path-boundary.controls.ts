import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 端点连接面的中文属性面板 */
export const pathBoundaryControls = definePreviewControls({
  presentation: 'panel',
  title: '端点连接面',
  sections: [
    {
      label: '端点',
      controls: [
        {
          kind: 'select',
          id: 'boundary',
          label: '连接面',
          defaultValue: 'shape',
          options: [
            { value: 'shape', label: '星形轮廓' },
            { value: 'circle', label: '外接圆' },
          ],
        },
      ],
    },
  ],
});
