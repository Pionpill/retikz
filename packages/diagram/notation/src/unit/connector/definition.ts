import type { ExpandCompositeDefinition, IRPathBase, IRStep, IRTarget } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ConnectorRouting, IRConnector } from './types';

import { NOTATION_NAMESPACE } from '../../shared';
import { ConnectorRouteKind } from './constants';
import { ConnectorSchema } from './schema';

/** 将 Notation 目标映射为 Core Path 可解析的目标，并拒绝尚未接通的分段目标 */
const lowerTarget = (point: IRConnector['from']): IRTarget => {
  if (Array.isArray(point)) return point;
  if ('section' in point && point.section !== undefined) {
    throw new Error(`Unsupported Connector section target: ${point.section}`);
  }
  if ('kind' in point) {
    return {
      id: point.id,
      ...(point.anchor === undefined ? {} : { anchor: point.anchor }),
      ...(point.offset === undefined ? {} : { offset: point.offset }),
    };
  }
  return point;
};

/** 将 Connector 路由变换为 Core Path 的结构化步骤 */
const lowerRoute = (routing: ConnectorRouting, to: IRTarget): Array<IRStep> => {
  switch (routing.kind) {
    case ConnectorRouteKind.Straight:
      return [{ type: 'step', kind: 'line', to } satisfies IRStep];
    case ConnectorRouteKind.Polyline:
      return [
        ...routing.points.map((point): IRStep => ({ type: 'step', kind: 'line', to: lowerTarget(point) })),
        { type: 'step', kind: 'line', to } satisfies IRStep,
      ];
    case ConnectorRouteKind.Orthogonal:
      if ('ratio' in routing) {
        return [
          {
            type: 'step',
            kind: 'fold',
            via: routing.pattern,
            fraction: routing.ratio,
            to,
          } satisfies IRStep,
        ];
      }
      return [
        {
          type: 'step',
          kind: 'fold',
          via: routing.pattern,
          to,
        } satisfies IRStep,
      ];
    case ConnectorRouteKind.Quadratic:
      return [{ type: 'step', kind: 'curve', control: routing.control, to } satisfies IRStep];
    case ConnectorRouteKind.Cubic:
      return [
        { type: 'step', kind: 'cubic', control1: routing.control1, control2: routing.control2, to } satisfies IRStep,
      ];
    case ConnectorRouteKind.Bend:
      if ('tangents' in routing) {
        return [
          {
            type: 'step',
            kind: 'bend',
            outAngle: routing.tangents.outAngle,
            inAngle: routing.tangents.inAngle,
            ...(routing.looseness === undefined ? {} : { looseness: routing.looseness }),
            to,
          } satisfies IRStep,
        ];
      }
      return [
        {
          type: 'step',
          kind: 'bend',
          ...(routing.direction === undefined ? {} : { bendDirection: routing.direction }),
          ...(routing.angle === undefined ? {} : { bendAngle: routing.angle }),
          ...(routing.looseness === undefined ? {} : { looseness: routing.looseness }),
          to,
        } satisfies IRStep,
      ];
  }
};

/** 将一个 Connector 规范 IR 展开为同标识的 Core Path */
const expandConnector = (node: IRConnector): IRPathBase => {
  const from = lowerTarget(node.from);
  const to = lowerTarget(node.to);
  const route = lowerRoute(node.routing, to);
  // Core 描边路径由可绘制步骤持有标签，Connector 只把标签写入最后一段
  const labeledRoute =
    node.label === undefined || route.length === 0
      ? route
      : route.map((step, index) => (index === route.length - 1 ? { ...step, label: node.label } : step));
  return {
    type: 'path',
    id: node.id,
    children: [{ type: 'step', kind: 'move', to: from }, ...labeledRoute],
    ...node.appearance,
  };
};

/** Notation Connector 的轻量展开定义 */
export const ConnectorDefinition: ExpandCompositeDefinition<IRConnector, typeof NOTATION_NAMESPACE, 'connector'> =
  defineComposite({
    namespace: NOTATION_NAMESPACE,
    type: 'connector',
    schema: ConnectorSchema,
    expand: expandConnector,
  });
