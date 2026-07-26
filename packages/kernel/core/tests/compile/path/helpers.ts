import type { PathCommand, PathPrim, Scene, ScenePrimitive } from '../../../src/contract';
import type { IRChild, IRPathBase, IRScene, IRStep } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';

export const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

export const pathIr = (children: Array<IRStep>, overrides: Omit<IRPathBase, 'type' | 'children'> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'path', ...overrides, children }],
});

export const sceneIr = (children: Array<IRChild>): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

export const pathScene = (children: Array<IRStep>, overrides: Omit<IRPathBase, 'type' | 'children'> = {}): Scene =>
  compileToScene(pathIr(children, overrides)).scene;

export const pathCommands = (
  children: Array<IRStep>,
  overrides: Omit<IRPathBase, 'type' | 'children'> = {},
): Array<PathCommand> => findPathPrim(pathScene(children, overrides).primitives).commands;
