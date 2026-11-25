import type { IRPath, IRPathBase } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { AssertEqual, RequireExactlyOne } from '@retikz/foundation';
import type { InputPath, InputStep, PathOptions, WayDSL } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import type { HydrationEventProps } from '../../hydration';
import { KernelDisplayName, getDisplayName } from '../../protocol';
import { inputStepFromProps } from './Step';
import type { StepProps } from './Step';

/** 用步骤或路径简写声明路径，并设置样式、箭头与交互 */
export type PathProps = Omit<PathOptions, 'way' | 'children'> &
  HydrationEventProps &
  (
    | RequireExactlyOne<{
        /** 路径走向简写，与 JSX 子步骤二选一 */
        way: WayDSL;
        /** 按声明顺序收集的 Step 子元素 */
        children: Exclude<ReactNode, undefined>;
      }>
    | {
        /** 自定义路径定义直接提供几何，不传步骤来源 */
        kind: NonNullable<IRPathBase['kind']>;
        arrow?: IRPathBase['arrow'];
      }
  );

/**
 * Path 用一组 `<Step>` 声明路径
 * @description 本组件自身不渲染 DOM；最终路径由 `<Layout>` 根据 step 序列、样式、箭头和标记输出
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = KernelDisplayName.Path;

/**
 * IRPath 纯透传字段表（除 type / children 特化字段外）
 * @description 同 NODE_FIELDS 互锁防漂移
 */
const PATH_FIELDS = [
  'kind',
  'kindOptions',
  'label',
  'id',
  'meta',
  'animations',
  'cornerRadius',
  'zIndex',
  'rotate',
  'scale',
  'marks',
  'arrow',
  'style',
] as const satisfies ReadonlyArray<keyof IRPath>;

type _PathFieldsCheck = AssertEqual<(typeof PATH_FIELDS)[number], Exclude<keyof IRPath, 'type' | 'children'>>;

const _assertPathFieldsCheck: _PathFieldsCheck = true;
void _assertPathFieldsCheck;

/** 收集 <Path> children 中的 <Step> Input */
const readPathChildren = (children: ReactNode): ReadonlyArray<InputStep> => {
  const steps: Array<InputStep> = [];

  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }

      if (getDisplayName(child) === KernelDisplayName.Step) {
        steps.push(inputStepFromProps(child.props as StepProps, steps.length === 0));
        return;
      }

      if (typeof child.type === 'function') visit((child.type as (props: unknown) => ReactNode)(child.props));
    });
  };

  visit(children);

  return steps;
};

/** 把 <Path> props 组装为 Vanilla InputPath */
export const inputPathFromProps = (props: PathProps): InputPath | IRPathBase => {
  if (!('children' in props) && !('way' in props)) {
    return { ...pickDefined(props, PATH_FIELDS), type: 'path' };
  }
  const fields = pickDefined(props, PATH_FIELDS);
  if (props.way !== undefined) {
    return {
      ...fields,
      type: 'path',
      way: props.way,
      ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
    };
  }
  return { ...fields, type: 'path', authoring: props.authoring, children: readPathChildren(props.children) };
};
