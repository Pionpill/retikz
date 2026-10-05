import { GraphStatus, RelationRole } from '@retikz/graph';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { relationStyleI18n } from './relation-style.i18n';

/** Relation 样式 playground 使用的稳定字段 id */
export const RelationStyleControlId = {
  Role: 'role',
  Status: 'status',
  Content: 'content',
  SourceColor: 'sourceColor',
  TargetColor: 'targetColor',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  Dashed: 'dashed',
  Opacity: 'opacity',
  LabelTextColor: 'labelTextColor',
  LabelOpacity: 'labelOpacity',
} as const;

/** Relation 样式 playground 的中文属性面板 */
export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationStyleI18n[lang];
  const relationStyleControls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: copy.controls[0],
    sections: [
      {
        label: copy.controls[1],
        controls: [
          {
            kind: 'select',
            id: RelationStyleControlId.Role,
            label: copy.controls[2],
            defaultValue: RelationRole.Flow,
            options: [
              { value: RelationRole.Association, label: copy.controls[3] },
              { value: RelationRole.Dependency, label: copy.controls[4] },
              { value: RelationRole.Generalization, label: copy.controls[5] },
              { value: RelationRole.Flow, label: copy.controls[6] },
              { value: RelationRole.Influence, label: copy.controls[7] },
            ],
          },
          {
            kind: 'select',
            id: RelationStyleControlId.Status,
            label: copy.controls[8],
            defaultValue: '',
            options: [
              { value: '', label: copy.controls[9] },
              { value: GraphStatus.Error, label: copy.controls[10] },
              { value: GraphStatus.Success, label: copy.controls[11] },
              { value: GraphStatus.Warning, label: copy.controls[12] },
              { value: GraphStatus.Disabled, label: copy.controls[13] },
            ],
          },
        ],
      },
      {
        label: copy.controls[14],
        controls: [
          {
            kind: 'text',
            id: RelationStyleControlId.Content,
            label: copy.controls[15],
            defaultValue: 'Next step',
            placeholder: copy.controls[16],
            multiline: true,
          },
        ],
      },
      {
        label: copy.controls[17],
        controls: [
          {
            kind: 'color',
            id: RelationStyleControlId.SourceColor,
            label: copy.controls[18],
            defaultValue: 'currentColor',
          },
        ],
      },
      {
        label: copy.controls[19],
        controls: [
          {
            kind: 'color',
            id: RelationStyleControlId.TargetColor,
            label: copy.controls[20],
            defaultValue: 'currentColor',
          },
        ],
      },
      {
        label: copy.controls[21],
        controls: [
          { kind: 'color', id: RelationStyleControlId.Stroke, label: copy.controls[22], defaultValue: '#2563eb' },
          {
            kind: 'range',
            id: RelationStyleControlId.StrokeWidth,
            label: copy.controls[23],
            defaultValue: 2,
            min: 0,
            max: 8,
            step: 0.5,
          },
          { kind: 'switch', id: RelationStyleControlId.Dashed, label: copy.controls[24], defaultValue: false },
          {
            kind: 'range',
            id: RelationStyleControlId.Opacity,
            label: copy.controls[25],
            defaultValue: 1,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
      {
        label: copy.controls[26],
        controls: [
          {
            kind: 'color',
            id: RelationStyleControlId.LabelTextColor,
            label: copy.controls[27],
            defaultValue: '#334155',
          },
          {
            kind: 'range',
            id: RelationStyleControlId.LabelOpacity,
            label: copy.controls[28],
            defaultValue: 1,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
    ],
  });

  /** Relation 样式 playground 的稳定文档契约 */
  return {
    controls: relationStyleControls,
    canonicalValues: {
      role: RelationRole.Flow,
      status: '',
      content: 'Next step',
      sourceColor: 'currentColor',
      targetColor: 'currentColor',
      stroke: '#2563eb',
      strokeWidth: 2,
      dashed: false,
      opacity: 1,
      labelTextColor: '#334155',
      labelOpacity: 1,
    },
    relatedApis: [
      'Relation.role',
      'Relation.status',
      'Relation.labels',
      'Entity.style.color',
      'Relation.style.stroke',
      'Relation.style.strokeWidth',
      'Relation.style.dashPattern',
      'Relation.style.opacity',
      'Relation.labelTextForeground',
      'Relation.labelOpacity',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
