import type { Lang } from '@/i18n';

/** 极坐标采样对照图文案 */
export const pathSamplingI18n: Record<Lang, Record<'chord' | 'sampled' | 'direct' | 'segments', string>> = {
  zh: {
    chord: '端点直连：弦',
    sampled: '补点后连接：逼近圆弧',
    direct: '只连接两个原始位置',
    segments: '蓝点为中间采样点（示意）',
  },
  en: {
    chord: 'Connect endpoints: chord',
    sampled: 'Sample and connect: approximate arc',
    direct: 'Connect only the two original positions',
    segments: 'Blue dots: intermediate samples (illustrative)',
  },
};
