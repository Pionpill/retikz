import { type ReactNode, createElement } from 'react';
import type { IR, IRChild, IRNode, IRScope, IRStep } from '@retikz/core';
import { Coordinate } from './Coordinate';
import { Node, type NodeProps } from './Node';
import { Path } from './Path';
import { Scope, type ScopeProps } from './Scope';
import { Step } from './Step';
import { NODE_FIELDS, PATH_FIELDS, SCOPE_FIELDS, pickDefined } from './_fields';

/**
 * IR 'node' child → NodeProps；过滤 undefined 字段，不污染 React DevTools 显示
 * @description NODE_FIELDS 字段表透传纯字段（与 builder.ts 共享）；text / position / label 特化字段独立处理
 */
const nodePropsFromIR = (n: IRNode): NodeProps => {
  const props: NodeProps = { position: n.position, ...pickDefined(n, NODE_FIELDS) };
  if (n.text !== undefined) props.text = n.text;
  if (n.label !== undefined) props.label = n.label;
  return props;
};

/** 单个 IRStep → <Step /> element */
const stepToElement = (step: IRStep, key: number): ReactNode => {
  if (step.kind === 'cycle') {
    return createElement(Step, { key, kind: 'cycle' });
  }
  if (step.kind === 'step') {
    return createElement(Step, {
      key,
      kind: 'step',
      via: step.via,
      to: step.to,
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'curve') {
    return createElement(Step, {
      key,
      kind: 'curve',
      to: step.to,
      control: step.control,
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'cubic') {
    return createElement(Step, {
      key,
      kind: 'cubic',
      to: step.to,
      control1: step.control1,
      control2: step.control2,
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'bend') {
    return createElement(Step, {
      key,
      kind: 'bend',
      to: step.to,
      ...(step.bendDirection !== undefined && { bendDirection: step.bendDirection }),
      ...(step.bendAngle !== undefined && { bendAngle: step.bendAngle }),
      ...(step.outAngle !== undefined && { outAngle: step.outAngle }),
      ...(step.inAngle !== undefined && { inAngle: step.inAngle }),
      ...(step.looseness !== undefined && { looseness: step.looseness }),
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'arc') {
    return createElement(Step, {
      key,
      kind: 'arc',
      startAngle: step.startAngle,
      endAngle: step.endAngle,
      ...(step.radius !== undefined && { radius: step.radius }),
      ...(step.radiusX !== undefined && { radiusX: step.radiusX }),
      ...(step.radiusY !== undefined && { radiusY: step.radiusY }),
      ...(step.center !== undefined && { center: step.center }),
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'circlePath') {
    return createElement(Step, {
      key,
      kind: 'circlePath',
      radius: step.radius,
      ...(step.startAngle !== undefined && { startAngle: step.startAngle }),
      ...(step.endAngle !== undefined && { endAngle: step.endAngle }),
      ...(step.closed !== undefined && { closed: step.closed }),
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'ellipsePath') {
    return createElement(Step, {
      key,
      kind: 'ellipsePath',
      radiusX: step.radiusX,
      radiusY: step.radiusY,
      ...(step.startAngle !== undefined && { startAngle: step.startAngle }),
      ...(step.endAngle !== undefined && { endAngle: step.endAngle }),
      ...(step.closed !== undefined && { closed: step.closed }),
      ...(step.label !== undefined && { label: step.label }),
    });
  }
  if (step.kind === 'rectangle') {
    return createElement(Step, {
      key,
      kind: 'rectangle',
      from: step.from,
      to: step.to,
      ...(step.cornerRadius !== undefined && { cornerRadius: step.cornerRadius }),
    });
  }
  if (step.kind === 'move') {
    return createElement(Step, { key, kind: 'move', to: step.to });
  }
  if (step.kind === 'generator') {
    // generator step 暂无对应 React DSL <Step> kind（React sugar 另行实现）；IR→React 反构尚不支持
    throw new Error(
      'convertIRToReactNode: generator step has no React DSL representation yet',
    );
  }
  // line（默认）
  return createElement(Step, {
    key,
    kind: step.kind,
    to: step.to,
    ...(step.label !== undefined && { label: step.label }),
  });
};

/** discriminated union 兜底；编译期保证穷举，运行时给出明确错误 */
const assertNever = (x: never): never => {
  throw new Error(`convertIRToReactNode: unknown IR child type: ${JSON.stringify(x)}`);
};

/** 单个 IR child → 对应 Kernel element；走 discriminated union 穷举 */
const childToElement = (child: IRChild, key: number): ReactNode => {
  if ('namespace' in child) {
    // tier2 composite → JSX 暂不支持（authoring 通道见 ADR-02）；IR→React 仅覆盖 Tier 1
    throw new Error(
      `convertIRToReactNode: Tier 2 composite '${child.namespace}.${child.type}' → JSX is not supported yet (see ADR-02 <Composite> channel).`,
    );
  }
  switch (child.type) {
    case 'node':
      return createElement(Node, { key, ...nodePropsFromIR(child) });
    case 'path':
      // PATH_FIELDS 字段表透传纯字段（与 builder.ts 共享、互锁防漂移）——含 rotate / scale / marks 等所有非 type/children 字段；
      // children 特化处理。改用 pickDefined 与 node / scope 分支一致，避免手写列字段漏掉后续新增。
      return createElement(Path, {
        key,
        ...pickDefined(child, PATH_FIELDS),
        children: child.children.map((s, j) => stepToElement(s, j)),
      });
    case 'coordinate':
      return createElement(Coordinate, {
        key,
        id: child.id,
        position: child.position,
      });
    case 'scope':
      return createElement(Scope, scopePropsFromIR(child, key));
    default:
      return assertNever(child);
  }
};

/** IR 'scope' child → ScopeProps；样式 / 容器字段走 SCOPE_FIELDS 透传，递归把 scope.children 还原为 Kernel element 数组 */
const scopePropsFromIR = (
  s: IRScope,
  key: number,
): ScopeProps & { key: number } => ({
  key,
  ...pickDefined(s, SCOPE_FIELDS),
  children: s.children.map((c, i) => childToElement(c, i)),
});

/**
 * 把 IR JSON 反向还原为 Kernel element 数组（带 key、不裹外壳）
 * @description 调用方可 `<Layout>{convertIRToReactNode(ir)}</Layout>` 或用 `<Layout ir={ir}/>`；Sugar 不可逆——buildIR 在收集阶段已把 <Draw/> 求值展开为 Path+Step，IR 里没有"原本是 Draw"的痕迹，本函数永远只产 Kernel 三件套
 */
export const convertIRToReactNode = (ir: IR): ReactNode =>
  ir.children.map((child, i) => childToElement(child, i));
