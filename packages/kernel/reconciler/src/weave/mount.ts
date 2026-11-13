import type { AnyCompositeDefinition } from '@retikz/core';

import { executeWeaveCompilation } from './scheduler';
import type { WeaveExecutionContext, WeaveUpdateRequest } from './scheduler';

/** 为新候选树选择全部作者声明，不读取已提交产物 */
export const executeWeaveMount = <TComposite extends AnyCompositeDefinition>(context: WeaveExecutionContext) => {
  const pending = new Map<string, WeaveUpdateRequest>();
  for (const [node, path] of context.paths) {
    pending.set(JSON.stringify(path), {
      node,
      inputs: [],
      consume: () => {
        context.transaction.editNode(node).pendingInputs = [];
      },
    });
  }
  return executeWeaveCompilation<TComposite>(context, { canReuse: () => false, retained: new Map(), pending });
};
