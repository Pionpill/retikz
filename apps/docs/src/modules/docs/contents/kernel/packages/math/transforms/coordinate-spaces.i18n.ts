import type { Lang } from '@/i18n';

/** coordinate-spaces demo 与 controls 的本地化文案 */
export type CoordinateSpacesI18n = Readonly<{
  title: string;
  worldAxes: string;
  worldPoint: string;
  localPoint: string;
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
  label10: string;
  label11: string;
}>;

export const coordinateSpacesI18n: Record<Lang, CoordinateSpacesI18n> = {
  zh: {
    title: '坐标变换',
    worldAxes: '世界坐标轴',
    worldPoint: '世界点',
    localPoint: '局部点',
    label1: '坐标变换',
    label2: '图形位置',
    label3: '中心 x',
    label4: '中心 y',
    label5: '旋转角（度）',
    label6: '局部点',
    label7: '局部 x',
    label8: '局部 y',
    label9: '未旋转',
    label10: '旋转图形',
    label11: '偏移局部点',
  },
  en: {
    title: 'Coordinate transform',
    worldAxes: 'World axes',
    worldPoint: 'World point',
    localPoint: 'Local point',
    label1: 'Coordinate transform',
    label2: 'Shape position',
    label3: 'Center x',
    label4: 'Center y',
    label5: 'Rotation (degrees)',
    label6: 'Local point',
    label7: 'Local x',
    label8: 'Local y',
    label9: 'No rotation',
    label10: 'Rotated shape',
    label11: 'Offset local point',
  },
};
