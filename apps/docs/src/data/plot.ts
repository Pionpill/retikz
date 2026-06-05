import type { Section } from './interface';

/** plot module 的 sections + pages 树（顺序：简介 / 快速开始 / 图表 / 绘图 / 图形语法 / 参考） */
export const plotSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'plot.introduction' },
      { id: 'get-start', label: 'plot.getStart' },
    ],
  },
  {
    id: 'examples',
    label: 'plot.examples',
    pages: [{ id: 'line-scatter', label: 'plot.exampleLineScatter' }],
  },
  {
    id: 'components',
    label: 'plot.components',
    pages: [
      { id: 'plot', label: 'plot.compPlot' },
      {
        id: 'mark',
        label: 'plot.compMark',
        children: [
          { id: 'overview', label: 'plot.compMarkOverview' },
          { id: 'line', label: 'plot.compLineMark' },
          { id: 'point', label: 'plot.compPointMark' },
          { id: 'bar', label: 'plot.compBarMark' },
        ],
      },
      { id: 'axis', label: 'plot.compAxis' },
    ],
  },
  {
    id: 'grammar',
    label: 'plot.grammar',
    pages: [
      { id: 'data', label: 'plot.grammarData' },
      { id: 'scale', label: 'plot.grammarScale' },
      { id: 'coordinate', label: 'plot.grammarCoordinate' },
      { id: 'mark', label: 'plot.grammarMark' },
      { id: 'guide', label: 'plot.grammarGuide' },
    ],
  },
  {
    id: 'reference',
    label: 'plot.reference',
    pages: [
      { id: 'plot-ir', label: 'plot.refPlotIr' },
      { id: 'lowering', label: 'plot.refLowering' },
    ],
  },
];
