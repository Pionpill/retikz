import { GraphStatus } from '@retikz/graph';
import type { InputRelation } from '@retikz/graph-vanilla';

import type { PreviewControlContract, PreviewPanelControlItem } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { relationStatusOptions } from './relation-role.i18n';

/** Relation role demo 共用的稳定字段 id */
export const RelationRoleControlId = {
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

type RelationRoleControlOption = Readonly<{
  value: string;
  label: string;
}>;

type RelationRoleSelectCopy = Readonly<{
  label: string;
  defaultValue: string;
  options: ReadonlyArray<RelationRoleControlOption>;
}>;

type RelationRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  direction?: RelationRoleSelectCopy;
  statusLocale: 'zh' | 'en';
  colorLabel: string;
}>;

/** 建立一个本地化 Relation role controls 契约 */
export const defineRelationRoleControlContract = <const TCopy extends RelationRoleControlCopy>(copy: TCopy) => {
  const roleControls: Array<PreviewPanelControlItem> = [];

  if (copy.direction !== undefined) {
    roleControls.push({
      kind: 'select',
      id: RelationRoleControlId.Direction,
      label: copy.direction.label,
      defaultValue: copy.direction.defaultValue,
      options: copy.direction.options,
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
    sections: [{ controls: roleControls }],
  });

  return {
    controls,
    canonicalValues: {
      ...(copy.direction === undefined ? {} : { direction: copy.direction.defaultValue }),
      status: '',
      color: 'currentColor',
    },
    relatedApis: [
      ...(copy.direction === undefined ? [] : ['Relation.direction']),
      'Relation.status',
      'Graph.graphDefaults.relation.style.stroke',
    ],
  } satisfies PreviewControlContract;
};
