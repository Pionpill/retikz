import type { DocPageMetadataOverride, Section } from './types';

/** 标记以 Definition / registry 为主线的 Plot 扩展指南。 */
const extensionGuide = (capability: string): DocPageMetadataOverride => ({
  pageType: 'extension',
  audience: 'extension-author',
  capability,
  sourceOfTruth: 'runtime',
});

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
      {
        id: 'transform',
        label: 'viz.dataTransform',
        children: [
          {
            id: 'overview',
            label: 'viz.dataTransformComponent',
            meta: {
              pageType: 'component',
              audience: 'user',
              capability: 'data.transform.component',
              sourceOfTruth: 'runtime',
            },
          },
          { id: 'operations', label: 'viz.dataTransformOperations' },
          { id: 'statistics', label: 'viz.dataTransformStatistics' },
          {
            id: 'extensions',
            label: 'viz.dataTransformExtensions',
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'data.transform.extensions',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
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
          {
            id: 'custom-channel',
            label: 'viz.grammarChannelCustom',
            meta: extensionGuide('plot.channel.extensions'),
          },
        ],
      },
      {
        id: 'transform',
        label: 'viz.grammarTransform',
        children: [
          { id: 'row', label: 'viz.grammarTransformRow' },
          { id: 'annotation', label: 'viz.grammarTransformAnnotation' },
          { id: 'bin', label: 'viz.grammarTransformBin' },
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
          {
            id: 'custom-mark',
            label: 'viz.grammarMarkCustom',
            meta: extensionGuide('plot.mark.extensions'),
          },
        ],
      },
      {
        id: 'scale',
        label: 'viz.grammarScale',
        children: [
          { id: 'position', label: 'viz.grammarScalePosition' },
          { id: 'color', label: 'viz.grammarScaleColor' },
          {
            id: 'custom-scale',
            label: 'viz.grammarScaleCustom',
            meta: extensionGuide('plot.scale.extensions'),
          },
        ],
      },
      {
        id: 'coordinate',
        label: 'viz.grammarCoordinate',
        children: [
          { id: '2d', label: 'viz.grammarCoordinate2d' },
          { id: '1d', label: 'viz.grammarCoordinate1d' },
          { id: 'composition', label: 'viz.grammarCoordinateComposition' },
          {
            id: 'custom-coordinate',
            label: 'viz.grammarCoordinateCustom',
            meta: extensionGuide('plot.coordinate.extensions'),
          },
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
        id: 'lineage',
        label: 'viz.plotLineage',
        meta: {
          pageType: 'concept',
          audience: 'integrator',
          capability: 'plot.lineage',
          sourceOfTruth: 'runtime',
        },
      },
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
