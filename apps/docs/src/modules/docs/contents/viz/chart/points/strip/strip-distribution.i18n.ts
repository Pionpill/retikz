import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const stripDistributionI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '极坐标中的角度散布', subtitle: '120 条大麦观测；相同角度范围在外圈对应更长弧线' },
  en: {
    title: 'Angular jitter in Polar coordinates',
    subtitle: '120 barley observations; the same angular span traces a longer arc at larger radii',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    size: '点半径',
    opacity: '不透明度',
    span: '抖动范围比例',
    distribution: '抖动分布',
    distribution_normal: '正态',
    distribution_uniform: '均匀',
    sigma: '正态分布标准差',
    seed: '随机种子',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    size: 'Point radius',
    opacity: 'Opacity',
    span: 'Jitter span ratio',
    distribution: 'Jitter distribution',
    distribution_normal: 'Normal',
    distribution_uniform: 'Uniform',
    sigma: 'Normal sigma',
    seed: 'Random seed',
  },
} satisfies Record<Lang, Record<string, string>>;
