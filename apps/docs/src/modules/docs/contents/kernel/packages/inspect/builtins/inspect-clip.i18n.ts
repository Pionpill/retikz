import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectClipI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    width: string;
    height: string;
    hole: string;
    outline: string;
    labels: string;
    target: string;
  }
> = {
  zh: {
    title: '裁切',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    width: '裁切宽度',
    height: '裁切高度',
    hole: '孔洞半径',
    outline: '裁切边缘',
    labels: '标签',
    target: '裁切内容',
  },
  en: {
    title: 'Clipping',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    width: 'Clip width',
    height: 'Clip height',
    hole: 'Hole radius',
    outline: 'Clip outline',
    labels: 'Labels',
    target: 'Clipped content',
  },
};
