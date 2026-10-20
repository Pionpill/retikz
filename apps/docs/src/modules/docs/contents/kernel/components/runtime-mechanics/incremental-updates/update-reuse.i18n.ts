import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['基础元素', ''],
    edge1: ['含 Composite', ''],
    edge2: ['编译成功', ''],
    check: ['选择编译入口', '按输入元素类别'],
    local: ['构建 Weave', 'Core 单元素编译'],
    full: ['Core 完整准备', '保留 Composite 语义'],
    merge: ['新树与完整输出', 'replaceScene'],
    replace: ['替换完整 Scene', 'replaceScene'],
  },
  en: {
    edge0: ['Basic elements', ''],
    edge1: ['Contains Composite', ''],
    edge2: ['Prepared', ''],
    check: ['Choose preparation', 'By input element kinds'],
    local: ['Build Weave', 'Core element compilation'],
    full: ['Core full preparation', 'Preserve Composite semantics'],
    merge: ['New tree and output', 'replaceScene'],
    replace: ['Replace complete Scene', 'replaceScene'],
  },
};
