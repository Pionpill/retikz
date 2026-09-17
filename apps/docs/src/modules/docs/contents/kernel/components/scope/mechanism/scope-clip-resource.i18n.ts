import type { Lang } from '@/i18n';

export const scopeClipResourceI18n: Record<
  Lang,
  {
    nodes: Record<
      'spec' | 'resolve' | 'path' | 'definitions' | 'resources' | 'children' | 'group',
      readonly [string, string]
    >;
    edges: Record<'dedup' | 'ref', string>;
  }
> = {
  zh: {
    nodes: {
      spec: ['裁剪描述', 'clip · JSON'],
      resolve: ['解析与降级', 'resolve → lower'],
      path: ['Scene 裁剪路径', '几何结果'],
      definitions: ['统一能力入口', '内置 / 自定义'],
      resources: ['资源表', '同路径复用 id'],
      children: ['子图元与变换', 'Scope 的输出'],
      group: ['Scene 分组', '子图元与裁剪同变换'],
    },
    edges: {
      dedup: '去重',
      ref: 'clipRef',
    },
  },
  en: {
    nodes: {
      spec: ['Clip spec', 'clip · JSON'],
      resolve: ['Resolve + lower', 'Clip Definition'],
      path: ['Scene clip path', 'Geometry'],
      definitions: ['Definitions', 'Built-in / custom'],
      resources: ['Resource table', 'Reuse identical paths'],
      children: ['Child output', 'With transforms'],
      group: ['Scene group', 'Transform both'],
    },
    edges: {
      dedup: 'Deduplicate',
      ref: 'clipRef',
    },
  },
};
