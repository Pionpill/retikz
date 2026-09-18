import type { Lang } from '@/i18n';

export const scopeReferenceEnvelopeI18n: Record<
  Lang,
  {
    nodes: Record<
      'placeholder' | 'check' | 'resolved' | 'layouts' | 'envelope' | 'preserve',
      readonly [string, string]
    >;
    edges: Record<'yes' | 'no', string>;
  }
> = {
  zh: {
    nodes: {
      placeholder: ['占位条目', '父 frame · scope.id'],
      check: ['已被替换？', ''],
      resolved: ['发布整体引用', 'replaceLayout'],
      layouts: ['子树布局', '不含 Path 走线'],
      envelope: ['最终包络', '几何汇总 + 变换'],
      preserve: ['保留子节点', '同名覆盖已发生'],
    },
    edges: {
      yes: '是',
      no: '否',
    },
  },
  en: {
    nodes: {
      placeholder: ['Placeholder', 'Parent frame · id'],
      check: ['Replaced?', ''],
      resolved: ['Publish bounds', 'replaceLayout'],
      layouts: ['Child layouts', 'Paths excluded'],
      envelope: ['Final envelope', 'Bounds + transforms'],
      preserve: ['Keep child entry', 'Same id replaced it'],
    },
    edges: {
      yes: 'Yes',
      no: 'No',
    },
  },
};
