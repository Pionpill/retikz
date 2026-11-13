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
    positionMode: string;
    positionGeometry: string;
    defaultGeometry: string;
    step: string;
    length: string;
    original: string;
    rounded: string;
    cornerRadius: string;
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
    positionMode: '定位模式',
    positionGeometry: '定位几何',
    defaultGeometry: '随模式默认',
    step: '按步骤',
    length: '按长度',
    original: '原始路径',
    rounded: '圆角路径',
    cornerRadius: '圆角半径',
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
    positionMode: 'Position mode',
    positionGeometry: 'Position geometry',
    defaultGeometry: 'Mode default',
    step: 'Step',
    length: 'Length',
    original: 'Original',
    rounded: 'Rounded',
    cornerRadius: 'Corner radius',
    scale: 'Scale',
    color: 'Mark color',
    autoRotate: 'Follow tangent',
    angle: 'Fixed angle',
  },
};
