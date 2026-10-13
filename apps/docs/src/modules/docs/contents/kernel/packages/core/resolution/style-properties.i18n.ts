/** 属性解析图的双语文案 */
export const stylePropertiesI18n = {
  zh: {
    input: '合并后的有效样式',
    base: '基准样式属性\ncolor',
    explicit: '直接样式属性\n保留已有的属性值',
    fallback: 'Node 用 color 补齐缺省值\nfill · stroke · textColor',
    result: '各绘制部分的有效属性\n进入后续解析',
  },
  en: {
    input: 'Merged effective styles',
    base: 'Base style property\ncolor',
    explicit: 'Direct style properties\nKeep existing values',
    fallback: 'Node fills missing values with color\nfill · stroke · textColor',
    result: 'Effective drawing properties\nContinue resolution',
  },
};
