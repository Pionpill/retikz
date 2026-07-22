import type { Section } from './types';

/** viz module sections + pages tree. */
export const vizSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'viz.introduction' },
      { id: 'get-start', label: 'viz.getStart' },
    ],
  },
  {
    id: 'data',
    label: 'viz.data',
    document: true,
    pages: [
      {
        id: 'model',
        label: 'viz.dataModel',
        children: [
          { id: 'contract', label: 'viz.dataModelContract' },
          { id: 'intake', label: 'viz.dataModelIntake' },
          { id: 'validation', label: 'viz.dataModelValidation' },
          {
            id: 'extensions',
            label: 'viz.dataModelExtensions',
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'data.extensions',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      { id: 'transform', label: 'viz.dataTransform' },
      { id: 'provenance', label: 'viz.dataProvenance' },
    ],
  },
  {
    id: 'table',
    label: 'viz.table',
    document: true,
    pages: [
      { id: 'detail', label: 'viz.detailTable' },
      { id: 'model', label: 'viz.tableModel' },
      {
        id: 'reference',
        label: 'viz.tableReference',
        children: [
          { id: 'contract-table', label: 'viz.tableReferenceContractTable' },
          { id: 'contract-detail', label: 'viz.tableReferenceContractDetail' },
          { id: 'runtime', label: 'viz.tableReferenceRuntime' },
        ],
      },
    ],
  },
  {
    id: 'plot',
    label: 'viz.drawingGrammar',
    document: true,
    pages: [
      {
        id: 'channel',
        label: 'viz.grammarChannel',
        children: [
          { id: 'binding', label: 'viz.grammarChannelBinding' },
          { id: 'builtin', label: 'viz.grammarChannelBuiltin' },
        ],
      },
      {
        id: 'transform',
        label: 'viz.grammarTransform',
        children: [
          { id: 'row', label: 'viz.grammarTransformRow' },
          { id: 'annotation', label: 'viz.grammarTransformAnnotation' },
          { id: 'summary', label: 'viz.grammarTransformSummary' },
          { id: 'statistics', label: 'viz.grammarTransformStatistics' },
          { id: 'relate', label: 'viz.grammarTransformRelate' },
        ],
      },
      {
        id: 'mark',
        label: 'viz.grammarMark',
        children: [
          { id: 'point', label: 'viz.compPointMark' },
          { id: 'path', label: 'viz.compPathMark' },
          { id: 'interval', label: 'viz.compIntervalMark' },
          { id: 'reference', label: 'viz.compReferenceMark' },
          { id: 'relation', label: 'viz.compRelationMark' },
        ],
      },
      {
        id: 'scale',
        label: 'viz.grammarScale',
        children: [
          { id: 'position', label: 'viz.grammarScalePosition' },
          { id: 'color', label: 'viz.grammarScaleColor' },
        ],
      },
      {
        id: 'coordinate',
        label: 'viz.grammarCoordinate',
        children: [
          { id: '2d', label: 'viz.grammarCoordinate2d' },
          { id: '1d', label: 'viz.grammarCoordinate1d' },
          { id: 'ternary', label: 'viz.grammarCoordinateTernary' },
          { id: 'composition', label: 'viz.grammarCoordinateComposition' },
        ],
      },
      {
        id: 'guide',
        label: 'viz.grammarGuide',
        children: [
          { id: 'axis', label: 'viz.compAxis' },
          { id: 'legend', label: 'viz.compLegend' },
        ],
      },
      {
        id: 'extend',
        label: 'viz.grammarExtend',
        children: [
          { id: 'channel', label: 'viz.grammarExtendChannel' },
          { id: 'mark', label: 'viz.grammarExtendMark' },
          { id: 'scale', label: 'viz.grammarExtendScale' },
          { id: 'coordinate', label: 'viz.grammarExtendCoordinate' },
        ],
      },
    ],
  },
  {
    id: 'examples',
    label: 'viz.examples',
    pages: [{ id: 'iteration', label: 'viz.exampleIteration' }],
  },
  {
    id: 'reference',
    label: 'viz.reference',
    pages: [
      { id: 'plot-ir', label: 'viz.refPlotIr' },
      { id: 'lowering', label: 'viz.refLowering' },
    ],
  },
  {
    id: 'releases',
    label: 'viz.releases',
    pages: [
      {
        id: 'changelog',
        label: 'viz.changelog',
        children: [{ id: 'v0-1', label: 'viz.changelogV01' }],
      },
    ],
  },
];
