import type { Lang } from '@/i18n';

/** 系列与标签示例的双语文案 */
export const lineSeriesI18n: Record<
  Lang,
  Record<
    | 'title'
    | 'data'
    | 'dataset'
    | 'coordinate'
    | 'projection'
    | 'cartesian'
    | 'polar'
    | 'closed'
    | 'grouping'
    | 'splitMode'
    | 'explicitSeries'
    | 'implicitColor'
    | 'singlePath'
    | 'showLabels'
    | 'labels'
    | 'position'
    | 'side'
    | 'auto'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'sloped'
    | 'interrupt'
    | 'distance',
    string
  >
> = {
  zh: {
    title: '路径系列',
    data: '数据',
    dataset: '城市气候',
    coordinate: '坐标系',
    projection: '投影',
    cartesian: '笛卡尔坐标',
    polar: '极坐标',
    closed: '是否闭合',
    grouping: '分组',
    splitMode: '拆分方式',
    explicitSeries: '显式 series',
    implicitColor: '按 color 隐式拆分',
    singlePath: '单条路径',
    showLabels: '显示系列标签',
    labels: '标签',
    position: '标签位置',
    side: '所在侧',
    auto: '自动',
    top: '上方',
    bottom: '下方',
    left: '左侧',
    right: '右侧',
    sloped: '沿路径旋转',
    interrupt: '截断路径',
    distance: '偏移距离',
  },
  en: {
    title: 'Path series',
    data: 'Data',
    dataset: 'City climate',
    coordinate: 'Coordinate',
    projection: 'Projection',
    cartesian: 'Cartesian',
    polar: 'Polar',
    closed: 'Close path',
    grouping: 'Grouping',
    splitMode: 'Split mode',
    explicitSeries: 'Explicit series',
    implicitColor: 'Implicit color split',
    singlePath: 'Single path',
    showLabels: 'Show series labels',
    labels: 'Labels',
    position: 'Label position',
    side: 'Side',
    auto: 'Auto',
    top: 'Top',
    bottom: 'Bottom',
    left: 'Left',
    right: 'Right',
    sloped: 'Follow path tangent',
    interrupt: 'Interrupt path',
    distance: 'Offset distance',
  },
};
