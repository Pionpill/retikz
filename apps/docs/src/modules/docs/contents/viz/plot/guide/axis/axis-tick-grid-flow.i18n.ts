/** 流程图双语文案 */
export const axisTickGridFlowI18n = {
  zh: {
    source: '刻度来源\nvalues > interval > count',
    candidate: '候选刻度\n比例尺域内的位置',
    visible: '筛选可见刻度\nticks.density',
    grid: '选择主网格来源\n复用刻度或 grid.ticks',
    major: '主网格位置\n抽稀、端点与投影去重',
    minor: '次网格位置\ngrid.minor.ticks，再排除重合',
  },
  en: {
    source: 'Tick source\nvalues > interval > count',
    candidate: 'Candidate ticks\nPositions in the scale domain',
    visible: 'Select visible ticks\nticks.density',
    grid: 'Select major grid source\nReuse ticks or grid.ticks',
    major: 'Major grid positions\nDensity, ends, deduplication',
    minor: 'Minor grid positions\ngrid.minor.ticks; remove overlaps',
  },
} as const;
