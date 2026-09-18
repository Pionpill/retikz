import type { Lang } from '@/i18n';

export const scopeCoordinateProjectionI18n: Record<
  Lang,
  {
    nodes: Record<'target' | 'chain' | 'result' | 'inverse' | 'add' | 'forward' | 'offset', readonly [string, string]>;
    edges: Record<string, string>;
  }
> = {
  zh: {
    nodes: {
      target: ['A 的画布位置', '[100, 0]'],
      chain: ['同一套换算', '横向放大 2 倍'],
      result: ['B 的画布位置', '[120, 0]'],
      inverse: ['换成 Scope 坐标', 'toLocal'],
      add: ['Scope 内加偏移', '[50, 0] + [10, 0]'],
      forward: ['换回画布坐标', 'toWorld'],
      offset: ['Scope 内走多远', '已解析为 [10, 0]'],
    },
    edges: {},
  },
  en: {
    nodes: {
      target: ['A on canvas', '[100, 0]'],
      chain: ['Same conversion', 'Horizontal × 2'],
      result: ['B on canvas', '[120, 0]'],
      inverse: ['Into Scope units', 'toLocal'],
      add: ['Add inside Scope', '[50, 0] + [10, 0]'],
      forward: ['Back to canvas', 'toWorld'],
      offset: ['Move inside Scope', '[10, 0]'],
    },
    edges: {},
  },
};
