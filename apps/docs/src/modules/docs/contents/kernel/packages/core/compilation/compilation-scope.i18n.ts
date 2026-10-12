import type { Lang } from '@/i18n';

/** Scope 递归流程图的双语文案 */
export const compilationScopeI18n: Record<
  Lang,
  Record<'enter' | 'namespace' | 'children' | 'layout' | 'paths' | 'return', string>
> = {
  zh: {
    enter: '进入 Scope\n在父级注册 Scope id',
    namespace: '准备子上下文\n按 localNamespace 入栈',
    children: '递归处理 children\nNode 布局 · Path 排队',
    layout: '完成 Scope 布局\n确定边界与最终定位',
    paths: '处理本层待解析路径\n此时局部名称仍可查询',
    return: '弹出局部命名帧（若有）\n交付 Group，继续父级遍历',
  },
  en: {
    enter: 'Enter Scope\nRegister its id in parent',
    namespace: 'Prepare child context\nPush if localNamespace',
    children: 'Recurse into children\nLayout nodes · queue paths',
    layout: 'Finalize Scope layout\nBounds and final position',
    paths: 'Resolve queued paths\nLocal names still available',
    return: 'Pop local frame (if any)\nEmit Group, resume parent',
  },
};
