import type { InputRelation } from '@retikz/graph-vanilla';

import type { PreviewControlContract, PreviewPanelControlItem } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Relation role demo 共用的稳定字段 id */
export const RelationRoleControlId = {
  Kind: 'kind',
  Direction: 'direction',
  Color: 'color',
} as const;

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

type RelationRoleControlCopy = Readonly<{
  title: string;
  sectionLabel: string;
  kind?: RelationRoleSelectCopy;
  direction?: RelationRoleSelectCopy;
  colorLabel: string;
}>;

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
        : { visibleWhen: { controlId: RelationRoleControlId.Kind, oneOf: [copy.kind.defaultValue] } }),
    });
  }
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
      color: 'currentColor',
    },
    relatedApis: [
      ...(copy.kind === undefined ? [] : ['Relation.kind']),
      ...(copy.direction === undefined ? [] : ['Relation.direction']),
      'IRGraphRelationAppearanceTokenOverrides.stroke',
    ],
  } satisfies PreviewControlContract;
};
