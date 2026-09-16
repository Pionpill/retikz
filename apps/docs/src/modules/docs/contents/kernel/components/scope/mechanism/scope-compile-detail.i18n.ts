import type { Lang } from '@/i18n';

export const scopeCompileDetailI18n: Record<Lang, Array<string>> = {
  zh: [
    'compileScopeChild\n准备局部上下文',
    'compileChildren\n编译子树与收集布局',
    'createIntrinsicScopeLayout\n汇总固有包络',
    'resolveFinalScopeTransforms\n解析 pivot 与 placement',
    'replaceLayout\n发布整体引用包络',
    'emitScopeGroup\n挂载裁剪与输出 Group',
  ],
  en: [
    'compileScopeChild\nPrepare local context',
    'compileChildren\nCompile and collect layouts',
    'createIntrinsicScopeLayout\nCollect intrinsic bounds',
    'resolveFinalScopeTransforms\nResolve pivot and placement',
    'replaceLayout\nPublish reference envelope',
    'emitScopeGroup\nAttach clipping and emit Group',
  ],
};
