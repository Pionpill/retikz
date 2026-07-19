import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 几何圆角 playground 的中文属性面板 */
export const pathRoundedCornersControls = definePreviewControls({
  presentation: 'panel',
  title: '折线圆角',
  sections: [
    {
      label: '几何与描边',
      controls: [
        { kind: 'range', id: 'radius', label: 'roundedCorners', defaultValue: 28, min: 0, max: 60, step: 2 },
        { kind: 'range', id: 'strokeWidth', label: '描边宽度', defaultValue: 18, min: 2, max: 28, step: 2 },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: 'round',
          options: [
            { value: 'miter', label: 'miter' },
            { value: 'round', label: 'round' },
            { value: 'bevel', label: 'bevel' },
          ],
        },
      ],
    },
  ],
});
