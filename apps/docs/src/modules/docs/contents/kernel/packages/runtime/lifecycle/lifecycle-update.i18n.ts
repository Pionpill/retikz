import type { Lang } from '@/i18n';

/** 生命周期图的双语文案 */
export const lifecycleUpdateI18n: Record<Lang, Record<'n0' | 'n1' | 'n2' | 'n3' | 'n4' | 'n5', string>> = {
  zh: {
    n0: '1. 检查版本与命令\nbaseRevision = 0',
    n1: '2. 准备并比较来源\nA: 1 → 3，B: 2 → 2',
    n2: '3. 执行受影响计算\nA: 2 → 6，B: 4 → 4',
    n3: '4. 参与者暂存与提交\n显示 2,4 → 6,4',
    n4: '5. 发布全部读取状态\nrevision 0 → 1',
    n5: '6. 通知并清理旧资源\n已发布状态保持有效',
  },
  en: {
    n0: '1. Check revision / commands\nbaseRevision = 0',
    n1: '2. Prepare / compare Sources\nA: 1 → 3, B: 2 → 2',
    n2: '3. Execute affected work\nA: 2 → 6, B: 4 → 4',
    n3: '4. Stage / commit participants\nDisplay 2,4 → 6,4',
    n4: '5. Publish all read state\nrevision 0 → 1',
    n5: '6. Notify / retire old resources\nPublished state remains valid',
  },
};
