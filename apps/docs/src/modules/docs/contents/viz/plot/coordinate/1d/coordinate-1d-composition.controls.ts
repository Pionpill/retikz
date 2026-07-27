import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { coordinate1DCompositionRows } from './coordinate-1d-composition.zh.data';

/** 一维映射组合 playground 的稳定控件 id */
export const COORDINATE_1D_COMPOSITION_CONTROL_IDS = {
  sourcePointSize: 'sourcePointSize',
  sourceLabelVisible: 'sourceLabelVisible',
  sourceLabelSize: 'sourceLabelSize',
  sourceLabelRotate: 'sourceLabelRotate',
  sourceLabelDistance: 'sourceLabelDistance',
  targetPointSize: 'targetPointSize',
  targetLabelVisible: 'targetLabelVisible',
  targetLabelSize: 'targetLabelSize',
  routing: 'routing',
  bendDirection: 'bendDirection',
  bendAngle: 'bendAngle',
  orthogonalVia: 'orthogonalVia',
  relationStrokeWidth: 'relationStrokeWidth',
  relationOpacity: 'relationOpacity',
  axisVisible: 'axisVisible',
  axisStroke: 'axisStroke',
  axisStrokeWidth: 'axisStrokeWidth',
} as const;

/** 一维映射后二次组合的中文控件 */
export const coordinate1DCompositionControls = definePreviewControls({
  presentation: 'panel',
  title: '映射后的组合',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '节点与关系',
          rows: coordinate1DCompositionRows,
          columns: [
            { key: 'thingLabel', label: '来源节点' },
            { key: 'practiceLabel', label: '汇聚目标' },
            { key: 'relationColor', label: '分组色' },
          ],
        },
      ],
    },
    {
      label: '节点与标签',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize,
          label: '来源点尺寸',
          defaultValue: 8,
          min: 5,
          max: 16,
          step: 1,
        },
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
          label: '显示来源标签',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize,
          label: '来源标签字号',
          defaultValue: 10,
          min: 8,
          max: 16,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate,
          label: '来源标签角度',
          defaultValue: -38,
          min: -90,
          max: 0,
          step: 2,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance,
          label: '来源标签距离',
          defaultValue: 8,
          min: 2,
          max: 20,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize,
          label: '目标点尺寸',
          defaultValue: 18,
          min: 12,
          max: 30,
          step: 1,
        },
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible,
          label: '显示目标标签',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize,
          label: '目标标签字号',
          defaultValue: 12,
          min: 9,
          max: 18,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible,
            oneOf: [true],
          },
        },
      ],
    },
    {
      label: '连接',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
          label: '连接方式',
          defaultValue: 'bend',
          options: [
            { value: 'bend', label: '弯曲' },
            { value: 'line', label: '直线' },
            { value: 'orthogonal', label: '正交折线' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection,
          label: '弯曲方向',
          defaultValue: 'left',
          options: [
            { value: 'left', label: '左侧' },
            { value: 'right', label: '右侧' },
          ],
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['bend'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle,
          label: '弯曲角度',
          defaultValue: 18,
          min: 5,
          max: 60,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['bend'],
          },
        },
        {
          kind: 'select',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia,
          label: '折线方向',
          defaultValue: '-|',
          options: [
            { value: '-|', label: '先横后纵' },
            { value: '|-', label: '先纵后横' },
          ],
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing,
            oneOf: ['orthogonal'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth,
          label: '连接线宽',
          defaultValue: 1.2,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity,
          label: '连接透明度',
          defaultValue: 0.42,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '坐标轴',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
          label: '显示坐标轴',
          defaultValue: true,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke,
          label: '轴线颜色',
          defaultValue: '#64748b',
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth,
          label: '轴线宽度',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: {
            controlId: COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** 一维映射后二次组合的稳定文档契约 */
export const previewControlContract = {
  controls: coordinate1DCompositionControls,
  canonicalValues: {
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize]: 8,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize]: 10,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate]: -38,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance]: 8,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize]: 18,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize]: 12,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing]: 'bend',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection]: 'left',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle]: 18,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia]: '-|',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth]: 1.2,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity]: 0.42,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible]: true,
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke]: '#64748b',
    [COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth]: 1,
  },
  relatedApis: [
    'PointMark.anchorId',
    'PointMark.size',
    'PointMark.label',
    'PointMark.labelFont',
    'PointMark.labelRotate',
    'PointMark.labelDistance',
    'PointMark.font',
    'RelationMark.source',
    'RelationMark.target',
    'RelationMark.path',
    'RelationMark.style',
    'Axis.line',
  ],
} satisfies PreviewControlContract;
