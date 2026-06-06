import {
  Children,
  Fragment,
  type ReactElement,
  type ReactNode,
  createElement,
  isValidElement,
} from 'react';
import type {
  IR,
  IRChild,
  IRLineSpec,
  IRNode,
  IRScope,
  IRStep,
  IRStepLabel,
  IRTarget,
} from '@retikz/core';
import { CURRENT_IR_VERSION, parseTargetSugar } from '@retikz/core';
import type { CoordinateProps } from './Coordinate';
import type { NodeProps } from './Node';
import type { PathProps } from './Path';
import { Scope, type ScopeProps } from './Scope';
import type { StepProps } from './Step';
import type { TextProps } from './Text';
import type { EdgeLabelProps } from '../sugar/EdgeLabel';
import {
  TIKZ_COORDINATE,
  TIKZ_EDGE_LABEL,
  TIKZ_NODE,
  TIKZ_PATH,
  TIKZ_SCOPE,
  TIKZ_STEP,
  TIKZ_TEXT,
} from './_displayNames';
import {
  NODE_FIELDS,
  PATH_FIELDS,
  SCOPE_FIELDS,
  SCOPE_STYLE_FIELDS,
  type ScopeStyleProps,
  pickDefined,
} from './_fields';

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回，用于识别 Kernel/Sugar 组件 */
const getDisplayName = (el: ReactElement): string | undefined => {
  const t = el.type as { displayName?: string } | string;
  if (typeof t === 'string') return t;
  return t.displayName;
};

// NODE_FIELDS / PATH_FIELDS / pickDefined 抽到 _fields.ts 与 unbuilder 共享

/**
 * 把 <Text> 元素的 props + children 串解析为 IRLineSpec 对象形式
 * @description children 接受 string / number（number 当文本，对齐 React 渲染）；其它类型静默跳过此 <Text> 元素
 */
const textElementToLineSpec = (el: ReactElement): IRLineSpec | undefined => {
  const props = el.props as TextProps;
  if (typeof props.children !== 'string' && typeof props.children !== 'number') {
    return undefined;
  }
  const text = String(props.children);
  if (
    props.fill === undefined &&
    props.opacity === undefined &&
    props.font === undefined
  ) {
    return text;
  }
  return {
    text,
    fill: props.fill,
    opacity: props.opacity,
    font: props.font,
  };
};

/**
 * 收集 Node children 中的行（当前行缓冲模型，对齐 React 文本渲染）
 * @description 顺序遍历，维护一个当前行文本缓冲：字符串首段 append、每遇 `'\n'` flush 成一行并起新行；
 *   number 当文本 append（与相邻 inline 同一行拼接，不另起行）；boolean / null / undefined 跳过（React 渲染为空）；
 *   `<Text>` 元素先 flush 缓冲再独立成一行（保留 styled-line 行为）；数组沿用同一缓冲递归（相邻 inline 跨数组项也拼接）；
 *   其它类型跳过；遍历结束 flush 残余缓冲
 */
const collectChildLines = (children: unknown): Array<IRLineSpec> => {
  const out: Array<IRLineSpec> = [];
  let buffer = '';
  let bufferActive = false;
  const flush = (): void => {
    if (bufferActive) out.push(buffer);
    buffer = '';
    bufferActive = false;
  };
  const append = (chunk: string): void => {
    buffer += chunk;
    bufferActive = true;
  };
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      const parts = node.split('\n');
      append(parts[0]);
      for (let i = 1; i < parts.length; i += 1) {
        flush();
        append(parts[i]);
      }
      return;
    }
    if (typeof node === 'number') {
      append(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const c of node) visit(c);
      return;
    }
    if (isValidElement(node) && getDisplayName(node) === TIKZ_TEXT) {
      const spec = textElementToLineSpec(node);
      if (spec !== undefined) {
        flush();
        out.push(spec);
      }
    }
  };
  visit(children);
  flush();
  return out;
};

/**
 * Node 文本读取顺序
 * @description `props.text` 显式优先直接透传 IR；否则取 `props.children`（字符串按 `'\n'` 拆行）
 */
