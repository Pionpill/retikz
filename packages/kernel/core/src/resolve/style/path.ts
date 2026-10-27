import { mergeProperties } from '@retikz/foundation';

import type { IRPathLabelDefault, IRPathLabel, IRPathBase, IRPathStyle, IRStep } from '../../schemas';
import { resolvePathArrows, resolvePathMarks } from './arrow';
import { resolvePathLabel } from './label';
import { mergeGraphicStyle } from './opacity';
import type { EffectiveScopeDefaults } from './types';

/** 为每个步骤已有的标签合入默认配置 */
const resolveStepLabels = (
  children: ReadonlyArray<IRStep>,
  labelDefault: IRPathLabelDefault,
  masterColor: string | undefined,
): Array<IRStep> =>
  children.map(step => {
    if ('label' in step && step.label !== undefined) {
      return { ...step, label: resolvePathLabel(step.label, labelDefault, masterColor) };
    }

    return step;
  });

/** 为单个或多个路径标签合入默认配置，保留输入的单值或数组形式 */
const resolvePathLabelField = (
  label: IRPathLabel | Array<IRPathLabel> | undefined,
  labelDefault: IRPathLabelDefault,
  masterColor: string | undefined,
): IRPathLabel | Array<IRPathLabel> | undefined => {
  if (label === undefined) return undefined;
  if (Array.isArray(label)) {
    return label.map(item => resolvePathLabel(item, labelDefault, masterColor));
  }

  return resolvePathLabel(label, labelDefault, masterColor);
};

/** 合并路径几何与外观默认值，并为已有标签、箭头和沿线标记补齐配置 */
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

  const labelDefault = scopeDefaults.path?.label ?? {};
  effective.marks = resolvePathMarks(path.marks, scopeDefaults, masterColor);
  effective.arrow = resolvePathArrows(path.arrow, scopeDefaults, masterColor);
  if (path.children !== undefined) {
    effective.children = resolveStepLabels(path.children, labelDefault, masterColor);
  } else {
    delete effective.children;
  }

  const label = resolvePathLabelField(path.label, labelDefault, masterColor);
  if (label !== undefined) effective.label = label;

  return effective;
};
