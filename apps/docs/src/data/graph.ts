import type { Section } from './interface';

/** graph module sections + pages tree. */
export const graphSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'graph.introduction' },
      { id: 'get-start', label: 'graph.getStart' },
    ],
  },
  {
    id: 'examples',
    label: 'graph.examples',
    pages: [{ id: 'line-scatter', label: 'graph.exampleLineScatter' }],
  },
  {
    id: 'components',
    label: 'graph.components',
    pages: [{ id: 'plot', label: 'graph.compPlot' }],
  },
  {
    id: 'grammar',
    label: 'graph.grammar',
    pages: [
      {
        id: 'data',
        label: 'graph.data',
        children: [
          { id: 'model', label: 'graph.dataModel' },
          { id: 'processing', label: 'graph.dataProcessing' },
        ],
      },
      {
        id: 'channel',
        label: 'graph.grammarChannel',
        children: [
          { id: 'binding', label: 'graph.grammarChannelBinding' },
          { id: 'builtin', label: 'graph.grammarChannelBuiltin' },
        ],
      },
      {
        id: 'transform',
        label: 'graph.grammarTransform',
        children: [
          { id: 'row', label: 'graph.grammarTransformRow' },
          { id: 'annotation', label: 'graph.grammarTransformAnnotation' },
          { id: 'summary', label: 'graph.grammarTransformSummary' },
          { id: 'statistics', label: 'graph.grammarTransformStatistics' },
          { id: 'relate', label: 'graph.grammarTransformRelate' },
        ],
      },
      {
        id: 'mark',
        label: 'graph.grammarMark',
        children: [
          { id: 'point', label: 'graph.compPointMark' },
          { id: 'path', label: 'graph.compPathMark' },
          { id: 'interval', label: 'graph.compIntervalMark' },
          { id: 'reference', label: 'graph.compReferenceMark' },
          { id: 'relation', label: 'graph.compRelationMark' },
        ],
      },
      {
        id: 'scale',
        label: 'graph.grammarScale',
        children: [
          { id: 'position', label: 'graph.grammarScalePosition' },
          { id: 'color', label: 'graph.grammarScaleColor' },
        ],
      },
      {
        id: 'coordinate',
        label: 'graph.grammarCoordinate',
        children: [
          { id: '2d', label: 'graph.grammarCoordinate2d' },
          { id: '1d', label: 'graph.grammarCoordinate1d' },
          { id: 'ternary', label: 'graph.grammarCoordinateTernary' },
        ],
      },
      {
        id: 'guide',
        label: 'graph.grammarGuide',
        children: [
          { id: 'axis', label: 'graph.compAxis' },
          { id: 'legend', label: 'graph.compLegend' },
        ],
      },
      { id: 'provenance', label: 'graph.grammarProvenance' },
      {
        id: 'extend',
        label: 'graph.grammarExtend',
        children: [
          { id: 'data', label: 'graph.grammarExtendData' },
          { id: 'channel', label: 'graph.grammarExtendChannel' },
          { id: 'transform', label: 'graph.grammarExtendTransform' },
          { id: 'mark', label: 'graph.grammarExtendMark' },
          { id: 'scale', label: 'graph.grammarExtendScale' },
          { id: 'coordinate', label: 'graph.grammarExtendCoordinate' },
        ],
      },
    ],
  },
  {
    id: 'reference',
    label: 'graph.reference',
    pages: [
      { id: 'plot-ir', label: 'graph.refPlotIr' },
      { id: 'lowering', label: 'graph.refLowering' },
    ],
  },
  {
    id: 'releases',
    label: 'graph.releases',
    pages: [
      {
        id: 'changelog',
        label: 'graph.changelog',
        children: [{ id: 'v0-1', label: 'graph.changelogV01' }],
      },
    ],
  },
];
