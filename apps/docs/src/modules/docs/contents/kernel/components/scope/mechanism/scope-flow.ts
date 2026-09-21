import type { FlowDiagramProps } from '@retikz/diagram-react/flow';

/** Scope 原理图共用的卡片、分组与连线尺度 */
export const scopeFlowDefaults = {
  entity: { layout: { minimumSize: { width: 180, height: 66 }, lineHeight: 18 }, style: { font: { size: 14 } } },
  group: {
    padding: 18,
    cornerRadius: 4,
    background: { fill: 'none' },
    border: { stroke: 'gray', strokeOpacity: 0.35 },
    caption: { title: { font: { size: 12 }, textColor: 'gray' } },
  },
  relation: { labelFont: { size: 12 }, labelTextForeground: 'gray' },
} satisfies NonNullable<FlowDiagramProps['flowDefaults']>;

/** 标题与次行说明保持统一层级 */
export const scopeFlowText = (lines: readonly [string, ...Array<string>]) =>
  lines.map((text, index) => (index === 0 ? { text } : { text, fill: 'gray', font: { size: 12 } }));
