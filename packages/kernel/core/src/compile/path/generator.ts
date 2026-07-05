import type { PathCommand,PathGeneratorDefinition } from '../../contract';
import type { IRPosition, IRStep } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';

const EMPTY_PATH_GENERATORS: ReadonlyMap<string, PathGeneratorDefinition> = new Map();

/** 有限数 */
const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** 有限坐标点 `[number, number]` */
const isFinitePoint = (pt: unknown): boolean =>
  Array.isArray(pt) && pt.length >= 2 && isFiniteNum(pt[0]) && isFiniteNum(pt[1]);

/** 校验 path generator 产出的单条命令可写入 Scene。 */
const assertValidGeneratedCommand = (name: string, cmd: unknown): void => {
  const bad = (detail: string): never => {
    throw new Error(`path generator '${name}' produced a ${detail}.`);
  };
  if (cmd === null || typeof cmd !== 'object') {
    bad(`non-object command (expected an object with a 'kind')`);
    return;
  }
  const c = cmd as Record<string, unknown>;
  switch (c.kind) {
    case 'move':
    case 'line':
      if (!isFinitePoint(c.to)) bad(`non-finite coordinate in a '${String(c.kind)}' command`);
      break;
    case 'quad':
      if (!isFinitePoint(c.control) || !isFinitePoint(c.to)) bad(`non-finite coordinate in a 'quad' command`);
      break;
    case 'cubic':
      if (!isFinitePoint(c.control1) || !isFinitePoint(c.control2) || !isFinitePoint(c.to))
        bad(`non-finite coordinate in a 'cubic' command`);
      break;
    case 'arc':
      if (!isFinitePoint(c.center) || !isFiniteNum(c.radius) || !isFiniteNum(c.startAngle) || !isFiniteNum(c.endAngle))
        bad(`non-finite value in an 'arc' command`);
      break;
    case 'ellipseArc':
      if (
        !isFinitePoint(c.center) ||
        !isFiniteNum(c.radiusX) ||
        !isFiniteNum(c.radiusY) ||
        !isFiniteNum(c.startAngle) ||
        !isFiniteNum(c.endAngle)
      )
        bad(`non-finite value in an 'ellipseArc' command`);
      break;
    case 'close':
      break;
    default:
      bad(`command with unknown kind '${String(c.kind)}'`);
  }
};

export const lowerGeneratorStepToCommands = (args: {
  step: Extract<IRStep, { kind: 'generator' }>;
  generators?: ReadonlyMap<string, PathGeneratorDefinition>;
  from: IRPosition;
  to?: IRPosition;
  round: (n: number) => number;
  resolveTargetParam: (value: unknown) => IRPosition | undefined;
}): Array<PathCommand> => {
  const { step, from, to, round, resolveTargetParam } = args;
  const generators = args.generators ?? EMPTY_PATH_GENERATORS;
  const def = providerDefinitionOf(generators, step.name, {
    capability: 'path generator',
    optionName: 'pathGenerators',
  });

  const parsed = def.paramsSchema.parse(step.params);
  JsonObjectSchema.parse(parsed);
  const paramsObj = parsed as Record<string, unknown>;

  const resolvedTargets: Record<string, IRPosition> = {};
  for (const key of def.targetParams ?? []) {
    if (key.includes('.')) continue;
    const raw = paramsObj[key];
    if (raw === undefined) continue;
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
    throw new Error(`path generator '${step.name}' threw: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }
  if (!Array.isArray(produced)) {
    throw new Error(
      `path generator '${step.name}' must return an array of path commands; got ${produced === null ? 'null' : typeof produced}.`,
    );
  }
  for (const cmd of produced) assertValidGeneratedCommand(step.name, cmd);
  return produced as Array<PathCommand>;
};
