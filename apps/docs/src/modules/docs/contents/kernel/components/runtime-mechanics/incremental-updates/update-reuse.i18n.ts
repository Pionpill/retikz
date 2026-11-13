import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['incremental: true', ''],
    edge1: ['incremental: false', ''],
    edge2: ['编译成功', ''],
    check: ['编译模式', '包含基础元素与 Composite'],
    local: ['构建 Weave', '保留实际阶段产物'],
    full: ['一次性工作区', '完成后释放阶段结果'],
    merge: ['新树与完整输出', 'replaceScene'],
    replace: ['替换完整 Scene', 'replaceScene'],
  },
  en: {
    edge0: ['incremental: true', ''],
    edge1: ['incremental: false', ''],
    edge2: ['Prepared', ''],
    check: ['Compilation mode', 'Basic elements and Composites'],
    local: ['Build Weave', 'Retain actual stage products'],
    full: ['One-shot workspace', 'Release stage results after output'],
    merge: ['New tree and output', 'replaceScene'],
    replace: ['Replace complete Scene', 'replaceScene'],
  },
};
