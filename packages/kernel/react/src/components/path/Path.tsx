import type { IRPathBase, IRPathLabel } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { InputPath, InputStep, PathOptions } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import type { HydrationEventProps } from '../../shared';
import { KernelDisplayName, getDisplayName, mergeLabels } from '../../shared';
import type { PathLabelProps } from './PathLabel';
import { convertStepProps } from './Step';
import type { StepProps } from './Step';

/** 用子步骤声明路径，并设置样式、箭头与交互 */
export type PathProps = Omit<PathOptions, 'way' | 'children'> &
  HydrationEventProps &
  (
    | { children: Exclude<ReactNode, undefined> }
    | {
        /** 自定义路径定义直接提供几何，不传步骤来源 */
        kind: NonNullable<IRPathBase['kind']>;
        arrow?: IRPathBase['arrow'];
        children?: ReactElement | ReadonlyArray<ReactElement>;
      }
  );

/**
 * 绘图路径
 * @description 通过子步骤描述路径，也可由自定义路径定义提供几何
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = KernelDisplayName.Path;

/** 收集 <Path> children 中的 <Step> Input */
export const readPathChildren = (children: ReactNode) => {
  const labels: Array<IRPathLabel> = [];
  const steps: Array<InputStep> = [];

  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }

      if (getDisplayName(child) === KernelDisplayName.PathLabel) {
        const { children: text, ...options } = child.props as PathLabelProps;
        labels.push({ ...options, text });
        return;
      }
      if (getDisplayName(child) === KernelDisplayName.Step) {
        steps.push(convertStepProps(child.props as StepProps, steps.length === 0));
        return;
      }

      if (typeof child.type === 'function') visit((child.type as (props: unknown) => ReactNode)(child.props));
    });
  };

  visit(children);

  return { steps, labels };
};

/** 把 <Path> props 组装为 Vanilla InputPath */
export const convertPathProps = (props: PathProps): InputPath | IRPathBase => {
  const { steps, labels } = readPathChildren(props.children);
  const label = mergeLabels(props.label, labels);
  const path = {
    ...(label === undefined ? {} : { label }),
    type: 'path' as const,
    ...pickDefined(props, [
      'kind',
      'kindOptions',
      'id',
      'meta',
      'animations',
      'cornerRadius',
      'zIndex',
      'rotate',
      'scale',
      'marks',
      'style',
    ]),
  };
  if (props.children === undefined || (labels.length > 0 && steps.length === 0)) {
    if (!props.kind || props.kind === 'stroke' || typeof props.arrow === 'string' || props.authoring !== undefined)
      throw new RetikzReactError(RetikzReactErrorCode.Kernel, '普通 Path 必须指定 Step 子元素');
    return { ...path, ...(props.arrow === undefined ? {} : { arrow: props.arrow }) };
  }
  return { ...path, ...pickDefined(props, ['arrow']), authoring: props.authoring, children: steps };
};
