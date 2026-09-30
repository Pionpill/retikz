import type { IRPosition, PathCommand } from '@retikz/core';
import { point, vector2 } from '@retikz/math';
import type { Vector2 } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';
import type { RibbonCapDefinition } from '../cap-types';
import type { IRRibbonCap } from '../types';
import { commandBoundsPoints, commandEndpoint } from './commands';
import type { RibbonCrossSection } from './types';

/** 已解析端帽与侧边接点 */
export type RibbonEndpointGeometry = {
  /** 原始端面中心 */
  center: IRPosition;
  /** 端面外向单位轴 */
  outward: Vector2;
  left: IRPosition;
  right: IRPosition;
  commands: Array<PathCommand>;
};

/** 通过统一 Definition 解析端帽，并校验闭合接点 */
export const resolveEndpointCap = (input: {
  endpoint: 'start' | 'end';
  section: RibbonCrossSection;
  cap: IRRibbonCap;
  registry: ReadonlyMap<string, RibbonCapDefinition>;
  round: (value: number) => number;
}): RibbonEndpointGeometry => {
  const { endpoint, section, cap, registry, round } = input;
  const definition = registry.get(cap.name);
  if (definition === undefined)
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.ResolutionInvalid,
      message: `Unknown Ribbon cap '${cap.name}' at ${endpoint}.cap.`,
      details: { endpoint, name: cap.name },
    });
  const center: IRPosition = [(section.left[0] + section.right[0]) / 2, (section.left[1] + section.right[1]) / 2];
  const sectionAxis = section.axis;
  let outward: Vector2 = vector2.normal(sectionAxis);
  const dot = outward[0] * section.tangent[0] + outward[1] * section.tangent[1];
  if ((endpoint === 'start' && dot > 0) || (endpoint === 'end' && dot < 0)) outward = [-outward[0], -outward[1]];
  try {
    const params = definition.paramsSchema.parse(cap.params ?? {});
    const geometry = definition.resolve({ endpoint, center, sectionAxis, outward, width: section.width, params });
    if (!Number.isFinite(geometry.extension))
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon cap extension must be finite.',
        details: {},
      });
    const shift = (position: IRPosition): IRPosition => [
      round(position[0] + outward[0] * geometry.extension),
      round(position[1] + outward[1] * geometry.extension),
    ];
    const left = shift(section.left);
    const right = shift(section.right);
    const commands = [...geometry.commands];
    const first = commands[0];
    const last = commands.at(-1);
    const expectedFrom = endpoint === 'end' ? left : right;
    const expectedTo = endpoint === 'end' ? right : left;
    const same = (a: IRPosition, b: IRPosition): boolean => round(a[0]) === round(b[0]) && round(a[1]) === round(b[1]);
    const lastPoint = last === undefined ? undefined : commandEndpoint(last);
    if (
      commands.length === 0 ||
      first.kind !== 'move' ||
      lastPoint === undefined ||
      !same(first.to, expectedFrom) ||
      !same(lastPoint, expectedTo) ||
      commands.slice(1).some(command => command.kind === 'move' || command.kind === 'close')
    ) {
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon cap must be a single open chain joining its side points.',
        details: {},
      });
    }
    commandBoundsPoints(commands);
    let cursor = first.to;
    for (const command of commands.slice(1)) {
      if (command.kind === 'arc' || command.kind === 'ellipseArc') {
        const start = commandEndpoint({ ...command, endAngle: command.startAngle });
        if (start === undefined || point.distance(start, cursor) > 0.01)
          throw new RetikzExtensionError({
            code: RetikzExtensionErrorCode.GeometryInvalid,
            message: 'Ribbon cap arc is disconnected.',
            details: {},
          });
      }
      cursor = commandEndpoint(command) ?? cursor;
    }
    return { center, outward, left, right, commands };
  } catch (cause) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: `Ribbon ${endpoint} cap '${cap.name}' failed at ${endpoint}.cap: ${cause instanceof Error ? cause.message : String(cause)}`,
      details: { endpoint, name: cap.name, path: `${endpoint}.cap` },
      cause,
    });
  }
};
