import type { AnyInputEmbed, AnyInputEmbedAdapter, InputChild, InputScene } from '@retikz/vanilla';
import { embed } from '@retikz/vanilla';
import type { ReactNode, ReactElement } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../../error';
import { KernelDisplayName, createInputEmbedProps, getDisplayName, resolveInputEmbedAdapter } from '../../../shared';
import { inputCoordinateFromProps, inputNodeFromProps, inputPathFromProps, inputScopeFromProps } from '../../kernel';
import type { CoordinateProps, NodeProps, PathProps, ScopeProps } from '../../kernel';

/** 局部 JSX 收集时为匿名嵌入分配稳定 identity 的选项 */
export type InputSceneCreationOptions = Readonly<{
  /** 父嵌入提供的身份前缀，避免局部收集器之间的匿名 id 冲突 */
  embedIdPrefix?: string;
}>;

/** 判断一个函数 type 是否为 React class 组件 */
const isClassComponent = (type: unknown): boolean =>
  typeof type === 'function' &&
  (type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent !== undefined;

/** 取得元素 type 的可读名称用于诊断 */
const componentLabel = (type: unknown): string => {
  if (typeof type === 'string') return type;
  if (typeof type === 'function') {
    const component = type as { displayName?: string; name?: string };
    return component.displayName ?? component.name ?? 'Unknown';
  }

  if (type !== null && typeof type === 'object') {
    return (type as { displayName?: string }).displayName ?? 'Unknown';
  }

  return String(type);
};

/** React JSX traversal 期间共享的 Tier 2 bridge */
type InputContext = {
  embedIdPrefix?: string;
  nextAnonymousEmbed: { value: number };
};

/** 将 React 元素组装为匹配其静态 Vanilla adapter 的 InputEmbed */
const inputEmbedFromElement = (
  element: ReactElement,
  adapter: AnyInputEmbedAdapter,
  context: InputContext,
): AnyInputEmbed => {
  const props = element.props as Record<string, unknown>;
  const explicitId = typeof props.id === 'string' && props.id.length > 0 ? props.id : undefined;
  const id =
    explicitId ??
    `${context.embedIdPrefix ?? '__retikz-react-embed'}:${adapter.kind}:${context.nextAnonymousEmbed.value++}`;
  const authoredProps = createInputEmbedProps(element.type, props, { id, kind: adapter.kind });
  return embed({
    adapter,
    id,
    props: authoredProps as never,
    ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
  });
};

/** 收集 JSX child 为 Vanilla Input，不解析 Core authoring grammar */
const readSceneChildren = (children: ReactNode, context: InputContext): InputScene['children'] => {
  const output: Array<InputChild> = [];
  const visit = (nodes: ReactNode): void =>
    Children.forEach(nodes, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }

      switch (getDisplayName(child)) {
        case KernelDisplayName.Node:
          output.push(inputNodeFromProps(child.props as NodeProps));
          return;
        case KernelDisplayName.Path:
          output.push(inputPathFromProps(child.props as PathProps));
          return;
        case KernelDisplayName.Coordinate:
          output.push(inputCoordinateFromProps(child.props as CoordinateProps));
          return;
        case KernelDisplayName.Scope: {
          const props = child.props as ScopeProps;
          output.push(inputScopeFromProps(props, readSceneChildren(props.children, context)));
          return;
        }
      }

      if (typeof child.type === 'function') {
        if (isClassComponent(child.type)) {
          throw new RetikzReactError(
            RetikzReactErrorCode.Kernel,
            `[retikz] <Layout> children 含类组件 <${componentLabel(child.type)}>。Kernel / Sugar 组件必须是函数组件`,
          );
        }

        const adapter = resolveInputEmbedAdapter(child.type);
        if (adapter !== null) {
          output.push(inputEmbedFromElement(child, adapter, context));
          return;
        }

        visit((child.type as (props: unknown) => ReactNode)(child.props));

        return;
      }

      if (__DEV__) {
        console.warn(
          `[retikz] <Layout> children 含无法识别的元素 <${componentLabel(child.type)}>，已忽略。只有 Kernel、Sugar 与 React.Fragment 会被转换为 Input`,
        );
      }
    });
  visit(children);

  return output;
};

/** 收集 JSX children 为唯一 Vanilla InputScene */
export const createInputScene = (children: ReactNode, options: InputSceneCreationOptions = {}): InputScene => {
  const context: InputContext = {
    ...(options.embedIdPrefix === undefined ? {} : { embedIdPrefix: options.embedIdPrefix }),
    nextAnonymousEmbed: { value: 0 },
  };
  return { type: 'scene', children: readSceneChildren(children, context) };
};
