import type { Lang } from '@/i18n';

/** 标记试验场文案 */
export const markPlacementI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    times: string;
    plus: string;
    check: string;
    star: string;
    arrow: string;
    position: string;
    scale: string;
    color: string;
    autoRotate: string;
    angle: string;
  }
> = {
  zh: {
    title: '路径标记',
    shape: '形状',
    times: '叉号',
    plus: '加号',
    check: '对勾',
    star: '五角星',
    arrow: '箭头',
    position: '位置',
    scale: '缩放',
    color: '标记颜色',
    autoRotate: '沿切线旋转',
    angle: '固定角度',
  },
  en: {
    title: 'Path marks',
    shape: 'Shape',
    times: 'Times',
    plus: 'Plus',
    check: 'Check',
    star: 'Star',
    arrow: 'Arrow',
    position: 'Position',
    scale: 'Scale',
    color: 'Mark color',
    autoRotate: 'Follow tangent',
    angle: 'Fixed angle',
  },
};