const readNodeText = (props: NodeProps): IRNode['text'] => {
  if (typeof props.text === 'string') return props.text;
  if (Array.isArray(props.text)) return props.text;
  const lines = collectChildLines(props.children);
  if (lines.length === 0) return undefined;
  if (lines.length === 1 && typeof lines[0] === 'string') return lines[0];
  return lines;
};

/**
 * `<Node>` props → IRChild
 * @description NODE_FIELDS 字段表透传纯字段；text / position / label 特化字段独立处理
 */
const buildNodeFromProps = (props: NodeProps): IRChild => {
  const text = readNodeText(props);
  const ir: IRChild = {
    type: 'node',
    position: props.position,
    ...pickDefined(props, NODE_FIELDS),
  };
  if (text !== undefined) ir.text = text;
  if (props.label !== undefined) ir.label = props.label;
  return ir;
};

/**
 * 扫描 Step children，把首个 <EdgeLabel> 翻译为 IRStepLabel
 * @description 非字符串 children 静默跳过；多个 <EdgeLabel> 取首个
 */
const readEdgeLabel = (children: ReactNode): IRStepLabel | undefined => {
  let result: IRStepLabel | undefined;
  Children.forEach(children, child => {
    if (result !== undefined) return;
    if (!isValidElement(child)) return;
    if (getDisplayName(child) !== TIKZ_EDGE_LABEL) return;
    const props = child.props as EdgeLabelProps;
    if (typeof props.children !== 'string') return;
    const out: IRStepLabel = { text: props.children };
    if (props.position !== undefined) out.position = props.position;
    if (props.side !== undefined) out.side = props.side;
    result = out;
  });
  return result;
};

/** Step kinds 中可挂 label 的子集（move / cycle 除外） */
type LabelableStepProps = Extract<
  StepProps,
  { label?: IRStepLabel; children?: ReactNode }
>;

/**
 * 解析 Step 的 label 来源
 * @description prop `label` 优先于 sugar `<EdgeLabel>` child；都缺省时返回 undefined
 */
const resolveStepLabel = (props: LabelableStepProps): IRStepLabel | undefined => {
  if (props.label !== undefined) return props.label;
  return readEdgeLabel(props.children);
};

/**
 * 扫描 <Path> children 收集 <Step> 序列
 * @description 至少 2 段（例外：单个自包含 rectangle step 自带两对角，可独立成 path）；首段不是 move 时强制改为 move；cycle/arc/circlePath/ellipsePath 首段降级到 (0,0)
 */
