import type {
  EntityInputEmbedProps,
  GroupInputEmbedProps,
  InputEntity,
  InputRelation,
  RelationInputEmbedProps,
} from '@retikz/graph-vanilla';
import type { LayoutProps } from '@retikz/react';
import type { AnyInputEmbedAdapter, InputChild, InputPath } from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';

import { createInputScene, Node, Path, Step, Text } from '@retikz/react';
import { normalizePath } from '@retikz/vanilla';
import { Children, createElement, Fragment, isValidElement } from 'react';

import type { EntityProps } from './Entity';
import type { GroupProps } from './Group';
import type { RelationProps } from './Relation';

import { RetikzGraphReactError, RetikzGraphReactErrorCode } from '../errors';

/** Graph standalone 模式承接的完整 Layout 宿主属性 */
export type GraphLayoutHostProps = Pick<
  LayoutProps,
  | 'authoring'
  | 'compileDriver'
  | 'handlers'
  | 'runtime'
  | 'width'
  | 'height'
  | 'viewBox'
  | 'className'
  | 'style'
  | 'renderer'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'easings'
  | 'animationProperties'
  | 'idPrefix'
  | 'nodeDistance'
  | 'fontSize'
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'pathGenerators'
  | 'pathKinds'
  | 'composites'
  | 'themeStyles'
  | 'lowerTex'
  | 'artifacts'
  | 'onArtifacts'
  | 'onCompileResult'
>;

/** Graph standalone-only Layout props 的完整字段表 */
export const graphLayoutHostPropKeys = [
  'authoring',
  'compileDriver',
  'handlers',
  'runtime',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',
  'easings',
  'animationProperties',
  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'composites',
  'themeStyles',
  'lowerTex',
  'artifacts',
  'onArtifacts',
  'onCompileResult',
] as const satisfies ReadonlyArray<keyof GraphLayoutHostProps>;

type AssertEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;

type GraphLayoutHostPropKeysCheck = AssertEqual<(typeof graphLayoutHostPropKeys)[number], keyof GraphLayoutHostProps>;

const graphLayoutHostPropKeysCheck: GraphLayoutHostPropKeysCheck = true;
void graphLayoutHostPropKeysCheck;

/** 按 own-property 语义提取 Graph standalone Layout 宿主属性 */
export const graphLayoutHostPropsOf = (props: GraphLayoutHostProps): GraphLayoutHostProps => {
  const output: GraphLayoutHostProps = {};
  for (const key of graphLayoutHostPropKeys) {
    if (Object.hasOwn(props, key)) Object.assign(output, { [key]: props[key] });
  }
  return output;
};

/** Graph JSX children 的通用 Kernel authoring 收集结果 */
export type GraphChildCollection = Readonly<{
  children: ReadonlyArray<InputChild>;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

/** 递归访问 Fragment 展开的直接声明节点 */
const visitTransparentChildren = (children: ReactNode, visit: (child: ReactNode) => void): void => {
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      visitTransparentChildren((child.props as { children?: ReactNode }).children, visit);
      return;
    }
    visit(child);
  });
};

/** 读取 Core authoring 同样支持的函数组件包装 */
const renderFunctionElement = (element: ReactElement, label: string): ReactNode => {
  const component = element.type as {
    (props: unknown): ReactNode;
    prototype?: { isReactComponent?: unknown };
    isTier2Embeddable?: boolean;
  };
  if (component.prototype?.isReactComponent !== undefined || component.isTier2Embeddable === true) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.EntityChildInvalid,
      message: `${label} does not accept class or Tier 2 embeddable component wrappers.`,
      details: { label },
    });
  }
  try {
    return component(element.props);
  } catch (cause) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.EntityChildInvalid,
      message: `${label} function-component wrapper could not be evaluated.`,
      details: { label },
      cause,
    });
  }
};

/** 单次展开并校验 Entity 的 Core Node-compatible 文本 authoring */
const collectEntityTextNodes = (children: ReactNode): Array<ReactNode> => {
  const nodes: Array<ReactNode> = [];
  visitTransparentChildren(children, child => {
    if (typeof child === 'string' || typeof child === 'number') {
      nodes.push(child);
      return;
    }
    if (isValidElement(child) && child.type === Text) {
      nodes.push(child);
      return;
    }
    if (
      isValidElement(child) &&
      typeof child.type === 'function' &&
      child.type !== Node &&
      child.type !== Path &&
      child.type !== Step
    ) {
      nodes.push(...collectEntityTextNodes(renderFunctionElement(child, 'Entity')));
      return;
    }
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.EntityChildInvalid,
      message: 'Entity children accept only strings, numbers, Fragment, or Core Text.',
      details: { label: 'Entity', expectedType: 'Node-compatible text' },
    });
  });
  return nodes;
};

