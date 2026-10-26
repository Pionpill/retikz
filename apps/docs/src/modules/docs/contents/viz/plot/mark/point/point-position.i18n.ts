import type { Lang } from '@/i18n';

/** 散点试验场的双语可见文案 */
export const pointPositionI18n = {
  zh: {
    scatterEncodings: '散点编码',
    data: '数据',
    pointRows: '点数据',
    coordinate: '坐标系',
    projection: '投影',
    cartesian: '笛卡尔坐标',
    polar: '极坐标',
    positionChannels: '位置通道',
    xField: 'x 字段',
    x: 'x',
    y: 'y',
    pop: 'pop',
    yField: 'y 字段',
  },
  en: {
    scatterEncodings: 'Scatter encodings',
    data: 'Data',
    pointRows: 'Point rows',
    coordinate: 'Coordinate',
    projection: 'Projection',
    cartesian: 'Cartesian',
    polar: 'Polar',
    positionChannels: 'Position channels',
    xField: 'x field',
    x: 'x',
    y: 'y',
    pop: 'pop',
    yField: 'y field',
  },
} satisfies Record<Lang, Record<string, string>>;
