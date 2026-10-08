import type { Lang } from '@/i18n';

/** 生命周期图的双语文案 */
export const lifecycleInitialI18n: Record<Lang, Record<'n0' | 'n1' | 'n2' | 'n3' | 'n4' | 'n5', string>> = {
  zh: {
    n0: '1. 来源准备\ncapture → identities → read',
    n1: '2. 计算准备\nrun → capture\n生成私有 / 公开视图',
    n2: '3. 参与者 prepare\n取得单次提交对象',
    n3: '4. 全部 commit\n再全部 read',
    n4: '5. 初始状态就绪\nrevision 0',
    n5: '6. 通知与清理\nobserveCommit → token.dispose',
  },
  en: {
    n0: '1. Prepare Sources\ncapture → identities → read',
    n1: '2. Prepare computations\nrun → capture\nCreate private / public views',
    n2: '3. Participant prepare\nObtain transaction objects',
    n3: '4. Commit all\nThen read all',
    n4: '5. Initial state ready\nrevision 0',
    n5: '6. Notify and clean up\nobserveCommit → token.dispose',
  },
};
