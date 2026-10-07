import type { Lang } from '@/i18n';

/** 生命周期图的双语文案 */
export const lifecycleDisposalI18n: Record<Lang, Record<'n0' | 'n1' | 'n2' | 'n3' | 'n4' | 'n5', string>> = {
  zh: {
    n0: '1. 停止更新与状态读取',
    n1: '2. 参与者逆序 dispose\n按 key 逆序',
    n2: '3. 计算结果逆序释放\n按依赖逆序',
    n3: '4. 来源逆序释放\n按注册顺序逆序',
    n4: '5. 再试失败的参与者',
    n5: '6. disposed / dispose-pending\n后者可再次 dispose',
  },
  en: {
    n0: '1. Stop updates and state reads',
    n1: '2. Dispose participants\nReverse key order',
    n2: '3. Retire computation results\nReverse dependency order',
    n3: '4. Retire Source values\nReverse registry order',
    n4: '5. Retry failed participants',
    n5: '6. disposed / dispose-pending\nRetry dispose for pending ones',
  },
};
