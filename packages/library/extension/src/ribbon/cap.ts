import type { IRPosition, PathCommand } from '@retikz/core';
import { point } from '@retikz/math';
import { strictObject } from 'zod';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import { defineRibbonCap } from './cap-define';
import type { RibbonCapContext, RibbonCapDefinition, RibbonCapGeometry } from './cap-types';
import { RibbonArcCapSchema } from './schema';

/** 将端帽局部点映射到 Path 坐标 */
const capPoint = (context: RibbonCapContext, x: number, y: number): IRPosition => [
  context.center[0] + context.outward[0] * x + context.sectionAxis[0] * y,
  context.center[1] + context.outward[1] * x + context.sectionAxis[1] * y,
];

/** 生成直线端帽 */
const straightCap = (context: RibbonCapContext, extension: number): RibbonCapGeometry => {
  const half = context.width / 2;
  const sign = context.endpoint === 'end' ? 1 : -1;

  return {
    extension,
    commands: [
      { kind: 'move', to: capPoint(context, extension, sign * half) },
      { kind: 'line', to: capPoint(context, extension, -sign * half) },
    ],
  };
};

/** 生成经过端帽接点的圆弧，命令保留实际圆弧 */
const circularCap = (
  context: RibbonCapContext,
  center: IRPosition,
  radius: number,
  long: boolean,
): RibbonCapGeometry => {
  if (context.width === 0)
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon arc cap requires a nonzero width.',
      details: { endpoint: context.endpoint },
    });

  const endpoints = straightCap(context, 0).commands;
  const from = endpoints[0];
  const to = endpoints[1];
  if (!('to' in from) || !('to' in to))
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.PipelineInvariant,
      message: 'Missing cap endpoints.',
      details: {},
    });

  const tolerance = Math.max(0.01, radius * 1e-4);
  if (
    Math.abs(point.distance(center, from.to) - radius) > tolerance ||
    Math.abs(point.distance(center, to.to) - radius) > tolerance
  ) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: 'Ribbon arc cap radius must reach both side points.',
      details: { endpoint: context.endpoint, radius },
    });
  }

  const start = Math.atan2(from.to[1] - center[1], from.to[0] - center[0]);
  const end = Math.atan2(to.to[1] - center[1], to.to[0] - center[0]);
  let sweep = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  if (Math.abs(Math.abs(sweep) - Math.PI) < 1e-8) {
    const middle = start + sweep / 2;
    if (Math.cos(middle) * context.outward[0] + Math.sin(middle) * context.outward[1] < 0) sweep = -sweep;
  } else if (long) sweep += sweep > 0 ? -2 * Math.PI : 2 * Math.PI;

  const commands: Array<PathCommand> = [
    from,
    { kind: 'arc', center, radius, startAngle: (start * 180) / Math.PI, endAngle: ((start + sweep) * 180) / Math.PI },
  ];

  return { extension: 0, commands };
};

/** 官方平直端帽 */
export const ButtRibbonCapDefinition = defineRibbonCap({
  name: 'butt',
  paramsSchema: strictObject({}),
  resolve: context => straightCap(context, 0),
});

/** 官方方形端帽 */
export const SquareRibbonCapDefinition = defineRibbonCap({
  name: 'square',
  paramsSchema: strictObject({}),
  resolve: context => straightCap(context, context.width / 2),
});

/** 官方半圆端帽 */
export const RoundRibbonCapDefinition = defineRibbonCap({
  name: 'round',
  paramsSchema: strictObject({}),
  resolve: context =>
    context.width === 0 ? straightCap(context, 0) : circularCap(context, context.center, context.width / 2, false),
});

/** 官方显式圆弧端帽 */
export const ArcRibbonCapDefinition = defineRibbonCap({
  name: 'arc',
  paramsSchema: RibbonArcCapSchema,
  resolve: context =>
    circularCap(
      context,
      capPoint(context, ...context.params.center),
      context.params.radius,
      context.params.sweep === 'long',
    ),
});

/** 官方端帽定义集合 */
export const ExtensionRibbonCapDefinitions: ReadonlyArray<RibbonCapDefinition> = [
  ButtRibbonCapDefinition,
  SquareRibbonCapDefinition,
  RoundRibbonCapDefinition,
  ArcRibbonCapDefinition,
];
