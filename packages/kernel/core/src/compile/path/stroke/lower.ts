import { isFiniteNumber, isFinitePoint } from '@retikz/math';

import type { PathCommand, PathGeneratorDefinition } from '../../../contract';
import type { CanonicalStep } from '../../../resolve/path';
import type { IRPosition } from '../../../schemas';

import { providerDefinitionOf } from '../../../providers/registry/index';
import { CompositeContractError, LayoutProbeRecoverableError, safeThrownDetail } from '../../../resolve/diagnostics';
import { parseProviderPayload } from '../../../resolve/provider-payload';
import { JsonObjectSchema } from '../../../schemas';
import { withProviderOutputValidationBoundary } from '../../scene-primitive';

const EMPTY_PATH_GENERATORS: ReadonlyMap<string, PathGeneratorDefinition> = new Map();

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
  step: Extract<CanonicalStep, { kind: 'generator' }>;
  generators?: ReadonlyMap<string, PathGeneratorDefinition>;
  from: IRPosition;
  to?: IRPosition;
  round: (n: number) => number;
  resolveTargetParam: (value: unknown) => IRPosition | undefined;
  irPath: string;
}): Array<PathCommand> => {
  const { step, from, to, round, resolveTargetParam, irPath } = args;
  const generators = args.generators ?? EMPTY_PATH_GENERATORS;
  const def = providerDefinitionOf(generators, step.name, {
    capability: 'path generator',
    optionName: 'pathGenerators',
  });

  const paramsPath = `${irPath}.params`;
  const parsed = parseProviderPayload({
    capability: 'path generator',
    providerName: step.name,
    irPath: paramsPath,
    payloadName: 'params',
    schema: def.paramsSchema,
    value: step.params,
  });
  parseProviderPayload({
    capability: 'path generator',
    providerName: step.name,
    irPath: paramsPath,
    payloadName: 'params',
    schema: JsonObjectSchema,
    value: parsed,
  });
  const paramsObj = parsed;

  const resolvedTargets: Record<string, IRPosition> = {};
  for (const key of def.targetParams ?? []) {
    if (key.includes('.')) continue;
    if (!Object.hasOwn(paramsObj, key)) continue;
    const raw = paramsObj[key];
    if (raw === null || (typeof raw !== 'string' && typeof raw !== 'object')) {
      throw new Error(
        `path generator '${step.name}' targetParams key '${key}' must be a target (node id, coordinate, or target object); got ${raw === null ? 'null' : typeof raw}.`,
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
    throw new LayoutProbeRecoverableError(`path generator '${step.name}' threw: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `path-generator:${step.name}`,
    });
  }
  return withProviderOutputValidationBoundary(`path generator '${step.name}'`, () => {
    if (!Array.isArray(produced)) {
      throw new CompositeContractError(
        `path generator '${step.name}' must return an array of path commands; got ${produced === null ? 'null' : typeof produced}.`,
      );
    }
    return Array.from(produced, command => parseGeneratedCommand(step.name, command));
  });
};
