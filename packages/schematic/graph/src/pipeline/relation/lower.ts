import type { IRArrowMark, IRPathBase, IRPathStyle } from '@retikz/core';

import type { CanonicalRelation, EffectiveRelationAppearance, EffectiveRelationStructure } from '../../resolve';
import type { IRGraphRelation, IRGraphRelationMarkerAppearance, IRGraphRelationMarkerRecipe } from '../../schemas';

const marker = (
  recipe: false | IRGraphRelationMarkerRecipe,
  appearance: IRGraphRelationMarkerAppearance | undefined,
): IRArrowMark | undefined => (recipe === false ? undefined : { kind: 'arrow', ...recipe, ...appearance });

const RELATION_ONLY_FIELDS = new Set<keyof IRGraphRelation>([
  'namespace',
  'type',
  'source',
  'target',
  'role',
  'kind',
  'predicate',
  'status',
  'direction',
  'labels',
  'route',
  'sourceMarker',
  'targetMarker',
  'labelTextForeground',
  'labelFont',
  'labelOpacity',
]);

const isDefinedPathField = ([key, value]: [string, unknown]): boolean =>
  !RELATION_ONLY_FIELDS.has(key as keyof IRGraphRelation) && value !== undefined;

/** 从 Relation Source 中移除领域字段，并保留作者实际定义的 Core Path 字段 */
const definedPathFields = (source: IRGraphRelation): Partial<IRPathBase> =>
  Object.fromEntries(Object.entries(source).filter(isDefinedPathField));

/** 从有效 Relation appearance 中投影 Core Path appearance */
const pathAppearanceOf = (appearance: EffectiveRelationAppearance): IRPathStyle => appearance.style ?? {};

/** 把 Canonical Relation、确定 structure / appearance 与唯一 route 下沉为一个 Core Path */
export const lowerRelation = (
  relation: CanonicalRelation,
  structure: EffectiveRelationStructure,
  appearance: EffectiveRelationAppearance,
): IRPathBase => {
  const source = relation.source;
  const route =
    source.route ??
    ([
      { type: 'step', kind: 'move', to: source.source },
      { type: 'step', kind: 'line', to: source.target },
    ] as const);
  const sourceMarker = marker(structure.sourceMarker, appearance.sourceMarker);
  const targetMarker = marker(structure.targetMarker, appearance.targetMarker);
  const marks: NonNullable<IRPathBase['marks']> = [
    ...(sourceMarker === undefined ? [] : [{ pos: 0 as const, mark: sourceMarker }]),
    ...(targetMarker === undefined ? [] : [{ pos: 1 as const, mark: targetMarker }]),
  ];
  const labels = source.labels?.map(label => {
    const textColor = label.textColor ?? appearance.labelTextForeground;
    const opacity = label.opacity ?? appearance.labelOpacity;
    const family = label.font?.family ?? appearance.labelFont?.family;
    const size = label.font?.size ?? appearance.labelFont?.size;
    const weight = label.font?.weight ?? appearance.labelFont?.weight;
    const fontStyle = label.font?.style ?? appearance.labelFont?.style;
    const font =
      label.font === undefined && appearance.labelFont === undefined
        ? undefined
        : {
            ...(family === undefined ? {} : { family }),
            ...(size === undefined ? {} : { size }),
            ...(weight === undefined ? {} : { weight }),
            ...(fontStyle === undefined ? {} : { style: fontStyle }),
          };
    return {
      ...label,
      textColor,
      ...(font === undefined ? {} : { font }),
      opacity,
    };
  });
  const dashPattern = source.style?.dashPattern ?? structure.dashPattern;
  return {
    type: 'path',
    ...definedPathFields(source),
    style: {
      ...pathAppearanceOf(appearance),
      ...Object.fromEntries(
        Object.entries(source.style ?? {}).filter(([, value]: [string, unknown]) => value !== undefined),
      ),
      ...(dashPattern === false ? {} : { dashPattern }),
    },
    children: route,
    ...(marks.length === 0 ? {} : { marks }),
    ...(labels === undefined || labels.length === 0 ? {} : { label: labels.length === 1 ? labels[0] : labels }),
  };
};
