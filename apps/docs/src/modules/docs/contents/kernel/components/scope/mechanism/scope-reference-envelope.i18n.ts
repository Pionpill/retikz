import type { Lang } from '@/i18n';

export const scopeReferenceEnvelopeI18n: Record<
  Lang,
  {
    nodes: Record<
      'layouts' | 'placeholder' | 'envelope' | 'check' | 'resolved' | 'preserve',
      readonly [string, string]
    >;
    edges: Record<'yes' | 'no', string>;
  }
> = {
  zh: {
    nodes: {
      layouts: ['汇总子树布局', '不含 Path 走线'],
      placeholder: ['读取当前条目', '父 frame · scope.id'],
      envelope: ['计算最终包络', '几何汇总 + 变换'],
      check: ['已被替换？', ''],
      resolved: ['更新原占位', 'replaceLayout'],
      preserve: ['保留子节点', '不覆盖同名条目'],
    },
    edges: { yes: '是', no: '否' },
  },
  en: {
    nodes: {
      layouts: ['Collect child layouts', 'Paths excluded'],
      placeholder: ['Read current entry', 'Parent frame · scope.id'],
      envelope: ['Compute envelope', 'Bounds + transforms'],
      check: ['Replaced?', ''],
      resolved: ['Update placeholder', 'replaceLayout'],
      preserve: ['Keep child entry', 'Do not overwrite it'],
    },
    edges: { yes: 'Yes', no: 'No' },
  },
};
