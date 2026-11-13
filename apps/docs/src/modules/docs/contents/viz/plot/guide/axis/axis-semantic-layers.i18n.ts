/** 流程图双语文案 */
export const axisSemanticLayersI18n = {
  zh: {
    axis: '坐标轴配置\nline · ticks · labels · grid',
    split: '分别生成图层\n轴与网格独立',
    grid: '网格层\nzIndex = -300',
    line: '坐标轴层\nzIndex = 200，可覆盖',
  },
  en: {
    axis: 'Axis configuration\nline · ticks · labels · grid',
    split: 'Build separate layers\nAxes and grids are independent',
    grid: 'Grid layer\nzIndex = -300',
    line: 'Axis layer\nzIndex = 200, overridable',
  },
} as const;
