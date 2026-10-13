import type { Lang } from '@/i18n';

/** Scope 生命周期图的文案 */
export const scopeLifecycleI18n: Record<
  Lang,
  {
    stages: Array<string>;
    envelope: Array<string>;
    map: string;
  }
> = {
  zh: {
    stages: ['1. 进入子树前', '2. 遍历子树中', '3. Scope 收尾后'],
    envelope: ['尚无子布局，包络未定', '已布局 a，包络仍未定', 'a、b 完成，包络确定'],
    map: '当前 Map',
  },
  en: {
    stages: ['1. Before children', '2. Visiting children', '3. After finalization'],
    envelope: ['No child layout; no envelope', 'a laid out; envelope pending', 'a and b laid out; envelope ready'],
    map: 'Current Map',
  },
};
