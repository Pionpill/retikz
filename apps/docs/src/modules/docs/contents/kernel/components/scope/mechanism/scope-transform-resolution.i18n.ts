import type { Lang } from '@/i18n';

export const scopeTransformResolutionI18n: Record<
  Lang,
  {
    stages: readonly [string, string];
    nodes: Record<'known' | 'bounds' | 'own' | 'placement', readonly [string, string, string]>;
  }
> = {
  zh: {
    stages: ['确定 pivot · 两种来源选其一', '应用自身变换，再做最终定位'],
    nodes: {
      known: ['直接使用已知中心', '原点 / 给定坐标', '不依赖内部节点布局'],
      bounds: ['从布局边框取点', '内部节点布局完成后', '取变换前边框的指定锚点'],
      own: ['围绕 pivot 应用变换', 'transforms · 缩放 / 旋转', '得到变换后的 selfAnchor'],
      placement: ['计算最终平移', '提前保存的 target − selfAnchor', '最后作用，形成完整变换'],
    },
  },
  en: {
    stages: ['Choose one source for pivot', 'Own transforms, then final placement'],
    nodes: {
      known: ['Use a known center', 'Origin / explicit coordinates', 'Independent of child layout'],
      bounds: ['Read a bounds anchor', 'After child layout completes', 'Anchor on the original bounds'],
      own: ['Transform around pivot', 'transforms · Scale / rotate', 'Obtain the transformed selfAnchor'],
      placement: ['Compute final translation', 'Saved target − selfAnchor', 'Applied last to complete the transform'],
    },
  },
};
