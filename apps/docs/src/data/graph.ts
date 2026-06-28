import type { Section } from './interface';

/** graph module sections + pages tree. */
export const graphSection: Array<Section> = [
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
    pages: [{ id: 'plot', label: 'plot.compPlot' }],
  },
  {
    id: 'grammar',
    label: 'plot.grammar',
    pages: [
      {
        id: 'data',
        label: 'plot.data',
        children: [
          { id: 'model', label: 'plot.dataModel' },
          { id: 'processing', label: 'plot.dataProcessing' },
        ],
      },
      {
        id: 'channel',
        label: 'plot.grammarChannel',
        children: [
          { id: 'binding', label: 'plot.grammarChannelBinding' },
          { id: 'builtin', label: 'plot.grammarChannelBuiltin' },
        ],
      },
      {
        id: 'transform',
        label: 'plot.grammarTransform',
        children: [
          { id: 'row', label: 'plot.grammarTransformRow' },
          { id: 'annotation', label: 'plot.grammarTransformAnnotation' },
          { id: 'summary', label: 'plot.grammarTransformSummary' },
          { id: 'statistics', label: 'plot.grammarTransformStatistics' },
          { id: 'relate', label: 'plot.grammarTransformRelate' },
        ],
      },
      {
        id: 'mark',
        label: 'plot.grammarMark',
        children: [
          { id: 'point', label: 'plot.compPointMark' },
          { id: 'path', label: 'plot.compPathMark' },
          { id: 'interval', label: 'plot.compIntervalMark' },
          { id: 'reference', label: 'plot.compReferenceMark' },
          { id: 'relation', label: 'plot.compRelationMark' },
        ],
      },
      {
        id: 'scale',
        label: 'plot.grammarScale',
        children: [
          { id: 'position', label: 'plot.grammarScalePosition' },
          { id: 'color', label: 'plot.grammarScaleColor' },
        ],
      },
      {
        id: 'coordinate',
        label: 'plot.grammarCoordinate',
        children: [
          { id: '2d', label: 'plot.grammarCoordinate2d' },
          { id: '1d', label: 'plot.grammarCoordinate1d' },
          { id: 'ternary', label: 'plot.grammarCoordinateTernary' },
        ],
      },
      {
        id: 'guide',
        label: 'plot.grammarGuide',
        children: [
          { id: 'axis', label: 'plot.compAxis' },
          { id: 'legend', label: 'plot.compLegend' },
        ],
      },
      { id: 'provenance', label: 'plot.grammarProvenance' },
      {
        id: 'extend',
        label: 'plot.grammarExtend',
        children: [
          { id: 'data', label: 'plot.grammarExtendData' },
          { id: 'channel', label: 'plot.grammarExtendChannel' },
          { id: 'transform', label: 'plot.grammarExtendTransform' },
          { id: 'mark', label: 'plot.grammarExtendMark' },
          { id: 'scale', label: 'plot.grammarExtendScale' },
          { id: 'coordinate', label: 'plot.grammarExtendCoordinate' },
        ],
      },
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
  {
    id: 'releases',
    label: 'plot.releases',
    pages: [
      {
        id: 'changelog',
        label: 'plot.changelog',
        children: [{ id: 'v0-1', label: 'plot.changelogV01' }],
      },
    ],
  },
];
