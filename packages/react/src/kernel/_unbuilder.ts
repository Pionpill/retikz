import { type ReactNode, createElement } from 'react';
import type { IR, IRChild, IRNode, IRStep } from '@retikz/core';
import { Node, type NodeProps } from './Node';
import { Path } from './Path';
import { Step } from './Step';

/** IR 'node' child → NodeProps；过滤 undefined 字段，不污染 React DevTools 显示 */
const nodePropsFromIR = (n: IRNode): NodeProps => {
  const props: NodeProps = { position: n.position };
  if (n.id !== undefined) props.id = n.id;
  if (n.rotate !== undefined) props.rotate = n.rotate;
  if (n.text !== undefined) props.text = n.text;
  if (n.fontSize !== undefined) props.fontSize = n.fontSize;
  if (n.padding !== undefined) props.padding = n.padding;
  if (n.margin !== undefined) props.margin = n.margin;
  if (n.fill !== undefined) props.fill = n.fill;
  if (n.stroke !== undefined) props.stroke = n.stroke;
  if (n.strokeWidth !== undefined) props.strokeWidth = n.strokeWidth;
  return props;
};

/** 单个 IRStep → <Step /> element */
const stepToElement = (step: IRStep, key: number): ReactNode =>
  createElement(Step, { key, kind: step.kind, to: step.to });

/** discriminated union 兜底：编译期保证不漏 case，运行时给出明确错误 */
const assertNever = (x: never): never => {
  throw new Error(`convertIRToReactNode: unknown IR child type: ${JSON.stringify(x)}`);
};

/** 单个 IR child → 对应 Kernel element；走 discriminated union 穷举 */
const childToElement = (child: IRChild, key: number): ReactNode => {
  switch (child.type) {
    case 'node':
      return createElement(Node, { key, ...nodePropsFromIR(child) });
    case 'path':
      return createElement(Path, {
        key,
        stroke: child.stroke,
        strokeWidth: child.strokeWidth,
        strokeDasharray: child.strokeDasharray,
        children: child.children.map((s, j) => stepToElement(s, j)),
      });
    default:
      return assertNever(child);
  }
};

/**
 * 把 IR JSON 反向还原为 Kernel element 数组（带 key、不裹外壳）。
 * 调用方可 `<Tikz>{convertIRToReactNode(ir)}</Tikz>`，或继续用 `<Tikz ir={ir}/>`。
 *
 * **Sugar 不可逆**：buildIR 在收集阶段就把 <Draw/> 求值展开为 Path+Step，IR 里没有
 * "原本是 Draw" 的痕迹；本函数永远只产 Kernel 三件套。
 */
export const convertIRToReactNode = (ir: IR): ReactNode =>
  ir.children.map((child, i) => childToElement(child, i));
