import type { Lang } from '@/i18n';

export const scopeTransformResolutionI18n: Record<
  Lang,
  {
    nodes: Record<'known' | 'own' | 'bounds' | 'pivot' | 'target' | 'placement' | 'final', readonly [string, string]>;
    edges: Record<string, string>;
  }
> = {
  zh: {
    nodes: {
      known: ['已知中心', '原点 / 给定坐标'],
      own: ['自身变换', 'transforms'],
      bounds: ['变换前边框', '内部节点已摆好'],
      pivot: ['找到变换中心', 'pivot'],
      target: ['提前算好的目标', '父坐标系'],
      placement: ['计算最后的平移', 'target − selfAnchor'],
      final: ['完整变换', '自身变换 + 定位'],
    },
    edges: {},
  },
  en: {
    nodes: {
      known: ['Known pivot', 'Origin / point'],
      own: ['Own transforms', 'transforms'],
      bounds: ['Original bounds', 'Children positioned'],
      pivot: ['Find the pivot', 'Original bounds anchor'],
      target: ['Saved target', 'Parent coordinates'],
      placement: ['Find final shift', 'target − selfAnchor'],
      final: ['Full transforms', 'Own + placement'],
    },
    edges: {},
  },
};
