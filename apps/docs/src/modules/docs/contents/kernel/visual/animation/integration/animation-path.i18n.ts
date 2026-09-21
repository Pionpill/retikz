import type { Lang } from '@/i18n';
/** 描边画出与路径旋转示例文案 */
export const animationPathI18n: Record<Lang, { draw: string; rotate: string; label: string }> = {
  zh: { draw: '描边画出', rotate: '路径摆动', label: '路径标签' },
  en: { draw: 'Reveal the stroke', rotate: 'Wiggle the path', label: 'Path label' },
};
