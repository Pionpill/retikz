import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowBasicI18n } from './flow-basic.i18n';

/** 基础 Flow demo 的稳定 control id */
export const FlowBasicControlId = {
  FormRole: 'formRole',
  FormStatus: 'formStatus',
  FormText: 'formText',
  FormSubtitle: 'formSubtitle',
  FormSubtitleSize: 'formSubtitleSize',
  FormSubtitleColor: 'formSubtitleColor',
  FormTextAlign: 'formTextAlign',
  FormLineHeight: 'formLineHeight',
  FormMaxTextWidth: 'formMaxTextWidth',
  RelationRole: 'relationRole',
  RelationStatus: 'relationStatus',
} as const;

type FlowBasicControlOption = Readonly<{
  value: string;
  label: string;
}>;

type FlowBasicControlCopy = Readonly<{
  title: string;
  formSection: string;
  formRoleLabel: string;
  formRoleOptions: ReadonlyArray<FlowBasicControlOption>;
  formStatusLabel: string;
  formStatusOptions: ReadonlyArray<FlowBasicControlOption>;
  formTextLabel: string;
  formTextPlaceholder: string;
  formTextDefault: string;
  formSubtitleLabel: string;
  formSubtitlePlaceholder: string;
  formSubtitleDefault: string;
  formSubtitleSizeLabel: string;
  formSubtitleSizeOptions: ReadonlyArray<FlowBasicControlOption>;
  formSubtitleColorLabel: string;
  formTextAlignLabel: string;
  formTextAlignOptions: ReadonlyArray<FlowBasicControlOption>;
  formLineHeightLabel: string;
  formMaxTextWidthLabel: string;
  relationSection: string;
  relationRoleLabel: string;
  relationRoleOptions: ReadonlyArray<FlowBasicControlOption>;
  relationStatusLabel: string;
  relationStatusOptions: ReadonlyArray<FlowBasicControlOption>;
}>;

/** 建立双语同构的基础 Flow controls 契约 */
export const defineFlowBasicControlContract = (copy: FlowBasicControlCopy) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.formSection,
        controls: [
          {
            kind: 'select',
            id: FlowBasicControlId.FormRole,
            label: copy.formRoleLabel,
            defaultValue: 'activity',
            options: copy.formRoleOptions,
          },
          {
            kind: 'select',
            id: FlowBasicControlId.FormStatus,
            label: copy.formStatusLabel,
            defaultValue: 'none',
            options: copy.formStatusOptions,
          },
          {
            kind: 'text',
            id: FlowBasicControlId.FormText,
            label: copy.formTextLabel,
            defaultValue: copy.formTextDefault,
            placeholder: copy.formTextPlaceholder,
            multiline: true,
          },
          {
            kind: 'text',
            id: FlowBasicControlId.FormSubtitle,
            label: copy.formSubtitleLabel,
            defaultValue: copy.formSubtitleDefault,
            placeholder: copy.formSubtitlePlaceholder,
            multiline: false,
          },
          {
            kind: 'select',
            id: FlowBasicControlId.FormSubtitleSize,
            label: copy.formSubtitleSizeLabel,
            defaultValue: 'sm',
            options: copy.formSubtitleSizeOptions,
          },
          {
            kind: 'color',
            id: FlowBasicControlId.FormSubtitleColor,
            label: copy.formSubtitleColorLabel,
            defaultValue: '#6b7280',
          },
          {
            kind: 'select',
            id: FlowBasicControlId.FormTextAlign,
            label: copy.formTextAlignLabel,
            defaultValue: 'middle',
            options: copy.formTextAlignOptions,
          },
          {
            kind: 'range',
            id: FlowBasicControlId.FormLineHeight,
            label: copy.formLineHeightLabel,
            defaultValue: 18,
            min: 14,
            max: 32,
            step: 1,
          },
          {
            kind: 'range',
            id: FlowBasicControlId.FormMaxTextWidth,
            label: copy.formMaxTextWidthLabel,
            defaultValue: 160,
            min: 80,
            max: 240,
            step: 10,
          },
        ],
      },
      {
        label: copy.relationSection,
        controls: [
          {
            kind: 'select',
            id: FlowBasicControlId.RelationRole,
            label: copy.relationRoleLabel,
            defaultValue: 'flow',
            options: copy.relationRoleOptions,
          },
          {
            kind: 'select',
            id: FlowBasicControlId.RelationStatus,
            label: copy.relationStatusLabel,
            defaultValue: 'none',
            options: copy.relationStatusOptions,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      formRole: 'activity',
      formStatus: 'none',
      formText: copy.formTextDefault,
      formSubtitle: copy.formSubtitleDefault,
      formSubtitleSize: 'sm',
      formSubtitleColor: '#6b7280',
      formTextAlign: 'middle',
      formLineHeight: 18,
      formMaxTextWidth: 160,
      relationRole: 'flow',
      relationStatus: 'none',
    },
    relatedApis: [
      'FlowEntity.role',
      'FlowEntity.status',
      'FlowEntity.text',
      'FlowEntity.layout',
      'FlowRelation.role',
      'FlowRelation.status',
    ],
  } satisfies PreviewControlContract;
};

/** 按当前文档语言建立面板契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') =>
  defineFlowBasicControlContract(flowBasicI18n[lang].controls);

export const previewControlContract = createPreviewControlContract();

export const flowBasicControls = previewControlContract.controls;
