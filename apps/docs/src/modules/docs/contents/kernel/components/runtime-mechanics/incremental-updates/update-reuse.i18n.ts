import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['满足前提', ''],
    edge1: ['未满足', ''],
    edge2: ['输出通过', ''],
    edge3: ['输出未通过', ''],
    check: ['检查快路径', '输入、来源与输出限制'],
    local: ['单独编译 A', '检查图元身份与产物'],
    full: ['完整编译', '任一检查未通过'],
    merge: ['替换 A，复用 B', 'update 图元子树'],
    replace: ['替换完整 Scene', 'replaceScene'],
  },
  en: {
    edge0: ['Eligible', ''],
    edge1: ['Ineligible', ''],
    edge2: ['Output matches', ''],
    edge3: ['Output rejected', ''],
    check: ['Check fast path', 'Input and output guards'],
    local: ['Compile A alone', 'Check identities and output'],
    full: ['Compile complete scene', 'Any guard fails'],
    merge: ['Replace A, reuse B', 'update primitive subtree'],
    replace: ['Replace complete Scene', 'replaceScene'],
  },
};
