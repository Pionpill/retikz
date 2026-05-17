import { Children, type ReactElement, type ReactNode, isValidElement } from 'react';
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
import type { ScopeProps } from './Scope';
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
import { NODE_FIELDS, PATH_FIELDS, pickDefined } from './_fields';

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回，用于识别 Kernel/Sugar 组件 */
const getDisplayName = (el: ReactElement): string | undefined => {
  const t = el.type as { displayName?: string } | string;
  if (typeof t === 'string') return t;
  return t.displayName;
};

// NODE_FIELDS / PATH_FIELDS / pickDefined 抽到 _fields.ts 与 unbuilder 共享

/**
 * 把 <Text> 元素的 props + children 串解析为 IRLineSpec 对象形式
 * @description children 必须是 string；非字符串 children 静默跳过此 <Text> 元素
 */
const textElementToLineSpec = (el: ReactElement): IRLineSpec | undefined => {
  const props = el.props as TextProps;
  if (typeof props.children !== 'string') return undefined;
  if (
    props.fill === undefined &&
    props.opacity === undefined &&
    props.font === undefined
  ) {
    return props.children;
  }
  return {
    text: props.children,
    fill: props.fill,
    opacity: props.opacity,
    font: props.font,
  };
};

/**
 * 递归收集 Node children 中的行
 * @description 字符串按 `'\n'` 拆行 / 数组逐项递归 / <Text> 元素 → 对象 LineSpec / 其它类型忽略
 */
const collectChildLines = (children: unknown): Array<IRLineSpec> => {
  const out: Array<IRLineSpec> = [];
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const part of node.split('\n')) out.push(part);
      return;
    }
    if (Array.isArray(node)) {
      for (const c of node) visit(c);
      return;
    }
    if (isValidElement(node) && getDisplayName(node) === TIKZ_TEXT) {
      const spec = textElementToLineSpec(node);
      if (spec !== undefined) out.push(spec);
    }
  };
  visit(children);
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
 * @description 至少 2 段；首段不是 move 时强制改为 move；cycle/arc/circlePath/ellipsePath 首段降级到 (0,0)
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
        bendDirection: p.bendDirection,
      };
      if (p.bendAngle !== undefined) step.bendAngle = p.bendAngle;
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
        radius: p.radius,
      };
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
      if (label) step.label = label;
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
  if (out.length < 2) {
    throw new Error('<Path> requires at least 2 <Step> children');
  }
  if (out[0].kind !== 'move') {
    const first = out[0];
    const fallbackTo: IRTarget =
      first.kind === 'cycle' ||
      first.kind === 'arc' ||
      first.kind === 'circlePath' ||
      first.kind === 'ellipsePath'
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

/** `<Scope>` props → IRScope；children 递归扫描走 readSceneChildren */
const buildScopeFromProps = (props: ScopeProps): IRScope => {
  const ir: IRScope = {
    type: 'scope',
    children: readSceneChildren(props.children),
  };
  if (props.id !== undefined) ir.id = props.id;
  if (props.localNamespace !== undefined) ir.localNamespace = props.localNamespace;
  if (props.transforms !== undefined) ir.transforms = props.transforms;
  return ir;
};

/** `<Path>` props → IRChild；step 序列由 readPathChildren 收集 */
const buildPathFromProps = (props: PathProps): IRChild => ({
  type: 'path',
  ...pickDefined(props, PATH_FIELDS),
  children: readPathChildren(props.children),
});

/**
 * 扫描 <TikZ> 直接 children
 * @description Kernel marker（Node / Path / Coordinate）走对应 typed builder；其余函数式组件视为 Sugar，同步调用拿 Kernel JSX 递归展开；非函数静默跳过。`as` cast 仅在此顶层一次——子函数全走 typed signature
 */
const readSceneChildren = (children: ReactNode): Array<IRChild> => {
  const out: Array<IRChild> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
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
 * 把 <TikZ> 的 children 同步翻译为 IR
 * @description 纯函数，不依赖 effect/state；render 阶段即可直接使用
 */
export const buildIR = (children: ReactNode): IR => ({
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: readSceneChildren(children),
});
