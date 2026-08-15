import type { IRGeometryLabel, IRPathBase, IRStep } from '../../schemas';
import type { CascadeState, EffectiveLabelDefault, StyleResolveFrame } from './types';

import { resolvePathMarks } from './arrow';
import { pickDrawableStyle } from './drawable';
import { cutsStyleChannel, pickDefinedKeys } from './frame';
import { resolveEffectiveLabelDefault, resolveGeometryLabel } from './label';

/** 级联 graphic state 投影到 path 样式字段 */
const cascadeToPath = (c: CascadeState): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = {};
  const stroke = c.stroke ?? c.color;
  if (stroke !== undefined) out.stroke = stroke;
  if (c.fill !== undefined) out.fill = c.fill;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.strokeOpacity !== undefined) out.strokeOpacity = c.strokeOpacity;
  return out;
};

/** 级联 graphic state 投影到 ribbon 样式字段 */
const cascadeToRibbon = (c: CascadeState): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = {};
  const fill = c.fill ?? c.color;
  if (fill !== undefined) out.fill = fill;
  if (c.stroke !== undefined) out.stroke = c.stroke;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.strokeOpacity !== undefined) out.strokeOpacity = c.strokeOpacity;
  return out;
};

/** path 源同源主色展开 */
const expandPathColor = (src: Partial<IRPathBase>): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = { ...src };
  if (src.color !== undefined && out.stroke === undefined) out.stroke = src.color;
  return out;
};

/** ribbon 源同源主色展开 */
const expandRibbonColor = (src: Partial<IRPathBase>): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = { ...src };
  if (src.color !== undefined && out.fill === undefined) out.fill = src.color;
  return out;
};

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
  let acc: Partial<IRPathBase> = {};
  let masterColor: string | undefined;
  const pathKind = path.kind ?? 'stroke';
  const isRibbon = pathKind === 'ribbon';
  for (const frame of stack) {
    if (cutsStyleChannel(frame.resetStyle, 'path')) {
      acc = {};
      masterColor = undefined;
    }
    if (frame.cascade.color !== undefined) masterColor = frame.cascade.color;
    acc = {
      ...acc,
      ...pickDefinedKeys(isRibbon ? cascadeToRibbon(frame.cascade) : cascadeToPath(frame.cascade)),
    };
    if (frame.pathDefault) {
      if (frame.pathDefault.color !== undefined) masterColor = frame.pathDefault.color;
      acc = {
        ...acc,
        ...pickDefinedKeys(
          isRibbon ? expandRibbonColor(pickDrawableStyle(frame.pathDefault)) : expandPathColor(frame.pathDefault),
        ),
      };
    }
  }
  if (path.color !== undefined) masterColor = path.color;
  acc = {
    ...acc,
    ...pickDefinedKeys(isRibbon ? expandRibbonColor(path) : expandPathColor(path)),
  };
  const effective = acc as IRPathBase;

  const labelDefault = resolveEffectiveLabelDefault(stack);
  if (isRibbon) delete effective.marks;
  else effective.marks = resolvePathMarks(path.marks, stack, masterColor);
  if (path.children !== undefined) {
    effective.children = resolveStepLabels(path.children, labelDefault, masterColor);
  } else {
    delete effective.children;
  }
  const label = resolveGeometryLabelField(path.label, labelDefault, masterColor);
  if (label !== undefined) effective.label = label;
  return effective;
};
