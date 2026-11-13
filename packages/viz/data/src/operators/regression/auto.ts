import { RetikzDataError, RetikzDataErrorCode } from '../../error';
import { computeDataValue, runDataComputation, runDataComputationAsync } from '../../shared';
import type { DataComputation } from '../../shared';
import type { RegressionFitContext, RegressionModel, RegressionPair } from './contract';
import { defineRegression, defineRegressionImplementation } from './contract';
import { evaluateRegression } from './evaluate';
import type { IRRegressionMethod } from './schema';
import { BUILTIN_REGRESSION_METHOD_SCHEMAS } from './schema';

/** 自动方法通过同一语义注册表声明候选 */
export const autoRegressionDefinition = defineRegression({
  schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Auto,
  dependencies: operation => operation.candidates,
});

/** 同步与异步驱动共用的候选评价，不以 Promise 完成顺序决定胜者 */
function* computeAutoRegression(
  pairs: ReadonlyArray<RegressionPair>,
  candidates: ReadonlyArray<IRRegressionMethod>,
  context: RegressionFitContext,
): DataComputation<RegressionModel> {
  let best: RegressionModel | undefined;
  let minimumError = Infinity;
  const exclusions: Array<{ index: number; method: IRRegressionMethod; cause: RetikzDataError }> = [];
  for (const [index, method] of candidates.entries()) {
    let model: RegressionModel;
    try {
      model = yield* computeDataValue(() => context.fitRegression(index, pairs));
    } catch (cause) {
      if (!(cause instanceof RetikzDataError) || cause.code !== RetikzDataErrorCode.RegressionNotApplicable)
        throw cause;
      exclusions.push({ index, method, cause });
      continue;
    }
    const score = evaluateRegression(pairs, model);
    if (score.meanSquaredError < minimumError) {
      minimumError = score.meanSquaredError;
      best = model;
    }
  }
  if (best === undefined)
    throw new RetikzDataError(
      `data: auto regression has no applicable candidates: ${exclusions.map(item => `[${item.index}] ${item.method.kind}: ${item.cause.message}`).join('; ')}`,
      { cause: exclusions },
    );
  return best;
}

/** 同一自动方法提供两种驱动能力，共享候选评价算法 */
export const autoRegressionImplementation = defineRegressionImplementation({
  definition: autoRegressionDefinition,
  fit: (pairs, operation, context) => runDataComputation(computeAutoRegression(pairs, operation.candidates, context)),
  fitAsync: (pairs, operation, context) =>
    runDataComputationAsync(computeAutoRegression(pairs, operation.candidates, context)),
});
