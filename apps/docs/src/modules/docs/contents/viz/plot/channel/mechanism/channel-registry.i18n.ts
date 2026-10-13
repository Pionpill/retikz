import type { Lang } from '@/i18n';

/** 注册表两种访问方式的双语文案 */
export const channelRegistryI18n: Record<
  Lang,
  {
    index: string;
    list: string;
    sizeLegend: string;
    opacityLegend: string;
    point: string;
    path: string;
    lookup: string;
    node: string;
    pathKind: string;
  }
> = {
  zh: {
    index: '名称索引：图例查询形态',
    list: '完整列表：图元按 kind 筛选（节选）',
    sizeLegend: '大小图例：size',
    opacityLegend: '透明度图例：ramp',
    point: '点：写入节点属性',
    path: '线：写入路径属性',
    lookup: '按名称读取 legend',
    node: '选择 node',
    pathKind: '选择 path',
  },
  en: {
    index: 'Name index: legend form lookup',
    list: 'Full list: filter by kind (excerpt)',
    sizeLegend: 'Size legend: size',
    opacityLegend: 'Opacity legend: ramp',
    point: 'Point: node properties',
    path: 'Line: path properties',
    lookup: 'Read legend by name',
    node: 'Select node',
    pathKind: 'Select path',
  },
};
