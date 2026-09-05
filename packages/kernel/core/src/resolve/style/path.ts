import type { IRGeometryLabel, IRPathBase, IRPathDefault, IRPathStyle, IRStep } from '../../schemas';
import type { EffectiveLabelDefault, StyleResolveFrame } from './types';

import { resolvePathMarks } from './arrow';
import { cutsStyleChannel, pickDefinedKeys } from './frame';
import { resolveEffectiveLabelDefault, resolveGeometryLabel } from './label';

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
export const resolveEffectivePath = (path: IRPathBase, stack: ReadonlyArray<StyleResolveFrame>): IRPathBase => {
  let defaults: IRPathDefault = {};
  let style: IRPathStyle = {};
  for (const frame of stack) {
    if (cutsStyleChannel(frame.resetStyle, 'path')) {
      defaults = {};
      style = {};
    }
    const { style: pathStyle, ...geometry } = frame.pathDefault ?? {};
    defaults = { ...defaults, ...pickDefinedKeys(geometry) };
    style = { ...style, ...pickDefinedKeys(frame.cascade), ...pickDefinedKeys(pathStyle ?? {}) };
  }
  style = { ...style, ...pickDefinedKeys(path.style ?? {}) };
  const masterColor = style.color;
  const effective: IRPathBase = { ...defaults, ...pickDefinedKeys(path), type: path.type, style };

  const labelDefault = resolveEffectiveLabelDefault(stack);
  effective.marks = resolvePathMarks(path.marks, stack, masterColor);
  if (path.children !== undefined) {
    effective.children = resolveStepLabels(path.children, labelDefault, masterColor);
  } else {
    delete effective.children;
  }
  const label = resolveGeometryLabelField(path.label, labelDefault, masterColor);
  if (label !== undefined) effective.label = label;
  return effective;
};
