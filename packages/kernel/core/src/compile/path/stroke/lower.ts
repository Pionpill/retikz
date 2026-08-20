import { isFiniteNumber, isFinitePoint } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import type { PathGeneratorResolution } from '../../../resolve';
import type { IRPosition } from '../../../schemas';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../../resolve/diagnostics';
import { withProviderOutputValidationBoundary } from '../../scene-primitive';

/** 校验 generator 命令的不变量并返回只含 canonical 字段的 detached command */
const snapshotGeneratedCommand = (name: string, command: PathCommand): PathCommand => {
  const bad = (detail: string): never => {
    throw createCompositeContractError(`path generator '${name}' produced a ${detail}.`);
  };
  const kind = command.kind;
  const invalidPoint = (): never => bad(`non-finite coordinate in a '${kind}' command`);
  const finitePoint = (value: IRPosition): IRPosition => {
    if (!isFinitePoint(value)) return invalidPoint();
    const point: IRPosition = [value[0], value[1]];
    return point;
  };
  switch (kind) {
    case 'move': {
      const to = finitePoint(command.to);
      return { kind: 'move', to };
    }
    case 'line': {
      const to = finitePoint(command.to);
      return { kind: 'line', to };
    }
    case 'quad': {
      const control = finitePoint(command.control);
      const to = finitePoint(command.to);
      return { kind: 'quad', control, to };
    }
    case 'cubic': {
      const control1 = finitePoint(command.control1);
      const control2 = finitePoint(command.control2);
      const to = finitePoint(command.to);
      return { kind: 'cubic', control1, control2, to };
    }
    case 'arc': {
      const center = finitePoint(command.center);
      const { radius, startAngle, endAngle, counterClockwise } = command;
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
      const center = finitePoint(command.center);
      const { radiusX, radiusY, rotation, startAngle, endAngle, counterClockwise } = command;
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
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
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
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `path generator '${resolution.name}' targetParams key '${key}' must be a target (node id, coordinate, or target object); got ${raw === null ? 'null' : typeof raw}.`,
      );
    }
    const resolved = resolveTargetParam(raw);
    if (resolved) resolvedTargets[key] = resolved;
  }

  let produced: Array<PathCommand>;
  try {
    produced = def.generate({
      from,
      ...(to !== undefined ? { to } : {}),
      params: paramsObj,
      resolvedTargets,
      round,
    });
  } catch (e) {
    throw createLayoutProbeRecoverableError(`path generator '${resolution.name}' threw: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `path-generator:${resolution.name}`,
    });
  }
  return withProviderOutputValidationBoundary(`path generator '${resolution.name}'`, () =>
    Array.from(produced, command => snapshotGeneratedCommand(resolution.name, command)),
  );
};