/** 将 Entity 文本 children 交给 Core React Node authoring 读取 */
const entityTextOf = (children: ReactNode, embedIdPrefix: string): InputEntity['text'] | undefined => {
  const textNodes = collectEntityTextNodes(children);
  const input = createInputScene(createElement(Node, { position: [0, 0] }, textNodes), {
    embedIdPrefix,
  });
  const child = input.scene.children?.[0];
  if (child?.type !== 'node' || 'namespace' in child) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.EntityChildInvalid,
      message: 'Entity text authoring must normalize to one Core Node text value.',
      details: { label: 'Entity', expectedType: 'Node-compatible text' },
    });
  }
  return child.text;
};

/** 将 Entity React props 组装为对应 Vanilla embed props */
export const collectEntityInput = (props: EntityProps, embedIdPrefix: string): EntityInputEmbedProps => {
  const { children, text, ...input } = props;
  const authoredText = children === undefined ? undefined : entityTextOf(children, embedIdPrefix);
  if (authoredText !== undefined && text !== undefined) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.EntityInputInvalid,
      message: 'Entity cannot combine text with JSX text children.',
      details: { label: 'Entity', reason: 'text-and-children' },
    });
  }
  return {
    type: 'entity',
    ...input,
    ...(authoredText === undefined ? (text === undefined ? {} : { text }) : { text: authoredText }),
  };
};

/** 单次展开并校验 Relation JSX children 中的 Core Step */
const collectRelationStepNodes = (children: ReactNode): Array<ReactNode> => {
  const nodes: Array<ReactNode> = [];
  visitTransparentChildren(children, child => {
    if (isValidElement(child) && child.type === Step) {
      nodes.push(child);
      return;
    }
    if (
      isValidElement(child) &&
      typeof child.type === 'function' &&
      child.type !== Node &&
      child.type !== Path &&
      child.type !== Text
    ) {
      nodes.push(...collectRelationStepNodes(renderFunctionElement(child, 'Relation')));
      return;
    }
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.RelationInputInvalid,
      message: 'Relation children accept only Core Step declarations.',
      details: { label: 'Relation', expectedType: 'Step' },
    });
  });
  return nodes;
};

/** 通过 Core React 与 Vanilla 共用 grammar 把 Step children 归一为 route */
const relationRouteOf = (children: ReactNode, embedIdPrefix: string): InputRelation['route'] | undefined => {
  const stepNodes = collectRelationStepNodes(children);
  const input = createInputScene(createElement(Path, null, stepNodes), { embedIdPrefix });
  const child = input.scene.children?.[0];
  if (child === undefined || child.type === 'embed' || child.type === 'scope' || child.type === 'node') {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.RelationInputInvalid,
      message: 'Relation Step declarations must normalize to one Core Path.',
      details: { label: 'Relation', expectedType: 'Path' },
    });
  }
  const path = child as InputPath;
  if (path.children === undefined || path.children.length === 0) return undefined;
  const route = normalizePath(path).children;
  return route.length === 0 ? undefined : route;
};

/** 将 Relation React props 组装为对应 Vanilla embed props */
export const collectRelationInput = (props: RelationProps, embedIdPrefix: string): RelationInputEmbedProps => {
  const { children, route, way, ...input } = props;
  const authoredRoute = children === undefined ? undefined : relationRouteOf(children, embedIdPrefix);
  if (authoredRoute !== undefined && (route !== undefined || way !== undefined)) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.RelationInputInvalid,
      message: 'Relation cannot combine route or way with JSX Step children.',
      details: { label: 'Relation', reason: 'route-or-way-and-children' },
    });
  }
  return {
    type: 'relation',
    ...input,
    ...(authoredRoute !== undefined
      ? { route: authoredRoute }
      : route !== undefined
        ? { route }
        : way !== undefined
          ? { way }
          : {}),
  };
};

/** 通过 Core React 通用 traversal 收集 Graph children 与嵌套 adapters */
export const collectGraphChildren = (children: ReactNode, embedIdPrefix: string): GraphChildCollection => {
  const input = createInputScene(children, { embedIdPrefix });
  return {
    children: input.scene.children ?? [],
    adapters: input.adapters,
  };
};

/** 将 Group React children 与 props 组装为唯一 Vanilla Input */
export const collectGroupInput = (
  props: GroupProps,
  embedIdPrefix: string,
): Readonly<{ input: GroupInputEmbedProps; adapters: ReadonlyArray<AnyInputEmbedAdapter> }> => {
  const { children, ...input } = props;
  const collected = collectGraphChildren(children, embedIdPrefix);
  return {
    input: {
      ...input,
      ...(collected.children.length === 0 ? {} : { children: collected.children }),
    },
    adapters: collected.adapters,
  };
};