const readPathChildren = (children: ReactNode): Array<IRStep> => {
  const out: Array<IRStep> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (getDisplayName(child) !== TIKZ_STEP) return;
    const props = child.props as StepProps;
    const kind = props.kind ?? 'line';
    if (kind === 'cycle') {
      out.push({ type: 'step', kind: 'cycle' });
      return;
    }
    const label =
      kind === 'move' ? undefined : resolveStepLabel(props as LabelableStepProps);
    if (kind === 'step') {
      const p = props as Extract<StepProps, { kind: 'step' }>;
      const step: Extract<IRStep, { kind: 'step' }> = {
        type: 'step',
        kind: 'step',
        via: p.via,
        to: parseTargetSugar(p.to),
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'curve') {
      const p = props as Extract<StepProps, { kind: 'curve' }>;
      const step: Extract<IRStep, { kind: 'curve' }> = {
        type: 'step',
        kind: 'curve',
        to: parseTargetSugar(p.to),
        control: p.control,
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'cubic') {
      const p = props as Extract<StepProps, { kind: 'cubic' }>;
      const step: Extract<IRStep, { kind: 'cubic' }> = {
        type: 'step',
        kind: 'cubic',
        to: parseTargetSugar(p.to),
        control1: p.control1,
        control2: p.control2,
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'bend') {
      const p = props as Extract<StepProps, { kind: 'bend' }>;
      const step: Extract<IRStep, { kind: 'bend' }> = {
        type: 'step',
        kind: 'bend',
        to: parseTargetSugar(p.to),
      };
      if (p.bendDirection !== undefined) step.bendDirection = p.bendDirection;
      if (p.bendAngle !== undefined) step.bendAngle = p.bendAngle;
      if (p.outAngle !== undefined) step.outAngle = p.outAngle;
      if (p.inAngle !== undefined) step.inAngle = p.inAngle;
      if (p.looseness !== undefined) step.looseness = p.looseness;
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'arc') {
      const p = props as Extract<StepProps, { kind: 'arc' }>;
      const step: Extract<IRStep, { kind: 'arc' }> = {
        type: 'step',
        kind: 'arc',
        startAngle: p.startAngle,
        endAngle: p.endAngle,
      };
      if (p.radius !== undefined) step.radius = p.radius;
      if (p.radiusX !== undefined) step.radiusX = p.radiusX;
      if (p.radiusY !== undefined) step.radiusY = p.radiusY;
      if (p.center !== undefined) step.center = parseTargetSugar(p.center);
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'circlePath') {
      const p = props as Extract<StepProps, { kind: 'circlePath' }>;
      const step: Extract<IRStep, { kind: 'circlePath' }> = {
        type: 'step',
        kind: 'circlePath',
        radius: p.radius,
      };
      if (p.startAngle !== undefined) step.startAngle = p.startAngle;
      if (p.endAngle !== undefined) step.endAngle = p.endAngle;
      if (p.closed !== undefined) step.closed = p.closed;
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'ellipsePath') {
      const p = props as Extract<StepProps, { kind: 'ellipsePath' }>;
      const step: Extract<IRStep, { kind: 'ellipsePath' }> = {
        type: 'step',
        kind: 'ellipsePath',
        radiusX: p.radiusX,
        radiusY: p.radiusY,
      };
      if (p.startAngle !== undefined) step.startAngle = p.startAngle;
      if (p.endAngle !== undefined) step.endAngle = p.endAngle;
      if (p.closed !== undefined) step.closed = p.closed;
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'rectangle') {
      const p = props as Extract<StepProps, { kind: 'rectangle' }>;
      const step: Extract<IRStep, { kind: 'rectangle' }> = {
        type: 'step',
        kind: 'rectangle',
        from: parseTargetSugar(p.from),
        to: parseTargetSugar(p.to),
      };
      if (p.cornerRadius !== undefined) step.cornerRadius = p.cornerRadius;
      out.push(step);
      return;
    }
    if (kind === 'move') {
      const p = props as Extract<StepProps, { kind: 'move' }>;
      out.push({ type: 'step', kind: 'move', to: parseTargetSugar(p.to) });
      return;
    }
    // line（默认）
    const p = props as Extract<StepProps, { kind?: 'line' }>;
    const step: Extract<IRStep, { kind: 'line' }> = {
      type: 'step',
      kind: 'line',
      to: parseTargetSugar(p.to),
    };
    if (label) step.label = label;
    out.push(step);
  });
  // rectangle 自带 from/to 两对角、不依赖游标，单独成 path 合法；不抛错、也不被下方 move 替换
  const soloSelfContained = out.length === 1 && out[0].kind === 'rectangle';
  if (out.length < 2 && !soloSelfContained) {
    throw new Error('<Path> requires at least 2 <Step> children');
  }
  if (!soloSelfContained && out[0].kind !== 'move') {
    const first = out[0];
    const fallbackTo: IRTarget =
      first.kind === 'cycle' ||
      first.kind === 'arc' ||
      first.kind === 'circlePath' ||
      first.kind === 'ellipsePath' ||
      first.kind === 'generator'
        ? [0, 0]
        : first.to;
    out[0] = { type: 'step', kind: 'move', to: fallbackTo };
  }
  return out;
};

/** `<Coordinate>` props → IRChild（占位节点，无视觉） */
const buildCoordinateFromProps = (props: CoordinateProps): IRChild => ({
  type: 'coordinate',
  id: props.id,
  position: props.position,
});

/** `<Scope>` props → IRScope；样式 / 容器字段走 SCOPE_FIELDS 透传，children 递归扫描走 readSceneChildren */
const buildScopeFromProps = (props: ScopeProps): IRScope => ({
  type: 'scope',
  ...pickDefined(props, SCOPE_FIELDS),
  children: readSceneChildren(props.children),
});

/** `<Path>` props → IRChild；step 序列由 readPathChildren 收集 */
const buildPathFromProps = (props: PathProps): IRChild => ({
  type: 'path',
  ...pickDefined(props, PATH_FIELDS),
  children: readPathChildren(props.children),
});

/**
 * 扫描 <TikZ> 直接 children
 * @description Kernel marker（Node / Path / Coordinate）走对应 typed builder；React.Fragment 递归展开 children；其余函数式组件视为 Sugar，同步调用拿 Kernel JSX 递归展开；非函数静默跳过。`as` cast 仅在此顶层一次——子函数全走 typed signature
 */
const readSceneChildren = (children: ReactNode): Array<IRChild> => {
  const out: Array<IRChild> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    // React.Fragment：透明容器，递归解开 children 让 .map() 内 <>...</> 平铺到 TikZ 子级
    if (child.type === Fragment) {
      const fragChildren = (child.props as { children?: ReactNode }).children;
      for (const ir of readSceneChildren(fragChildren)) {
        out.push(ir);
      }
      return;
    }
    const name = getDisplayName(child);
    switch (name) {
      case TIKZ_NODE:
        out.push(buildNodeFromProps(child.props as NodeProps));
        return;
      case TIKZ_PATH:
        out.push(buildPathFromProps(child.props as PathProps));
        return;
      case TIKZ_COORDINATE:
        out.push(buildCoordinateFromProps(child.props as CoordinateProps));
        return;
      case TIKZ_SCOPE:
        out.push(buildScopeFromProps(child.props as ScopeProps));
        return;
    }
    if (typeof child.type === 'function') {
      const expanded = (child.type as (p: unknown) => ReactNode)(child.props);
      for (const ir of readSceneChildren(expanded)) {
        out.push(ir);
      }
    }
  });
  return out;
};

