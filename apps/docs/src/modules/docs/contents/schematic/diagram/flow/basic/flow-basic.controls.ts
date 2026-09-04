import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

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
      'FlowEntity.style',
      'FlowRelation.role',
      'FlowRelation.status',
    ],
  } satisfies PreviewControlContract;
};

/** 基础 Flow demo 的中文 controls 契约 */
export const previewControlContract = defineFlowBasicControlContract({
  title: '表单填写流程',
  formSection: '前端表单',
  formRoleLabel: '实体角色',
  formRoleOptions: [
    { value: 'participant', label: '参与者' },
    { value: 'activity', label: '活动' },
    { value: 'event', label: '事件' },
    { value: 'state', label: '状态' },
    { value: 'gateway', label: '网关' },
    { value: 'resource', label: '资源' },
    { value: 'concept', label: '概念' },
  ],
  formStatusLabel: '实体状态',
  formStatusOptions: [
    { value: 'none', label: '未标记' },
    { value: 'error', label: '错误' },
    { value: 'success', label: '成功' },
    { value: 'warning', label: '警告' },
    { value: 'disabled', label: '禁用' },
  ],
  formTextLabel: '文本',
  formTextPlaceholder: '输入前端表单文本；按 Enter 换行',
  formTextDefault: '前端表单',
  formSubtitleLabel: '副标题',
  formSubtitlePlaceholder: '输入可选的说明文本',
  formSubtitleDefault: '填写用户信息',
  formSubtitleSizeLabel: '副标题字号',
  formSubtitleSizeOptions: [
    { value: 'xs', label: '极小（xs）' },
    { value: 'sm', label: '小（sm）' },
    { value: 'base', label: '常规（base）' },
    { value: 'lg', label: '大（lg）' },
  ],
  formSubtitleColorLabel: '副标题颜色',
  formTextAlignLabel: '文本对齐',
  formTextAlignOptions: [
    { value: 'start', label: '左对齐' },
    { value: 'middle', label: '居中' },
    { value: 'end', label: '右对齐' },
  ],
  formLineHeightLabel: '行距',
  formMaxTextWidthLabel: '最大文本宽度',
  relationSection: '连接关系',
  relationRoleLabel: '箭头类型',
  relationRoleOptions: [
    { value: 'flow', label: '流动' },
    { value: 'association', label: '关联' },
    { value: 'dependency', label: '依赖' },
    { value: 'generalization', label: '泛化' },
    { value: 'influence', label: '影响' },
  ],
  relationStatusLabel: '关系状态',
  relationStatusOptions: [
    { value: 'none', label: '未标记' },
    { value: 'error', label: '错误' },
    { value: 'success', label: '成功' },
    { value: 'warning', label: '警告' },
    { value: 'disabled', label: '禁用' },
  ],
});

/** 基础 Flow demo 的中文 controls */
export const flowBasicControls = previewControlContract.controls;
