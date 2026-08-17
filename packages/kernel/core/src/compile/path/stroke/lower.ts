import { isFiniteNumber, isFinitePoint } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import type { PathGeneratorResolution } from '../../../resolve';
import type { IRPosition } from '../../../schemas';

import { CompositeContractError, LayoutProbeRecoverableError, safeThrownDetail } from '../../../resolve/diagnostics';
import { withProviderOutputValidationBoundary } from '../../scene-primitive';

/** 校验 generator 命令并返回只含 canonical 字段的 detached command */
const parseGeneratedCommand = (name: string, command: unknown): PathCommand => {
  const bad = (detail: string): never => {
    throw new CompositeContractError(`path generator '${name}' produced a ${detail}.`);
  };
  if (command === null || typeof command !== 'object' || Array.isArray(command)) {
    return bad(`invalid path command`);
  }
  const candidate = command as Record<PropertyKey, unknown>;
  const kind = candidate.kind;
  if (typeof kind !== 'string') {
    return bad(`command with unknown kind '${String(kind)}'`);
  }
  const invalidPoint = (): never => bad(`non-finite coordinate in a '${kind}' command`);
  const finitePoint = (value: unknown): IRPosition => {
    if (!Array.isArray(value)) return invalidPoint();
    const length = value.length;
    const x = value[0];
    const y = value[1];
    const point = [x, y];
    if (length !== 2 || !isFinitePoint(point)) return invalidPoint();
    return point;
  };
  const optionalDirection = (value: unknown): boolean | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') return bad(`invalid '${kind}' command`);
    return value;
  };
  switch (kind) {
    case 'move': {
      const to = finitePoint(candidate.to);
      return { kind: 'move', to };
    }
    case 'line': {
      const to = finitePoint(candidate.to);
      return { kind: 'line', to };
    }
    case 'quad': {
      const control = finitePoint(candidate.control);
      const to = finitePoint(candidate.to);
      return { kind: 'quad', control, to };
    }
    case 'cubic': {
      const control1 = finitePoint(candidate.control1);
      const control2 = finitePoint(candidate.control2);
      const to = finitePoint(candidate.to);
      return { kind: 'cubic', control1, control2, to };
    }
    case 'arc': {
      const center = finitePoint(candidate.center);
      const radius = candidate.radius;
      const startAngle = candidate.startAngle;
      const endAngle = candidate.endAngle;
      const counterClockwise = optionalDirection(candidate.counterClockwise);
      if (!isFiniteNumber(radius) || radius <= 0 || !isFiniteNumber(startAngle) || !isFiniteNumber(endAngle)) {
        return bad(`invalid 'arc' command`);
      }
      return {
        kind: 'arc',
        center,
        radius,
        startAngle,
        endAngle,
        ...(counterClockwise === undefined ? {} : { counterClockwise }),
      };
    }
    case 'ellipseArc': {
      const center = finitePoint(candidate.center);
      const radiusX = candidate.radiusX;
      const radiusY = candidate.radiusY;
      const rotation = candidate.rotation;
      const startAngle = candidate.startAngle;
      const endAngle = candidate.endAngle;
      const counterClockwise = optionalDirection(candidate.counterClockwise);
      if (
        !isFiniteNumber(radiusX) ||
        radiusX <= 0 ||
        !isFiniteNumber(radiusY) ||
        radiusY <= 0 ||
        (rotation !== undefined && !isFiniteNumber(rotation)) ||
        !isFiniteNumber(startAngle) ||
        !isFiniteNumber(endAngle)
      ) {
        return bad(`invalid 'ellipseArc' command`);
      }
      return {
        kind: 'ellipseArc',
        center,
        radiusX,
        radiusY,
        ...(rotation === undefined ? {} : { rotation }),
        startAngle,
        endAngle,
        ...(counterClockwise === undefined ? {} : { counterClockwise }),
      };
    }
    case 'close':
      return { kind: 'close' };
    default:
      return bad(`command with unknown kind '${kind}'`);
  }
};

export const lowerGeneratorStepToCommands = (args: {
  resolution: PathGeneratorResolution;
  from: IRPosition;
  to?: IRPosition;
  round: (n: number) => number;
  resolveTargetParam: (value: unknown) => IRPosition | undefined;
}): Array<PathCommand> => {
  const { resolution, from, to, round, resolveTargetParam } = args;
  const def = resolution.definition;
  const paramsObj = resolution.params;

  const resolvedTargets: Record<string, IRPosition> = {};
  for (const key of def.targetParams ?? []) {
    if (key.includes('.')) continue;
    if (!Object.hasOwn(paramsObj, key)) continue;
    const raw = paramsObj[key];
    if (raw === null || (typeof raw !== 'string' && typeof raw !== 'object')) {
      throw new Error(
        `path generator '${resolution.name}' targetParams key '${key}' must be a target (node id, coordinate, or target object); got ${raw === null ? 'null' : typeof raw}.`,
      );
    }
    const resolved = resolveTargetParam(raw);
    if (resolved) resolvedTargets[key] = resolved;
  }

  let produced: unknown;
  try {
    produced = def.generate({
      from,
      ...(to !== undefined ? { to } : {}),
      params: paramsObj,
      resolvedTargets,
      round,
    });
  } catch (e) {
    throw new LayoutProbeRecoverableError(`path generator '${resolution.name}' threw: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `path-generator:${resolution.name}`,
    });
  }
  return withProviderOutputValidationBoundary(`path generator '${resolution.name}'`, () => {
    if (!Array.isArray(produced)) {
      throw new CompositeContractError(
        `path generator '${resolution.name}' must return an array of path commands; got ${produced === null ? 'null' : typeof produced}.`,
      );
    }
    return Array.from(produced, command => parseGeneratedCommand(resolution.name, command));
  });
};
