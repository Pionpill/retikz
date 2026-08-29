import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { GAPMINDER_BUBBLE_YEAR, gapminderBubbleData } from './bubble-basic.data';

/** 基础 Bubble playground 的稳定控件 id */
export const BUBBLE_BASIC_CONTROL_IDS = {
  pointFillEnabled: 'bubble-basic-point-fill-enabled',
  pointFill: 'bubble-basic-point-fill',
  pointStrokeEnabled: 'bubble-basic-point-stroke-enabled',
  pointStroke: 'bubble-basic-point-stroke',
  pointShape: 'bubble-basic-point-shape',
  pointFillOpacity: 'bubble-basic-point-fill-opacity',
} as const;

/** 基础 Bubble 的中文控制面板 */
export const bubbleBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '基础气泡图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${GAPMINDER_BUBBLE_YEAR} 年国家截面`,
          rows: gapminderBubbleData,
          columns: [
            { key: 'country', label: '国家或地区' },
            { key: 'continent', label: '洲' },
            { key: 'gdpPerCapita', label: '人均 GDP' },
            { key: 'lifeExpectancy', label: '预期寿命' },
            { key: 'population', label: '人口' },
          ],
        },
      ],
    },
    {
      label: '气泡',
      controls: [
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled,
          label: '填充',
          defaultValue: false,
        },
        {
          kind: 'color',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFill,
          label: '填充色',
          defaultValue: 'currentColor',
          visibleWhen: { controlId: BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled, oneOf: [true] },
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled,
          label: '描边',
          defaultValue: false,
        },
        {
          kind: 'color',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStroke,
          label: '描边色',
          defaultValue: 'currentColor',
          visibleWhen: { controlId: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled, oneOf: [true] },
        },
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.pointShape,
          label: '形状',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: '圆形' },
            { value: 'rectangle', label: '矩形' },
            { value: 'ellipse', label: '椭圆形' },
            { value: 'diamond', label: '菱形' },
          ],
        },
        {
          kind: 'range',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity,
          label: '填充不透明度',
          defaultValue: 0.7,
          min: 0.3,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 基础 Bubble 的稳定文档契约 */
export const previewControlContract = {
  controls: bubbleBasicControls,
  canonicalValues: {
    [BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointFill]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity]: 0.7,
  },
  relatedApis: [
    'BubbleEncodings.x',
    'BubbleEncodings.y',
    'BubbleEncodings.size',
    'BubbleProperties.fill',
    'BubbleProperties.stroke',
    'BubbleProperties.shape',
    'BubbleProperties.fillOpacity',
  ],
} satisfies PreviewControlContract;
