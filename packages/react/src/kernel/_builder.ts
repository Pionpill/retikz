import { Children, type ReactElement, type ReactNode, isValidElement } from 'react';
import type { IR, IRChild, IRNode, IRStep } from '@retikz/core';
import { CURRENT_IR_VERSION } from '@retikz/core';
import { TIKZ_NODE, TIKZ_PATH, TIKZ_STEP } from './_displayNames';

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回，用于识别 Kernel/Sugar 组件 */
const getDisplayName = (el: ReactElement): string | undefined => {
  const t = el.type as { displayName?: string } | string;
  if (typeof t === 'string') return t;
  return t.displayName;
};

/** 把 <Node> props 翻成 IRChild；text 优先取 props.text，其次取字符串 children */
const buildNode = (props: Record<string, unknown>): IRChild => {
  const text =
    typeof props.text === 'string'
      ? props.text
      : typeof props.children === 'string'
        ? props.children
        : undefined;
  return {
    type: 'node',
    id: props.id as string | undefined,
    position: props.position as IRNode['position'],
    rotate: props.rotate as number | undefined,
    text,
    fill: props.fill as string | undefined,
    stroke: props.stroke as string | undefined,
    strokeWidth: props.strokeWidth as number | undefined,
    padding: props.padding as number | undefined,
    margin: props.margin as number | undefined,
    fontSize: props.fontSize as number | undefined,
  };
};

/**
 * 扫描 <Path> children 收集 <Step> 序列。
 * 至少 2 段；首段不是 move 时强制改为 move（与 SVG path 的 "M …" 语义对齐）。
 */
const readPathChildren = (children: ReactNode): Array<IRStep> => {
  const out: Array<IRStep> = [];
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const name = getDisplayName(child);
    if (name !== TIKZ_STEP) return;
    const props = child.props as Record<string, unknown>;
    const kind = (props.kind as 'move' | 'line' | undefined) ?? 'line';
    out.push({
      type: 'step',
      kind,
      to: props.to as IRStep['to'],
    });
  });
  if (out.length < 2) {
    throw new Error('<Path> requires at least 2 <Step> children');
  }
  if (out[0].kind !== 'move') {
    out[0] = { type: 'step', kind: 'move', to: out[0].to };
  }
  return out;
};

/** 把 <Path> props 翻成 IRChild；step 序列由 readPathChildren 收集 */
const buildPath = (props: Record<string, unknown>): IRChild => ({
  type: 'path',
  stroke: props.stroke as string | undefined,
  strokeWidth: props.strokeWidth as number | undefined,
  strokeDasharray: props.strokeDasharray as string | undefined,
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
