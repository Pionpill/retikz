import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const cellFigureI18n: Record<
  Lang,
  {
    cell: string;
    content: string;
    style: string;
    layout: string;
    id: string;
    priority: string;
    local: string;
    role: string;
    overall: string;
    fallback: string;
  }
> = {
  zh: {
    cell: 'Cell：一格的内容与配置',
    content: '文本 / 一个绘图子项 / 空',
    style: '背景、边框、字体',
    layout: '尺寸、内边距、溢出',
    id: '可选的格子身份',
    priority: '仅当前项缺省时向下查找',
    local: '1. 单格',
    role: '2. 键 / 值角色（Map）',
    overall: '3. 集合整体',
    fallback: '4. 字段默认',
  },
  en: {
    cell: 'Cell: content and settings',
    content: 'Text / one drawable / empty',
    style: 'Fill, border, font',
    layout: 'Size, padding, overflow',
    id: 'Optional cell identity',
    priority: 'Move down only when omitted',
    local: '1. Cell',
    role: '2. Key / value role (Map)',
    overall: '3. Collection',
    fallback: '4. Field default',
  },
};
