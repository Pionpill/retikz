import type { IRLine, IRNode } from '@retikz/core';
import type {
  AnyInputEmbedAdapter,
  InputChild,
  InputEmbed,
  InputNode,
  InputPath,
  InputScene,
  InputScope,
  InputStep,
  InputStepLabel,
} from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';

import { Children, createElement, Fragment, isValidElement } from 'react';

import type { CoordinateProps, NodeProps, PathProps, ScopeProps, StepProps, TextProps } from '../components';
import type { ScopeStyleProps } from '../protocol';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import { Scope } from '../components';
import {
  createInputEmbedProps,
  getDisplayName,
  resolveInputEmbedAdapter,
  TIKZ_COORDINATE,
  TIKZ_EDGE_LABEL,
  TIKZ_NODE,
  TIKZ_PATH,
  TIKZ_SCOPE,
  TIKZ_STEP,
  TIKZ_TEXT,
} from '../protocol';
import { NODE_FIELDS, PATH_FIELDS, pickDefined, SCOPE_FIELDS, SCOPE_STYLE_FIELDS } from './fields';

type EdgeLabelElementProps = Readonly<{
  position?: InputStepLabel['position'];
  side?: InputStepLabel['side'];
  sloped?: InputStepLabel['sloped'];
  interrupt?: InputStepLabel['interrupt'];
  children?: unknown;
}>;

/** JSX 遍历得到的 Vanilla Input 场景 */
export type ReactInputScene = Readonly<{
  /** 交给 Vanilla normalize 的唯一作者输入 */
  scene: InputScene;
  /** React JSX 中使用的 Vanilla embed adapters */
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

/** 局部 JSX 收集时为匿名嵌入分配稳定 identity 的选项 */
export type CreateInputSceneOptions = Readonly<{
  /** 父嵌入提供的身份前缀，避免局部收集器之间的匿名 id 冲突 */
  embedIdPrefix?: string;
}>;

/** React 私有的嵌入 props 与其子树 adapter 收集结果 */
type ReactInputEmbedProps<TInput> = Readonly<{
  readonly __retikzReactInputEmbedProps: true;
  input: TInput;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

/** 将嵌入 props 与其递归 authoring 子项使用的 Vanilla adapter 一并交给根 traversal */
export const withInputEmbedAdapters = <TInput>(
  input: TInput,
  adapters: ReadonlyArray<AnyInputEmbedAdapter>,
): ReactInputEmbedProps<TInput> =>
  Object.freeze({
    __retikzReactInputEmbedProps: true,
    input,
    adapters,
  });

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

/** 判断字符串中的当前位置是否被反斜杠转义 */
const isEscapedAt = (text: string, index: number): boolean => {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashCount += 1;
  return slashCount % 2 === 1;
};

/** 按普通换行拆 Node 文本，同时保留 display TeX 内部的换行 */
const splitChildTextLines = (text: string): Array<string> => {
  const lines: Array<string> = [];
  let start = 0;
  let inDisplayTex = false;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '$' && text[index + 1] === '$' && !isEscapedAt(text, index)) {
      inDisplayTex = !inDisplayTex;
      index += 1;
      continue;
    }
    if (text[index] === '\n' && !inDisplayTex) {
      lines.push(text.slice(start, index));
      start = index + 1;
    }
  }
  lines.push(text.slice(start));
  return lines;
};

/** 将 <Text> 元素读取为一条节点文本行 */
const textElementToLineSpec = (element: ReactElement): IRLine | undefined => {
  const props = element.props as TextProps;
  if (typeof props.children !== 'string' && typeof props.children !== 'number') return undefined;
  const text = String(props.children);
  if (props.fill === undefined && props.opacity === undefined && props.font === undefined) return text;
  return {
    text,
    ...(props.fill === undefined ? {} : { fill: props.fill }),
    ...(props.opacity === undefined ? {} : { opacity: props.opacity }),
    ...(props.font === undefined ? {} : { font: props.font }),
  };
};

