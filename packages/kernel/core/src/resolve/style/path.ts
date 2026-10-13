import { mergeProperties } from '@retikz/foundation';

import type { IRGeometryLabel, IRPathBase, IRPathStyle, IRStep } from '../../schemas';
import { resolvePathMarks } from './arrow';
import { resolveGeometryLabel } from './label';
import { mergeGraphicStyle } from './opacity';
import type { EffectiveLabelDefault, EffectiveScopeDefaults } from './types';

/** 替换 path children 中各 step 的 label 为已解析 effective label */
const resolveStepLabels = (
  children: ReadonlyArray<IRStep>,
  labelDefault: EffectiveLabelDefault,
  masterColor: string | undefined,
): Array<IRStep> =>
  children.map(step => {
    if ('label' in step && step.label !== undefined) {
      return { ...step, label: resolveGeometryLabel(step.label, labelDefault, masterColor) };
    }

    return step;
  });

const resolveGeometryLabelField = (
  label: IRGeometryLabel | Array<IRGeometryLabel> | undefined,
  labelDefault: EffectiveLabelDefault,
  masterColor: string | undefined,
): IRGeometryLabel | Array<IRGeometryLabel> | undefined => {
  if (label === undefined) return undefined;
  if (Array.isArray(label)) {
    return label.map(item => resolveGeometryLabel(item, labelDefault, masterColor));
  }

  return resolveGeometryLabel(label, labelDefault, masterColor);
};

/** 解析 path 的最终样式 */
export const resolveEffectivePath = (path: IRPathBase, scopeDefaults: EffectiveScopeDefaults): IRPathBase => {
  const defaults = scopeDefaults.path;
  const style = mergeGraphicStyle<IRPathStyle>(defaults?.style, path.style);
  const masterColor = style.color;
  const effective: IRPathBase = {
    ...defaults?.geometry,
    ...mergeProperties([path], { shouldOverride: value => value !== undefined }),
    type: path.type,
    style,
  };

  const labelDefault = scopeDefaults.label ?? {};
  effective.marks = resolvePathMarks(path.marks, scopeDefaults, masterColor);
  if (path.children !== undefined) {
    effective.children = resolveStepLabels(path.children, labelDefault, masterColor);
  } else {
    delete effective.children;
  }

  const label = resolveGeometryLabelField(path.label, labelDefault, masterColor);
  if (label !== undefined) effective.label = label;

  return effective;
};
