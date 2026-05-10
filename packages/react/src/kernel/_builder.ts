import { Children, type ReactElement, type ReactNode, isValidElement } from 'react';
import type {
  IR,
  IRChild,
  IRCoordinate,
  IRFont,
  IRLineSpec,
  IRNode,
  IRStep,
  IRStepLabel,
  IRTarget,
} from '@retikz/core';
import { CURRENT_IR_VERSION, parseTargetSugar } from '@retikz/core';
import {
  TIKZ_COORDINATE,
  TIKZ_EDGE_LABEL,
  TIKZ_NODE,
  TIKZ_PATH,
  TIKZ_STEP,
  TIKZ_TEXT,
} from './_displayNames';

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回，用于识别 Kernel/Sugar 组件 */
const getDisplayName = (el: ReactElement): string | undefined => {
  const t = el.type as { displayName?: string } | string;
  if (typeof t === 'string') return t;
  return t.displayName;
};

/**
 * 把 <Text> 元素的 props + children 串解析为 IRLineSpec 对象形式。
 * children 必须是 string；非字符串 children 静默跳过此 <Text> 元素。
 */
const textElementToLineSpec = (el: ReactElement): IRLineSpec | undefined => {
  const props = el.props as {
    children?: ReactNode;
    fill?: string;
    opacity?: number;
    font?: IRFont;
  };
  if (typeof props.children !== 'string') return undefined;
  // 全部样式字段都没设 → 退回纯字符串形式（让 IR 更紧凑）
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
 * 递归收集 Node children 中的行：
 * - 字符串按 `'\n'` 拆行（每段 → 字符串 LineSpec）
 * - 数组（JSX 多 child 自动展平）逐项递归
 * - <Text> 元素 → 对象 LineSpec（带覆盖样式）
 * - 其它类型（其它 React 元素 / null / 数字等）忽略——附带让 `<br/>` 当软分段
 *
 * 顺序保留——按 JSX 写的顺序行就是 IR 行顺序。
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
 * Node 文本读取顺序：
 * 1. `props.text`（string / string[] / LineSpec[]）— 显式优先，直接透传到 IR
 * 2. `props.children` — 字符串按 `'\n'` 拆行；`<Text>` 元素带样式贡献一行；保持 JSX 顺序
 *
 * 用 children 写多行的几种姿势：
 * - 字符串带换行：`<Node>{'Line 1\nLine 2'}</Node>`
 * - 模板字面量：``<Node>{`Line 1\nLine 2`}</Node>``
 * - 数组：`<Node>{['Line 1', 'Line 2']}</Node>`
 * - <Text>（带样式）：`<Node><Text fill="red">Heading</Text>body</Node>`
 */
const readNodeText = (props: Record<string, unknown>): IRNode['text'] => {
  // text prop：纯 string、string[]、或 LineSpec[]——直接透传
  if (typeof props.text === 'string') return props.text;
  if (Array.isArray(props.text)) return props.text as IRNode['text'];
  const lines = collectChildLines(props.children);
  if (lines.length === 0) return undefined;
  if (lines.length === 1 && typeof lines[0] === 'string') return lines[0];
  return lines;
};

/** 把 <Node> props 翻成 IRChild；text 优先取 props.text，其次取字符串 children */
const buildNode = (props: Record<string, unknown>): IRChild => ({
  type: 'node',
  id: props.id as string | undefined,
  shape: props.shape as IRNode['shape'],
  position: props.position as IRNode['position'],
  rotate: props.rotate as number | undefined,
  text: readNodeText(props),
  align: props.align as IRNode['align'],
  lineHeight: props.lineHeight as number | undefined,
  fill: props.fill as string | undefined,
  fillOpacity: props.fillOpacity as number | undefined,
  stroke: props.stroke as string | undefined,
  drawOpacity: props.drawOpacity as number | undefined,
  strokeWidth: props.strokeWidth as number | undefined,
  dashed: props.dashed as boolean | undefined,
  dotted: props.dotted as boolean | undefined,
  dashArray: props.dashArray as string | undefined,
  roundedCorners: props.roundedCorners as number | undefined,
  minimumWidth: props.minimumWidth as number | undefined,
  minimumHeight: props.minimumHeight as number | undefined,
  minimumSize: props.minimumSize as number | undefined,
  scale: props.scale as number | undefined,
  xScale: props.xScale as number | undefined,
  yScale: props.yScale as number | undefined,
  textColor: props.textColor as string | undefined,
  opacity: props.opacity as number | undefined,
  innerXSep: props.innerXSep as number | undefined,
  innerYSep: props.innerYSep as number | undefined,
  outerSep: props.outerSep as number | undefined,
  padding: props.padding as number | undefined,
  margin: props.margin as number | undefined,
  font: props.font as IRNode['font'],
});

/**
 * 扫描 Step children，把首个 <EdgeLabel> 翻译为 IRStepLabel；
 * 非字符串 children 静默跳过；多个 <EdgeLabel> 取首个。
 */
const readEdgeLabel = (children: ReactNode): IRStepLabel | undefined => {
  let result: IRStepLabel | undefined;
  Children.forEach(children, child => {
    if (result !== undefined) return;
    if (!isValidElement(child)) return;
    if (getDisplayName(child) !== TIKZ_EDGE_LABEL) return;
    const props = child.props as {
      children?: ReactNode;
      position?: IRStepLabel['position'];
      side?: IRStepLabel['side'];
    };
    if (typeof props.children !== 'string') return;
    const out: IRStepLabel = { text: props.children };
    if (props.position !== undefined) out.position = props.position;
    if (props.side !== undefined) out.side = props.side;
    result = out;
  });
  return result;
};

/**
 * 解析 Step 的 label 来源：prop `label` 优先于 sugar `<EdgeLabel>` child；
 * 都缺省时返回 undefined。
 */
const resolveStepLabel = (props: Record<string, unknown>): IRStepLabel | undefined => {
  if (props.label !== undefined) return props.label as IRStepLabel;
  return readEdgeLabel(props.children as ReactNode);
};

/**
 * 扫描 <Path> children 收集 <Step> 序列。
 * 至少 2 段；首段不是 move 时强制改为 move（与 SVG path 的 "M …" 语义对齐）；
 * cycle 没有 to 字段，若用户把 cycle 放在首段，coerce 时降级到 move (0,0)。
 */
const readPathChildren = (children: ReactNode): Array<IRStep> => {
  const out: Array<IRStep> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const name = getDisplayName(child);
    if (name !== TIKZ_STEP) return;
    const props = child.props as Record<string, unknown>;
    const kind =
      (props.kind as
        | 'move'
        | 'line'
        | 'step'
        | 'cycle'
        | 'curve'
        | 'cubic'
        | 'bend'
        | 'arc'
        | 'circlePath'
        | 'ellipsePath'
        | undefined) ?? 'line';
    if (kind === 'cycle') {
      // cycle 不挂 label——schema 已禁；children 中的 <EdgeLabel> 静默忽略
      out.push({ type: 'step', kind: 'cycle' });
      return;
    }
    // 'move' 同样不挂 label；其它 kind 都允许 label（ADR-0004）
    const label = kind === 'move' ? undefined : resolveStepLabel(props);
    if (kind === 'step') {
      const step: Extract<IRStep, { kind: 'step' }> = {
        type: 'step',
        kind: 'step',
        via: props.via as '-|' | '|-',
        to: parseTargetSugar(props.to),
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'curve') {
      const step: Extract<IRStep, { kind: 'curve' }> = {
        type: 'step',
        kind: 'curve',
        to: parseTargetSugar(props.to),
        control: props.control as [number, number],
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'cubic') {
      const step: Extract<IRStep, { kind: 'cubic' }> = {
        type: 'step',
        kind: 'cubic',
        to: parseTargetSugar(props.to),
        control1: props.control1 as [number, number],
        control2: props.control2 as [number, number],
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'bend') {
      const step: Extract<IRStep, { kind: 'bend' }> = {
        type: 'step',
        kind: 'bend',
        to: parseTargetSugar(props.to),
        bendDirection: props.bendDirection as 'left' | 'right',
      };
      if (props.bendAngle !== undefined) step.bendAngle = props.bendAngle as number;
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'arc') {
      const step: Extract<IRStep, { kind: 'arc' }> = {
        type: 'step',
        kind: 'arc',
        startAngle: props.startAngle as number,
        endAngle: props.endAngle as number,
        radius: props.radius as number,
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'circlePath') {
      const step: Extract<IRStep, { kind: 'circlePath' }> = {
        type: 'step',
        kind: 'circlePath',
        radius: props.radius as number,
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'ellipsePath') {
      const step: Extract<IRStep, { kind: 'ellipsePath' }> = {
        type: 'step',
        kind: 'ellipsePath',
        radiusX: props.radiusX as number,
        radiusY: props.radiusY as number,
      };
      if (label) step.label = label;
      out.push(step);
      return;
    }
    if (kind === 'move') {
      out.push({ type: 'step', kind: 'move', to: parseTargetSugar(props.to) });
      return;
    }
    // line（默认）
    const step: Extract<IRStep, { kind: 'line' }> = {
      type: 'step',
      kind: 'line',
      to: parseTargetSugar(props.to),
    };
    if (label) step.label = label;
    out.push(step);
  });
  if (out.length < 2) {
    throw new Error('<Path> requires at least 2 <Step> children');
  }
  if (out[0].kind !== 'move') {
    // 首段如果是没有 to 字段的形状 step（cycle / arc / circlePath / ellipsePath），
    // 回退到原点 [0,0] 当 move target；其它 kind（line / step / curve / cubic / bend）
    // 保留它们自己的 to。
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

/** 把 <Coordinate> props 翻成 IRChild（占位节点，无视觉） */
const buildCoordinate = (props: Record<string, unknown>): IRChild => ({
  type: 'coordinate',
  id: props.id as string,
  position: props.position as IRCoordinate['position'],
});

/** 把 <Path> props 翻成 IRChild；step 序列由 readPathChildren 收集 */
const buildPath = (props: Record<string, unknown>): IRChild => ({
  type: 'path',
  stroke: props.stroke as string | undefined,
  strokeWidth: props.strokeWidth as number | undefined,
  strokeDasharray: props.strokeDasharray as string | undefined,
  lineCap: props.lineCap as 'butt' | 'round' | 'square' | undefined,
  lineJoin: props.lineJoin as 'miter' | 'round' | 'bevel' | undefined,
  thickness: props.thickness as
    | 'ultraThin'
    | 'veryThin'
    | 'thin'
    | 'semithick'
    | 'thick'
    | 'veryThick'
    | 'ultraThick'
    | undefined,
  arrow: props.arrow as 'none' | '->' | '<-' | '<->' | undefined,
  arrowShape: props.arrowShape as
    | 'normal'
    | 'open'
    | 'stealth'
    | 'diamond'
    | 'circle'
    | undefined,
  fill: props.fill as string | undefined,
  fillRule: props.fillRule as 'nonzero' | 'evenodd' | undefined,
  opacity: props.opacity as number | undefined,
  fillOpacity: props.fillOpacity as number | undefined,
  drawOpacity: props.drawOpacity as number | undefined,
  children: readPathChildren(props.children as ReactNode),
});

/**
 * 扫描 <Tikz> 直接 children：
 * - Kernel marker（Node / Path）走对应 builder 直接产 IRChild
 * - 其余函数式组件视为 Sugar：同步调用拿 Kernel JSX，递归展开
 *   （Sugar 组件不能用 hooks——builder 不在 React 调用栈上）
 * - 非函数（fragment / 字符串 / null / 类组件）静默跳过
 */
const readSceneChildren = (children: ReactNode): Array<IRChild> => {
  const out: Array<IRChild> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const name = getDisplayName(child);
    switch (name) {
      case TIKZ_NODE:
        out.push(buildNode(child.props as Record<string, unknown>));
        return;
      case TIKZ_PATH:
        out.push(buildPath(child.props as Record<string, unknown>));
        return;
      case TIKZ_COORDINATE:
        out.push(buildCoordinate(child.props as Record<string, unknown>));
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
 * 把 <Tikz> 的 children 同步翻译为 IR。
 * 纯函数，不依赖 effect/state；render 阶段即可直接使用。
 */
export const buildIR = (children: ReactNode): IR => ({
  version: CURRENT_IR_VERSION,
  type: 'scene',
  children: readSceneChildren(children),
});
