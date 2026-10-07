import type { Lang } from '@/i18n';

/** 主题关系图的双语文案 */
export const computationOutcomesI18n: Record<
  Lang,
  {
    update: string;
    incremental: string;
    bailout: string;
    fallback: string;
    capture: string;
    reuse: string;
    run: string;
    result: string;
  }
> = {
  zh: {
    update: 'update\n已确定需要执行',
    incremental: 'incremental\n带完整新 result',
    bailout: 'bailout\n不带 result',
    fallback: 'fallback\n不带 result',
    capture: '捕获新结果\n继续触发下游',
    reuse: '复用旧结果\n此路径停止传播',
    run: '调用 run 重算\n返回 full + result',
    result: '完整的新结果',
  },
  en: {
    update: 'update\nSelected for execution',
    incremental: 'incremental\nComplete new result',
    bailout: 'bailout\nNo result field',
    fallback: 'fallback\nNo result field',
    capture: 'Capture new result\nTrigger downstream',
    reuse: 'Reuse old result\nStop this path',
    run: 'Recompute with run\nReturn full + result',
    result: 'Complete new result',
  },
};
