import type { Lang } from '@/i18n';

export const scopeClipResourceI18n: Record<
  Lang,
  {
    stages: readonly [string, string];
    nodes: Record<'resolve' | 'lower' | 'store' | 'assemble', readonly [string, string, string]>;
  }
> = {
  zh: {
    stages: ['生成裁剪几何 · 内置 / 自定义共用入口', '保存资源并组装 Scene'],
    nodes: {
      resolve: ['解析裁剪描述', 'clip · JSON', 'Clip Definition.resolve'],
      lower: ['生成 Scene 路径', '已解析的裁剪形状 → 路径', 'Clip Definition.lower'],
      store: ['登记裁剪资源', 'Scene.resources', '相同路径复用同一 id'],
      assemble: ['组装 Scene 分组', 'clipRef + children + transforms', '子图元与裁剪共享变换'],
    },
  },
  en: {
    stages: ['Clip geometry · Built-in / custom entry', 'Resources and Scene output'],
    nodes: {
      resolve: ['Resolve clip spec', 'clip · JSON', 'Clip Definition.resolve'],
      lower: ['Produce Scene path', 'Resolved clip shape → path', 'Clip Definition.lower'],
      store: ['Register clip resource', 'Scene.resources', 'Identical paths share an id'],
      assemble: ['Assemble Scene group', 'clipRef + children + transforms', 'Children and clip share transforms'],
    },
  },
};
