import { compileToScene } from '../../../src/compile/compile';
import type { PathCommand, PathPrim, Scene, ScenePrimitive } from '../../../src/contract';
import type { IRChild, IRPathBase, IRScene, IRStep } from '../../../src/schemas';

/** 取顶层场景中的第一条路径；不存在时使测试失败 */
export const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

/** 将步骤包装为仅含一条路径的测试场景，并应用路径属性覆盖 */
export const pathIr = (children: Array<IRStep>, overrides: Omit<IRPathBase, 'type' | 'children'> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'path', ...overrides, children }],
});

/** 将子元素包装为最小测试场景 */
export const sceneIr = (children: Array<IRChild>): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

/** 编译单条测试路径并取出场景结果 */
export const pathScene = (children: Array<IRStep>, overrides: Omit<IRPathBase, 'type' | 'children'> = {}): Scene =>
  compileToScene(pathIr(children, overrides)).scene;

/** 编译测试步骤并读取第一条路径的结构化命令 */
export const pathCommands = (
  children: Array<IRStep>,
  overrides: Omit<IRPathBase, 'type' | 'children'> = {},
): Array<PathCommand> => findPathPrim(pathScene(children, overrides).primitives).commands;
