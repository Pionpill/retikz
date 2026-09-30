import type { Lang } from '@/i18n';

/** 图形模型主流程的双语节点文案 */
export const chartModelPipelineI18n: Record<
  Lang,
  {
    source: string;
    resolve: string;
    marks: string;
    output: string;
  }
> = {
  zh: {
    source: '精确 Chart Source',
    resolve: 'Schema + recipe',
    marks: 'Chart 图元',
    output: 'Plot + Surface',
  },
  en: {
    source: 'Exact Chart Source',
    resolve: 'Schema + recipe',
    marks: 'Chart marks',
    output: 'Plot + Surface',
  },
};
