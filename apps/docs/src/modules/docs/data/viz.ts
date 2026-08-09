import type { DocPageMetadataOverride, Section } from './types';

import { DocDifficulty } from './types';

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
      { id: 'introduction', label: 'viz.introduction', difficulty: DocDifficulty.Beginner },
      { id: 'get-start', label: 'viz.getStart', difficulty: DocDifficulty.Beginner },
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
          { id: 'contract', label: 'viz.dataModelContract', difficulty: DocDifficulty.Advanced },
          { id: 'intake', label: 'viz.dataModelIntake', difficulty: DocDifficulty.Advanced },
          { id: 'validation', label: 'viz.dataModelValidation', difficulty: DocDifficulty.Advanced },
          {
            id: 'extensions',
            label: 'viz.dataModelExtensions',
            difficulty: DocDifficulty.Internals,
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
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'component',
              audience: 'user',
              capability: 'data.transform.component',
              sourceOfTruth: 'runtime',
            },
          },
          { id: 'operations', label: 'viz.dataTransformOperations', difficulty: DocDifficulty.Advanced },
          { id: 'statistics', label: 'viz.dataTransformStatistics', difficulty: DocDifficulty.Advanced },
          {
            id: 'extensions',
            label: 'viz.dataTransformExtensions',
            difficulty: DocDifficulty.Internals,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'data.transform.extensions',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'provenance',
        label: 'viz.dataProvenance',
        children: [
          {
            id: 'data',
            label: 'viz.dataProvenanceData',
            difficulty: DocDifficulty.Internals,
            meta: {
              pageType: 'concept',
              audience: 'integrator',
              capability: 'data.provenance',
              sourceOfTruth: 'runtime',
            },
          },
          {
            id: 'plot',
            label: 'viz.dataProvenancePlot',
            difficulty: DocDifficulty.Internals,
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
        id: 'reference',
        label: 'viz.dataReference',
        children: [
          { id: 'contract', label: 'viz.dataReferenceContract' },
          { id: 'runtime', label: 'viz.dataReferenceRuntime' },
        ],
      },
      {
        id: 'changelog',
        label: 'viz.changelog',
        children: [{ id: 'v0-1', label: 'viz.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'data.release',
          sourceOfTruth: 'changelog',
        },
      },
    ],
  },
  {
    id: 'chart',
    label: 'viz.chart',
    pages: [
      {
        id: 'points',
        label: 'viz.chartScatterPoints',
        icon: 'chart-scatter',
        children: [
          {
            id: 'scatter',
            label: 'viz.chartScatter',
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'concept',
              audience: 'user',
              capability: 'showcase.scatter',
              sourceOfTruth: 'docs',
              layout: 'showcase',
              showcase: {
                family: 'scatter-points',
                role: 'primary',
                preview: 'scatter-basic',
                order: 10,
              },
            },
          },
          {
            id: 'bubble',
            label: 'viz.chartBubble',
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'concept',
              audience: 'user',
              capability: 'showcase.bubble',
              sourceOfTruth: 'docs',
              layout: 'showcase',
              showcase: {
                family: 'scatter-points',
                role: 'primary',
                preview: 'bubble-basic',
                order: 20,
              },
            },
          },
        ],
        meta: {
          pageType: 'group',
          audience: 'user',
          capability: 'chart.scatter-points',
          sourceOfTruth: 'architecture',
        },
      },
    ],
  },
  {
    id: 'table',
    label: 'viz.table',
    document: true,
    pages: [
      { id: 'detail', label: 'viz.detailTable', difficulty: DocDifficulty.Beginner },
      {
        id: 'model',
        label: 'viz.tableModel',
        children: [
          { id: 'structure', label: 'viz.tableModelStructure', difficulty: DocDifficulty.Advanced },
          { id: 'presentation', label: 'viz.tableModelPresentation', difficulty: DocDifficulty.Advanced },
          { id: 'layout', label: 'viz.tableModelLayout', difficulty: DocDifficulty.Advanced },
          { id: 'manifest', label: 'viz.tableModelManifest', difficulty: DocDifficulty.Internals },
        ],
        meta: {
          pageType: 'concept',
          audience: 'integrator',
          capability: 'table.model',
          sourceOfTruth: 'runtime',
        },
      },
      {
        id: 'reference',
        label: 'viz.tableReference',
        children: [
          { id: 'contract-detail', label: 'viz.tableReferenceContractDetail' },
          { id: 'contract-table', label: 'viz.tableReferenceContractTable' },
          { id: 'contract-layout', label: 'viz.tableReferenceContractLayout' },
          { id: 'manifest', label: 'viz.tableReferenceManifest' },
          { id: 'runtime', label: 'viz.tableReferenceRuntime' },
        ],
      },
      {
        id: 'changelog',
        label: 'viz.changelog',
        children: [{ id: 'v0-1', label: 'viz.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'table.release',
          sourceOfTruth: 'changelog',
        },
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
          { id: 'binding', label: 'viz.grammarChannelBinding', difficulty: DocDifficulty.Advanced },
          { id: 'builtin', label: 'viz.grammarChannelBuiltin', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-channel',
            label: 'viz.grammarChannelCustom',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('plot.channel.extensions'),
          },
        ],
      },
      {
        id: 'transform',
        label: 'viz.grammarTransform',
        children: [
          { id: 'row', label: 'viz.grammarTransformRow', difficulty: DocDifficulty.Advanced },
          { id: 'annotation', label: 'viz.grammarTransformAnnotation', difficulty: DocDifficulty.Advanced },
          { id: 'bin', label: 'viz.grammarTransformBin', difficulty: DocDifficulty.Advanced },
          { id: 'statistics', label: 'viz.grammarTransformStatistics', difficulty: DocDifficulty.Advanced },
          { id: 'relate', label: 'viz.grammarTransformRelate', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-transform',
            label: 'viz.grammarTransformCustom',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('plot.transform.extensions'),
          },
        ],
      },
      {
        id: 'mark',
        label: 'viz.grammarMark',
        children: [
          { id: 'point', label: 'viz.compPointMark', difficulty: DocDifficulty.Beginner },
          { id: 'path', label: 'viz.compPathMark', difficulty: DocDifficulty.Beginner },
          { id: 'interval', label: 'viz.compIntervalMark', difficulty: DocDifficulty.Beginner },
          { id: 'reference', label: 'viz.compReferenceMark', difficulty: DocDifficulty.Beginner },
          { id: 'relation', label: 'viz.compRelationMark', difficulty: DocDifficulty.Beginner },
          {
            id: 'custom-mark',
            label: 'viz.grammarMarkCustom',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('plot.mark.extensions'),
          },
        ],
      },
      {
        id: 'scale',
        label: 'viz.grammarScale',
        children: [
          { id: 'position', label: 'viz.grammarScalePosition', difficulty: DocDifficulty.Advanced },
          { id: 'color', label: 'viz.grammarScaleColor', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-scale',
            label: 'viz.grammarScaleCustom',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('plot.scale.extensions'),
          },
        ],
      },
      {
        id: 'coordinate',
        label: 'viz.grammarCoordinate',
        children: [
          { id: '2d', label: 'viz.grammarCoordinate2d', difficulty: DocDifficulty.Beginner },
          { id: '1d', label: 'viz.grammarCoordinate1d', difficulty: DocDifficulty.Advanced },
          { id: 'composition', label: 'viz.grammarCoordinateComposition', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-coordinate',
            label: 'viz.grammarCoordinateCustom',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('plot.coordinate.extensions'),
          },
        ],
      },
      {
        id: 'guide',
        label: 'viz.grammarGuide',
        children: [
          { id: 'axis', label: 'viz.compAxis', difficulty: DocDifficulty.Beginner },
          { id: 'legend', label: 'viz.compLegend', difficulty: DocDifficulty.Beginner },
        ],
      },
      {
        id: 'reference',
        label: 'viz.plotReference',
        children: [
          { id: 'plot', label: 'viz.plotReferenceContractPlot' },
          { id: 'encoding', label: 'viz.plotReferenceContractEncoding' },
          { id: 'transform', label: 'viz.plotReferenceContractTransform' },
          { id: 'mark', label: 'viz.plotReferenceContractMark' },
          { id: 'scale', label: 'viz.plotReferenceContractScale' },
          { id: 'coordinate', label: 'viz.plotReferenceContractCoordinate' },
          { id: 'guide', label: 'viz.plotReferenceContractGuide' },
          { id: 'layout', label: 'viz.plotReferenceContractLayout' },
          { id: 'layer', label: 'viz.plotReferenceContractLayer' },
          { id: 'theme', label: 'viz.plotReferenceContractTheme' },
          { id: 'runtime', label: 'viz.plotReferenceRuntime' },
        ],
        meta: {
          pageType: 'reference',
          audience: 'integrator',
          capability: 'plot.contract',
          sourceOfTruth: 'schema',
        },
      },
      {
        id: 'changelog',
        label: 'viz.changelog',
        children: [
          { id: 'v0-2', label: 'viz.changelogV02' },
          { id: 'v0-1', label: 'viz.changelogV01' },
        ],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'plot.release',
          sourceOfTruth: 'changelog',
        },
      },
    ],
  },
];
