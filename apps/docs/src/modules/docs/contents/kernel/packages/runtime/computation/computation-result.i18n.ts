import type { Lang } from '@/i18n';

/** 主题关系图的双语文案 */
export const computationResultI18n: Record<
  Lang,
  { input: string; owned: string; private: string; public: string; next: string; readers: string }
> = {
  zh: {
    input: 'run / update\n返回 result 数据',
    owned: 'capture\n内部结果',
    private: 'readForComputation\n私有视图',
    public: 'read\n公开视图',
    next: '本计算下次 update\nprevious',
    readers: '下游 view.result\n宿主 runtime.result\nobserveCommit 事件',
  },
  en: {
    input: 'run / update\nReturn result data',
    owned: 'capture\nOwned result',
    private: 'readForComputation\nPrivate view',
    public: 'read\nPublic view',
    next: 'Next local update\nprevious',
    readers: 'Downstream view.result\nHost runtime.result\nobserveCommit event',
  },
};
