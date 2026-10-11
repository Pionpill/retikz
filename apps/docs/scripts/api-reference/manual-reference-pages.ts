/** 手写精选参考的公开入口与 Schema 配对；成员契约仍来自源码 */
export const manualReferencePages: ReadonlyArray<{
  owner: string;
  embedded: boolean;
  title: { zh: string; en: string };
  hints: ReadonlyArray<string>;
  members: ReadonlyArray<string>;
  pairs: Readonly<Record<string, string>>;
}> = [
  {
    owner: 'viz/chart/points/bubble',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      BubbleEncodings: 'BubbleChartEncodingsSchema',
      BubbleProperties: 'BubbleChartPropertiesSchema',
      BubbleMark: 'BubbleChartMarkSchema',
    },
  },
  {
    owner: 'viz/chart/points/connected-scatter',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      ConnectedScatterEncodings: 'ConnectedScatterChartEncodingsSchema',
      ConnectedScatterProperties: 'ConnectedScatterChartPropertiesSchema',
      ConnectedScatterMark: 'ConnectedScatterChartMarkSchema',
    },
  },
  {
    owner: 'viz/chart/points/ranged-dot',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      RangedDotEncodings: 'RangedDotChartEncodingsSchema',
      RangedDotProperties: 'RangedDotChartPropertiesSchema',
      RangedDotMark: 'RangedDotChartMarkSchema',
    },
  },
  {
    owner: 'viz/chart/points/regression',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      RegressionEncodings: 'RegressionChartEncodingsSchema',
      RegressionProperties: 'RegressionChartPropertiesSchema',
      RegressionMark: 'RegressionChartMarkSchema',
    },
  },
  {
    owner: 'viz/chart/points/scatter',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      ScatterEncodings: 'ScatterChartEncodingsSchema',
      ScatterProperties: 'ScatterChartPropertiesSchema',
      ScatterMark: 'ScatterChartMarkSchema',
    },
  },
  {
    owner: 'viz/chart/points/strip',
    embedded: true,
    title: {
      zh: '图形配置',
      en: 'Chart configuration',
    },
    hints: ['packages/viz/chart/src/', 'packages/viz/chart-react/src/'],
    members: [],
    pairs: {
      StripEncodings: 'StripChartEncodingsSchema',
      StripProperties: 'StripChartPropertiesSchema',
      StripMark: 'StripChartMarkSchema',
    },
  },
];