/** 收集 Node children 中的作者文本行 */
const collectChildLines = (children: unknown): Array<IRLine> => {
  const lines: Array<IRLine> = [];
  let buffer = '';
  let hasBuffer = false;
  const flush = (): void => {
    if (hasBuffer) lines.push(buffer);
    buffer = '';
    hasBuffer = false;
  };
  const append = (text: string): void => {
    buffer += text;
    hasBuffer = true;
  };
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      const parts = splitChildTextLines(node);
      append(parts[0] ?? '');
      for (let index = 1; index < parts.length; index += 1) {
        flush();
        append(parts[index] ?? '');
      }
      return;
    }
    if (typeof node === 'number') {
      append(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!isValidElement(node)) return;
    if (node.type === Fragment) {
      visit((node.props as { children?: ReactNode }).children);
      return;
    }
    if (getDisplayName(node) === TIKZ_TEXT) {
      const line = textElementToLineSpec(node);
      if (line !== undefined) {
        flush();
        lines.push(line);
      }
      return;
    }
    if (typeof node.type === 'function') visit((node.type as (props: unknown) => ReactNode)(node.props));
  };
  visit(children);
  flush();
  return lines;
};

/** 读取 Node 的显式 text 或 JSX children */
const readNodeText = (props: NodeProps): IRNode['text'] => {
  if (typeof props.text === 'string' || Array.isArray(props.text)) return props.text;
  const lines = collectChildLines(props.children);
  if (lines.length === 0) return undefined;
  return lines.length === 1 && typeof lines[0] === 'string' ? lines[0] : lines;
};

/** 从 <EdgeLabel> sugar 中读取首个标签 */
const readEdgeLabel = (children: ReactNode): InputStepLabel | undefined => {
  let result: InputStepLabel | undefined;
  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      if (getDisplayName(child) !== TIKZ_EDGE_LABEL) {
        if (typeof child.type === 'function') visit((child.type as (props: unknown) => ReactNode)(child.props));
        return;
      }
      const props = child.props as EdgeLabelElementProps;
      if (typeof props.children !== 'string') return;
      if (result !== undefined) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[retikz] <Step> 含多个 <EdgeLabel>，仅首个生效、其余被忽略');
        }
        return;
      }
      result = {
        text: props.children,
        ...(props.position === undefined ? {} : { position: props.position }),
        ...(props.side === undefined ? {} : { side: props.side }),
        ...(props.sloped === undefined ? {} : { sloped: props.sloped }),
        ...(props.interrupt === undefined ? {} : { interrupt: props.interrupt }),
      };
    });
  };
  visit(children);
  return result;
};

/** 读取 Step 的 prop label 或 <EdgeLabel> sugar */
const resolveStepLabel = (props: StepProps): InputStepLabel | undefined => {
  if ('label' in props && props.label !== undefined) return props.label;
  return 'children' in props ? readEdgeLabel(props.children) : undefined;
};

