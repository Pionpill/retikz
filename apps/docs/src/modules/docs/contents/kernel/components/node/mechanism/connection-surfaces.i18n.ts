import type { Lang } from '@/i18n';

export const connectionSurfacesI18n: Record<Lang, { titles: Array<string>; guide: string }> = {
  zh: { titles: ['shape：圆形', 'boundary：矩形', '再加 margin = 12'], guide: '灰色点线仅标注连接边界' },
  en: {
    titles: ['shape: circle', 'boundary: rectangle', 'Add margin = 12'],
    guide: 'Dotted guides mark connection bounds',
  },
};
