import type { InputRelation } from '@retikz/graph-vanilla';

import { GraphStatus } from '@retikz/graph';

import type { PreviewControlContract, PreviewPanelControlItem } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Relation role demo 共用的稳定字段 id */
export const RelationRoleControlId = {
  Kind: 'kind',
  Direction: 'direction',
  Status: 'status',
  Color: 'color',
} as const;

/** 将 controls 的宽泛值收窄为 Relation 支持的闭合语义状态 */
export const relationStatusOf = (value: unknown): InputRelation['status'] => {
  switch (value) {
    case GraphStatus.Error:
    case GraphStatus.Success:
    case GraphStatus.Warning:
    case GraphStatus.Disabled:
      return value;
    default:
      return undefined;
  }
};

/** 只把已选择的 Relation 语义字段交给 JSON-safe authoring */
export const defineRelationSemanticProps = (
  kind: string | undefined,
  direction: InputRelation['direction'] | undefined,
): Pick<InputRelation, 'kind' | 'direction'> => ({
  ...(kind === undefined ? {} : { kind }),
  ...(direction === undefined ? {} : { direction }),
});

type RelationRoleControlOption = Readonly<{
  value: string;
  label: string;
}>;

type RelationRoleSelectCopy = Readonly<{
  label: string;
  defaultValue: string;
  options: ReadonlyArray<RelationRoleControlOption>;
}>;

type RelationRoleDirectionSelectCopy = RelationRoleSelectCopy &
  Readonly<{
    visibleWithKinds?: ReadonlyArray<string>;
  }>;

type RelationRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  kind?: RelationRoleSelectCopy;
  direction?: RelationRoleDirectionSelectCopy;
  statusLocale: 'zh' | 'en';
  colorLabel: string;
}>;

const relationStatusOptions = {
  zh: [
    { value: '', label: '无状态' },
    { value: GraphStatus.Error, label: '错误 - error' },
    { value: GraphStatus.Success, label: '成功 - success' },
    { value: GraphStatus.Warning, label: '警告 - warning' },
    { value: GraphStatus.Disabled, label: '禁用 - disabled' },
  ],
  en: [
    { value: '', label: 'No status' },
    { value: GraphStatus.Error, label: 'Error' },
    { value: GraphStatus.Success, label: 'Success' },
    { value: GraphStatus.Warning, label: 'Warning' },
    { value: GraphStatus.Disabled, label: 'Disabled' },
  ],
} as const;

/** 建立一个本地化 Relation role controls 契约 */
export const defineRelationRoleControlContract = <const TCopy extends RelationRoleControlCopy>(copy: TCopy) => {
  const roleControls: Array<PreviewPanelControlItem> = [];

  if (copy.kind !== undefined) {
    roleControls.push({
      kind: 'select',
      id: RelationRoleControlId.Kind,
      label: copy.kind.label,
      defaultValue: copy.kind.defaultValue,
      options: copy.kind.options,
    });
  }
  if (copy.direction !== undefined) {
    roleControls.push({
      kind: 'select',
      id: RelationRoleControlId.Direction,
      label: copy.direction.label,
      defaultValue: copy.direction.defaultValue,
      options: copy.direction.options,
      ...(copy.kind === undefined
        ? {}
        : {
            visibleWhen: {
              controlId: RelationRoleControlId.Kind,
              oneOf: copy.direction.visibleWithKinds ?? [copy.kind.defaultValue],
            },
          }),
    });
  }
  roleControls.push({
    kind: 'select',
    id: RelationRoleControlId.Status,
    label: copy.statusLocale === 'zh' ? '状态' : 'Status',
    defaultValue: '',
    options: relationStatusOptions[copy.statusLocale],
  });
  roleControls.push({
    kind: 'color',
    id: RelationRoleControlId.Color,
    label: copy.colorLabel,
    defaultValue: 'currentColor',
  });

  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [{ label: copy.sectionLabel, controls: roleControls }],
  });

  return {
    controls,
    canonicalValues: {
      ...(copy.kind === undefined ? {} : { kind: copy.kind.defaultValue }),
      ...(copy.direction === undefined ? {} : { direction: copy.direction.defaultValue }),
      status: '',
      color: 'currentColor',
    },
    relatedApis: [
      ...(copy.kind === undefined ? [] : ['Relation.kind']),
      ...(copy.direction === undefined ? [] : ['Relation.direction']),
      'Relation.status',
      'IRGraphRelationAppearanceTokenOverrides.stroke',
    ],
  } satisfies PreviewControlContract;
};