/** 把一个 <Step> props 组装为 Vanilla InputStep，不解析 target */
const inputStepFromProps = (props: StepProps): InputStep => {
  const kind = props.kind ?? 'line';
  if (kind === 'cycle') return { type: 'step', kind: 'cycle' };
  if (kind === 'move') {
    const step = props as Extract<StepProps, { kind: 'move' }>;
    return { type: 'step', kind: 'move', to: step.to };
  }
  const label = resolveStepLabel(props);
  if (kind === 'line') {
    const step = props as Extract<StepProps, { kind?: 'line' }>;
    return { type: 'step', kind: 'line', to: step.to, ...(label === undefined ? {} : { label }) };
  }
  if (kind === 'axis-line') {
    const step = props as Extract<StepProps, { kind: 'axis-line' }>;
    return { type: 'step', kind: 'axis-line', axis: step.axis, to: step.to, ...(label === undefined ? {} : { label }) };
  }
  if (kind === 'fold') {
    const step = props as Extract<StepProps, { kind: 'fold' }>;
    return {
      type: 'step',
      kind: 'fold',
      via: step.via,
      ...(step.via === '-|-' || step.via === '|-|' ? { fraction: step.fraction } : {}),
      to: step.to,
      ...(label === undefined ? {} : { label }),
    };
  }
  if (kind === 'curve') {
    const step = props as Extract<StepProps, { kind: 'curve' }>;
    return {
      type: 'step',
      kind: 'curve',
      control: step.control,
      to: step.to,
      ...(label === undefined ? {} : { label }),
    };
  }
  if (kind === 'cubic') {
    const step = props as Extract<StepProps, { kind: 'cubic' }>;
    return {
      type: 'step',
      kind: 'cubic',
      control1: step.control1,
      control2: step.control2,
      to: step.to,
      ...(label === undefined ? {} : { label }),
    };
  }
  if (kind === 'bend') {
    const step = props as Extract<StepProps, { kind: 'bend' }>;
    return {
      type: 'step',
      kind: 'bend',
      to: step.to,
      ...(step.bendDirection === undefined ? {} : { bendDirection: step.bendDirection }),
      ...(step.bendAngle === undefined ? {} : { bendAngle: step.bendAngle }),
      ...(step.outAngle === undefined ? {} : { outAngle: step.outAngle }),
      ...(step.inAngle === undefined ? {} : { inAngle: step.inAngle }),
      ...(step.looseness === undefined ? {} : { looseness: step.looseness }),
      ...(label === undefined ? {} : { label }),
    };
  }
  if (kind === 'arc') {
    const step = props as Extract<StepProps, { kind: 'arc' }>;
    return {
      type: 'step',
      kind: 'arc',
      startAngle: step.startAngle,
      endAngle: step.endAngle,
      radius: step.radius,
      ...(step.center === undefined ? {} : { center: step.center }),
      ...(label === undefined ? {} : { label }),
    };
  }
  if (kind === 'circlePath' || kind === 'ellipsePath') {
    const step = props as Extract<StepProps, { kind: 'circlePath' | 'ellipsePath' }>;
    return {
      type: 'step',
      kind,
      radius: step.radius,
      ...(step.startAngle === undefined ? {} : { startAngle: step.startAngle }),
      ...(step.endAngle === undefined ? {} : { endAngle: step.endAngle }),
      ...(step.closed === undefined ? {} : { closed: step.closed }),
      ...(label === undefined ? {} : { label }),
    } as InputStep;
  }
  if (kind === 'rectangle') {
    const step = props as Extract<StepProps, { kind: 'rectangle' }>;
    return {
      type: 'step',
      kind: 'rectangle',
      from: step.from,
      to: step.to,
      ...(step.cornerRadius === undefined ? {} : { cornerRadius: step.cornerRadius }),
    };
  }
  if (kind === 'smooth') {
    const step = props as Extract<StepProps, { kind: 'smooth' }>;
    return {
      type: 'step',
      kind: 'smooth',
      points: step.points,
      ...(step.tension === undefined ? {} : { tension: step.tension }),
      ...(label === undefined ? {} : { label }),
    };
  }
  const step = props as Extract<StepProps, { kind: 'generator' }>;
  return {
    type: 'step',
    kind: 'generator',
    name: step.name,
    params: step.params,
    ...(step.to === undefined ? {} : { to: step.to }),
    ...(label === undefined ? {} : { label }),
  };
};

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
      if (getDisplayName(child) === TIKZ_STEP) {
        steps.push(inputStepFromProps(child.props as StepProps));
        return;
      }
      if (typeof child.type === 'function') visit((child.type as (props: unknown) => ReactNode)(child.props));
    });
  };
  visit(children);
  return steps;
};

/** 把 <Node> props 组装为 Vanilla InputNode */
const inputNodeFromProps = (props: NodeProps): InputNode => {
  const text = readNodeText(props);
  return {
    type: 'node',
    position: props.position,
    ...pickDefined(props, NODE_FIELDS),
    ...(text === undefined ? {} : { text }),
    ...(props.label === undefined ? {} : { label: props.label }),
  };
};

/** 把 <Path> props 组装为 Vanilla InputPath */
const inputPathFromProps = (props: PathProps): InputPath => {
  const isDirectPath =
    props.authoring === undefined &&
    props.thickness === undefined &&
    props.arrow === undefined &&
    props.arrowDetail === undefined &&
    props.arrowPlacement === undefined &&
    props.way === undefined &&
    props.children === undefined;
  return {
    ...(isDirectPath ? { type: 'path' as const } : {}),
    ...pickDefined(props, PATH_FIELDS),
    ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
    ...(props.thickness === undefined ? {} : { thickness: props.thickness }),
    ...(props.arrow === undefined ? {} : { arrow: props.arrow }),
    ...(props.arrowDetail === undefined ? {} : { arrowDetail: props.arrowDetail }),
    ...(props.arrowPlacement === undefined ? {} : { arrowPlacement: props.arrowPlacement }),
    ...(props.way === undefined ? {} : { way: props.way }),
    ...(props.children === undefined ? {} : { children: readPathChildren(props.children) }),
  };
};

/** 把 <Coordinate> props 组装为 Source IR coordinate */
const inputCoordinateFromProps = (
  props: CoordinateProps,
): { type: 'coordinate'; id: string; position: CoordinateProps['position'] } => ({
  type: 'coordinate',
  id: props.id,
  position: props.position,
});

