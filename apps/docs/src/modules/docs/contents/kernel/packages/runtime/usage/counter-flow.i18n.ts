import type { Lang } from '@/i18n';

/** 计数器接入流程图的文案 */
export const counterFlowI18n: Record<
  Lang,
  {
    define: string;
    register: string;
    create: string;
    update: string;
    read: string;
    dispose: string;
  }
> = {
  zh: {
    define: '定义来源与计算\ncounter → doubled',
    register: '注册定义\nsources + computations',
    create: '创建 Runtime · revision 0\n计数 1 → 两倍值 2',
    update: '提交更新\n新计数 2 · baseRevision 0',
    read: '读取结果 · revision 1\n计数 2 → 两倍值 4',
    dispose: '释放 Runtime\nfinally → dispose()',
  },
  en: {
    define: 'Define Source and Computation\ncounter → doubled',
    register: 'Register definitions\nsources + computations',
    create: 'Create Runtime · revision 0\nCount 1 → doubled 2',
    update: 'Submit update\nNext count 2 · baseRevision 0',
    read: 'Read results · revision 1\nCount 2 → doubled 4',
    dispose: 'Dispose Runtime\nfinally → dispose()',
  },
};
