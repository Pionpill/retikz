import type {
  IRNode,
  IRCoordinate,
  IRPathBase,
  InputScopeCompile,
  ScopeGeometryPreparation,
  BoundaryGeometryContext,
} from '@retikz/core';

import {
  compileWeaveNode,
  compileWeaveCoordinate,
  compileWeavePath,
  compileWeaveScope,
  prepareWeaveScope,
} from '../helpers/atomic-elements';
import { runWeaveCompilation } from '../helpers/atomic-runtime';
import type { WeaveCompileOptions } from '../helpers/atomic-runtime';

/** 在真实 Weave 候选工作区中组合节点，供行为测试使用 */
export const testCompileNode = (input: IRNode, options: WeaveCompileOptions) =>
  runWeaveCompilation(options, runtime => compileWeaveNode(input, runtime));
/** 在真实 Weave 候选工作区中组合坐标，供行为测试使用 */
export const testCompileCoordinate = (input: IRCoordinate, options: WeaveCompileOptions) =>
  runWeaveCompilation(options, runtime => compileWeaveCoordinate(input, runtime));
/** 在真实 Weave 候选工作区中组合路径，供行为测试使用 */
export const testCompilePath = (input: IRPathBase, options: WeaveCompileOptions) =>
  runWeaveCompilation(options, runtime => compileWeavePath(input, runtime));
/** 在真实 Weave 候选工作区中组合Scope 前置阶段，供行为测试使用 */
export const testPrepareScopeCompilation = (input: InputScopeCompile, options: WeaveCompileOptions) =>
  runWeaveCompilation(options, runtime => prepareWeaveScope(input, runtime));
/** 在真实 Weave 候选工作区中组合Scope 后置阶段，供行为测试使用 */
export const testCompileScope = (
  input: InputScopeCompile,
  preparation: ScopeGeometryPreparation,
  layouts: ReadonlyArray<BoundaryGeometryContext>,
  options: WeaveCompileOptions,
) => runWeaveCompilation(options, runtime => compileWeaveScope(input, preparation, layouts, runtime));