/** 把 <Scope> props 和已收集 children 组装为 Vanilla InputScope */
const inputScopeFromProps = (props: ScopeProps, context: InputContext): InputScope => {
  const children = readSceneChildren(props.children, context);
  return {
    ...(children.length === 0 ? { type: 'scope' as const } : {}),
    ...pickDefined(props, SCOPE_FIELDS),
    ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
    children,
  };
};

/** React JSX traversal 期间共享的 Tier 2 bridge */
type InputContext = {
  adapters: Map<string, AnyInputEmbedAdapter>;
  embedIdPrefix?: string;
  nextAnonymousEmbed: { value: number };
};

/** 将 React 元素组装为匹配其静态 Vanilla adapter 的 InputEmbed */
const inputEmbedFromElement = (
  element: ReactElement,
  adapter: AnyInputEmbedAdapter,
  context: InputContext,
): InputEmbed<unknown> => {
  const props = element.props as Record<string, unknown>;
  const explicitId = typeof props.id === 'string' && props.id.length > 0 ? props.id : undefined;
  const id =
    explicitId ??
    `${context.embedIdPrefix ?? '__retikz-react-embed'}:${adapter.kind}:${context.nextAnonymousEmbed.value++}`;
  const authoredProps = createInputEmbedProps(element.type, props, { id, kind: adapter.kind });
  const nested =
    typeof authoredProps === 'object' &&
    authoredProps !== null &&
    '__retikzReactInputEmbedProps' in authoredProps &&
    authoredProps.__retikzReactInputEmbedProps === true
      ? (authoredProps as ReactInputEmbedProps<unknown>)
      : undefined;
  context.adapters.set(adapter.kind, adapter);
  nested?.adapters.forEach(nestedAdapter => context.adapters.set(nestedAdapter.kind, nestedAdapter));
  return {
    type: 'embed',
    kind: adapter.kind,
    id,
    props: nested?.input ?? authoredProps,
    ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
  };
};

/** 收集 JSX child 为 Vanilla Input，不解析 Core authoring grammar */
const readSceneChildren = (children: ReactNode, context: InputContext): ReadonlyArray<InputChild> => {
  const output: Array<InputChild> = [];
  const visit = (nodes: ReactNode): void =>
    Children.forEach(nodes, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      switch (getDisplayName(child)) {
        case TIKZ_NODE:
          output.push(inputNodeFromProps(child.props as NodeProps));
          return;
        case TIKZ_PATH:
          output.push(inputPathFromProps(child.props as PathProps));
          return;
        case TIKZ_COORDINATE:
          output.push(inputCoordinateFromProps(child.props as CoordinateProps));
          return;
        case TIKZ_SCOPE:
          output.push(inputScopeFromProps(child.props as ScopeProps, context));
          return;
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
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[retikz] <Layout> children 含无法识别的元素 <${componentLabel(child.type)}>，已忽略。只有 Kernel、Sugar 与 React.Fragment 会被转换为 Input`,
        );
      }
    });
  visit(children);
  return output;
};

/** 收集 JSX children 为唯一 Vanilla InputScene */
export const createInputScene = (children: ReactNode, options: CreateInputSceneOptions = {}): ReactInputScene => {
  const context: InputContext = {
    adapters: new Map(),
    ...(options.embedIdPrefix === undefined ? {} : { embedIdPrefix: options.embedIdPrefix }),
    nextAnonymousEmbed: { value: 0 },
  };
  return Object.freeze({
    scene: { type: 'scene', children: readSceneChildren(children, context) },
    adapters: Object.freeze([...context.adapters.values()].sort((left, right) => left.kind.localeCompare(right.kind))),
  });
};

/** 拣出真正携带样式指令的根样式字段 */
export const pickScopeStyle = (style: ScopeStyleProps): Partial<ScopeStyleProps> => {
  const picked = pickDefined(style, SCOPE_STYLE_FIELDS);
  for (const key of SCOPE_STYLE_FIELDS) {
    const value = picked[key];
    if (typeof value === 'object' && Object.keys(value).length === 0) delete picked[key];
  }
  return picked;
};

/** 按需把 children 包进携带全图级联样式的合成根 Scope */
export const wrapRootScope = (children: ReactNode, style: ScopeStyleProps): ReactNode => {
  const picked = pickScopeStyle(style);
  return Object.keys(picked).length === 0 ? children : createElement(Scope, picked, children);
};
