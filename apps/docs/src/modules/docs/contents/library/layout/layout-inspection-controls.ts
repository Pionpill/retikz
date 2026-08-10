import type { BaseLayoutInspectOptions } from '@retikz/layout/inspect';

import type { PreviewControlContract } from '@/modules/docs/preview';

type PreviewControlValues = PreviewControlContract['canonicalValues'];
type PreviewControlPreset = NonNullable<PreviewControlContract['presets']>[number];

/** 单个布局 family 的辅助层开关配置 */
export type LayoutInspectionFamilyControl<TOption extends string = string> = Readonly<{
  id: string;
  option: TOption;
  label: string;
  recommended: boolean;
}>;

/** 布局辅助层 controls 的本地化文案 */
export type LayoutInspectionControlLabels = Readonly<{
  details: string;
  container: string;
  content: string;
  padding: string;
  slot: string;
  margin: string;
  allocation: string;
  visual: string;
  overflow: string;
  alignmentGuides: string;
  labels: string;
  preset: string;
  custom: string;
  recommended: string;
  all: string;
  off: string;
}>;

type LayoutInspectionControlConfig<TOption extends string> = Readonly<{
  labels: LayoutInspectionControlLabels;
  familyControls: ReadonlyArray<LayoutInspectionFamilyControl<TOption>>;
}>;

/** 生成所有 layout family 共享的辅助层开关 */
const createBaseControls = (labels: LayoutInspectionControlLabels) => [
  { id: 'inspectContainer', label: labels.container, recommended: false },
  { id: 'inspectContent', label: labels.content, recommended: true },
  { id: 'inspectPadding', label: labels.padding, recommended: false },
  { id: 'inspectSlot', label: labels.slot, recommended: false },
  { id: 'inspectMargin', label: labels.margin, recommended: false },
  { id: 'inspectAllocation', label: labels.allocation, recommended: false },
  { id: 'inspectVisual', label: labels.visual, recommended: false },
  { id: 'inspectOverflow', label: labels.overflow, recommended: false },
  { id: 'inspectAlignmentGuides', label: labels.alignmentGuides, recommended: false },
  { id: 'inspectLabels', label: labels.labels, recommended: false },
];

/** 生成布局 playground 共用的辅助层 section、canonical 状态与三组预设 */
export const createLayoutInspectionControls = <TOption extends string>(
  config: LayoutInspectionControlConfig<TOption>,
) => {
  const { labels, familyControls } = config;
  const details = [...createBaseControls(labels), ...familyControls];
  const canonicalValues: PreviewControlValues = Object.freeze({
    inspect: true,
    ...Object.fromEntries(details.map(control => [control.id, control.recommended])),
  });

  return {
    stateOnlyIds: ['inspect'] as const,
    sections: [
      {
        label: labels.details,
        defaultCollapsed: true,
        controls: details.map(control => ({
          kind: 'switch' as const,
          id: control.id,
          label: control.label,
          defaultValue: control.recommended,
        })),
      },
    ],
    canonicalValues,
    presetsFor: (values: PreviewControlValues): ReadonlyArray<PreviewControlPreset> => [
      { id: 'recommended', label: labels.recommended, values },
      {
        id: 'all',
        label: labels.all,
        values: { ...values, ...Object.fromEntries(details.map(control => [control.id, true])) },
      },
      { id: 'off', label: labels.off, values: { inspect: false }, applyMode: 'merge-current' },
    ],
    presetSelector: { label: labels.preset, customLabel: labels.custom },
  };
};

type LayoutInspectionValues = Readonly<Record<string, unknown>>;

/** 把扁平 playground 值还原为布局组件的 inspect authoring 对象 */
export const resolveLayoutInspectionValues = <TOption extends string>(
  values: LayoutInspectionValues,
  familyControls: ReadonlyArray<LayoutInspectionFamilyControl<TOption>>,
): false | (BaseLayoutInspectOptions & Readonly<Record<TOption, boolean>>) => {
  if (values.inspect !== true) return false;

  const familyOptions = Object.fromEntries(
    familyControls.map(control => [control.option, values[control.id] === true]),
  ) as Record<TOption, boolean>;

  return {
    bounds: {
      container: values.inspectContainer === true,
      content: values.inspectContent === true,
      slot: values.inspectSlot === true,
      allocation: values.inspectAllocation === true,
      visual: values.inspectVisual === true,
    },
    spacing: {
      padding: values.inspectPadding === true,
      margin: values.inspectMargin === true,
    },
    overflow: values.inspectOverflow === true,
    alignmentGuides: values.inspectAlignmentGuides === true,
    labels: values.inspectLabels === true,
    ...familyOptions,
  };
};
