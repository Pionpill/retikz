import type { Lang } from '@/i18n';

export const scopeCoordinateProjectionI18n: Record<
  Lang,
  {
    nodes: Record<'inverse' | 'add' | 'forward', readonly [string, string, string]>;
  }
> = {
  zh: {
    nodes: {
      inverse: ['换成 Scope 坐标', 'toLocal · A 的画布位置', '[100, 0] → [50, 0]'],
      add: ['在 Scope 内加偏移', '已解析的 offset = [10, 0]', '[50, 0] + [10, 0] = [60, 0]'],
      forward: ['换回画布坐标', 'toWorld · B 的最终位置', '[60, 0] → [120, 0]'],
    },
  },
  en: {
    nodes: {
      inverse: ['Convert into Scope', 'toLocal · A on canvas', '[100, 0] → [50, 0]'],
      add: ['Add the local offset', 'Resolved offset = [10, 0]', '[50, 0] + [10, 0] = [60, 0]'],
      forward: ['Convert back to canvas', 'toWorld · Final position of B', '[60, 0] → [120, 0]'],
    },
  },
};
