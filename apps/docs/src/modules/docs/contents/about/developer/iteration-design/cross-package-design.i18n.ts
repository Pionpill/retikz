import type { Lang } from '@/i18n';

/** 跨包设计关系图的本地化标签 */
export type CrossPackageDesignI18n = Readonly<{
  problem: string;
  owner: string;
  contract: string;
  extension: string;
  loop: string;
  assign: string;
  define: string;
  extend: string;
  verify: string;
}>;

/** 按文档语言获取跨包设计关系图的标签 */
export const crossPackageDesignI18n: Record<Lang, CrossPackageDesignI18n> = {
  zh: {
    problem: '问题',
    owner: 'Owner',
    contract: '原子契约',
    extension: '统一扩展路径',
    loop: '端到端闭环',
    assign: '归属',
    define: '定义',
    extend: '扩展',
    verify: '验证',
  },
  en: {
    problem: 'Problem',
    owner: 'Owner',
    contract: 'Atomic contract',
    extension: 'Shared extension path',
    loop: 'End-to-end loop',
    assign: 'assign',
    define: 'define',
    extend: 'extend',
    verify: 'verify',
  },
};
