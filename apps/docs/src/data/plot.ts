import type { Section } from './interface';

/** plot module sections + pages tree. */
export const plotSection: Array<Section> = [
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
          { id: 'channel', label: 'plot.dataChannel' },
        ],
      },
      {
        id: 'transform',
        label: 'plot.grammarTransform',
        children: [
          { id: 'row', label: 'plot.grammarTransformRow' },
          { id: 'group', label: 'plot.grammarTransformGroup' },
        ],
      },
      {
        id: 'mark',
        label: 'plot.grammarMark',
        children: [
          { id: 'point', label: 'plot.compPointMark' },
          { id: 'path', label: 'plot.compPathMark' },
          { id: 'region', label: 'plot.compRegionMark' },
          { id: 'interval', label: 'plot.compIntervalMark' },
          { id: 'reference', label: 'plot.compReferenceMark' },
          { id: 'link', label: 'plot.compLinkMark' },
          { id: 'registry', label: 'plot.compMarkRegistry' },
        ],
      },
      { id: 'scale', label: 'plot.grammarScale' },
      {
        id: 'coordinate',
        label: 'plot.grammarCoordinate',
        children: [
          { id: '2d', label: 'plot.grammarCoordinate2d' },
          { id: '1d', label: 'plot.grammarCoordinate1d' },
          { id: 'ternary', label: 'plot.grammarCoordinateTernary' },
          { id: 'custom', label: 'plot.grammarCoordinateCustom' },
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
