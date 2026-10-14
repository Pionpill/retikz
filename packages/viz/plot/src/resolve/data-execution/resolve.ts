import type { IRDataExecution } from '@retikz/data';

import type { IRPlotDataExecution } from '../../schemas';

/** 选择指定数据作用域的稀疏执行策略，保留 Data 执行器默认值及声明级覆盖 */
export const resolvePlotDataExecution = (
  execution: IRPlotDataExecution | undefined,
  scope: 'root' | 'marks',
): IRDataExecution | undefined => (execution !== undefined && 'root' in execution ? execution[scope] : execution);
