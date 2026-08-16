import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

export const ClipGalleryControlId = {
  Left: 'leftClip',
  Right: 'rightClip',
  LeftX: 'leftX',
  RightX: 'rightX',
} as const;

export const clipGalleryControls = definePreviewControls({
  presentation: 'panel',
  title: '组合裁剪',
  sections: [
    {
      label: '左右裁剪区域',
      controls: [
        {
          kind: 'select',
          id: ClipGalleryControlId.Left,
          label: '左侧类型',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'polygon', label: '多边形' },
          ],
        },
        {
          kind: 'select',
          id: ClipGalleryControlId.Right,
          label: '右侧类型',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'polygon', label: '多边形' },
          ],
        },
      ],
    },
    {
      label: '区域位置',
      controls: [
        {
          kind: 'range',
          id: ClipGalleryControlId.LeftX,
          label: '左侧位置',
          defaultValue: -130,
          min: -200,
          max: 0,
          step: 10,
        },
        {
          kind: 'range',
          id: ClipGalleryControlId.RightX,
          label: '右侧位置',
          defaultValue: 130,
          min: 0,
          max: 200,
          step: 10,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: clipGalleryControls,
  canonicalValues: {
    [ClipGalleryControlId.Left]: 'circle',
    [ClipGalleryControlId.Right]: 'circle',
    [ClipGalleryControlId.LeftX]: -130,
    [ClipGalleryControlId.RightX]: 130,
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRCompoundClip.children'],
} satisfies PreviewControlContract;