/**
 * 拣出真正携带样式指令的根样式字段
 * @description 在 `pickDefined`（仅取 `!== undefined`）基础上，再剔除**空对象的四通道 default**
 *   （`nodeDefault={{}}` / `pathDefault={{}}` 等）——空 default 不携带任何样式指令，留着只会让 `<Layout>`
 *   无谓地包一层空合成 `<Scope>`、改变 IR / Scene 拓扑却无视觉差异（违背 ADR「避免无谓的空 scope」）。
 *   标量通道的 falsy-但-defined 值（`strokeWidth={0}` / `opacity={0}`）是有意义的样式、保留。
 */
export const pickScopeStyle = (style: ScopeStyleProps): Partial<ScopeStyleProps> => {
  const picked = pickDefined(style, SCOPE_STYLE_FIELDS);
  for (const key of SCOPE_STYLE_FIELDS) {
    const value = picked[key];
    // 四通道 default 是对象；标量通道是 string / number。空对象 default 无样式指令、剔除
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      delete picked[key];
    }
  }
  return picked;
};

/**
 * 按需把 children 包进合成根 `<Scope>` 承载全图级联默认样式（`<Layout>` 顶层样式 props 的落地）
 * @description 至少一个字段真正携带样式指令时才包一层合成 `<Scope>`（字段经 `pickScopeStyle` 透传）；
 *   全缺省 / 仅空 default 时原样返回 children，保持 IR 形态与改动前逐字段一致（round-trip 稳定、不引入空 scope）。
 *   合成 scope 经 buildIR 产出标准 IRScope 节点，走既有 cascade，行为与用户手写 `<Scope>` 完全一致。
 *   用 createElement 而非 JSX 以留在非组件模块（避免 react-refresh 报「组件文件混出函数」）
 */
export const wrapRootScope = (children: ReactNode, style: ScopeStyleProps): ReactNode => {
  const picked = pickScopeStyle(style);
  if (Object.keys(picked).length === 0) return children;
  return createElement(Scope, picked, children);
};

/**
 * 把 <TikZ> 的 children 同步翻译为 IR
 * @description 纯函数，不依赖 effect/state；render 阶段即可直接使用
 */
export const buildIR = (children: ReactNode): IR => ({
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: readSceneChildren(children),
});
