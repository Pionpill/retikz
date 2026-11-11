import type { ScopeExecutionSteps } from '../../compile/execution';
import type { WeaveTaskGraph } from '../schedule';

/** 登记 Scope 阶段依赖，只有最终输出就绪后才关闭本次 Scope 计算 */
export const compileWeaveScope = (graph: WeaveTaskGraph, key: string, prepare: () => ScopeExecutionSteps): void => {
  let steps: ScopeExecutionSteps | undefined;
  graph.add(`${key}:prepare`, [], () => {
    steps = prepare();
  });
  graph.add(`${key}:children`, [`${key}:prepare`], () => steps!.children());
  graph.add(`${key}:envelope`, [`${key}:children`], () => steps!.envelope());
  graph.add(`${key}:project`, [`${key}:envelope`], () => steps!.project());
  graph.add(`${key}:paths`, [`${key}:project`], () => steps!.paths());
  graph.add(`${key}:output`, [`${key}:paths`], () => {
    steps!.dispose();
    const publish = steps!.publish;
    steps = undefined;
    publish();
  });
  try {
    graph.require(`${key}:output`);
  } finally {
    steps?.dispose();
  }
};
