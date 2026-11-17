import type { AnyCompositeDefinition } from '@retikz/core';

import { executeWeaveCompilation } from './scheduler';
import type { WeaveExecutionContext, WeaveUpdateRequest } from './scheduler';

/** 为新候选树选择全部作者声明，不读取已提交产物 */
export const executeWeaveMount = <TComposite extends AnyCompositeDefinition>(context: WeaveExecutionContext) => {
  const pending = new Map<string, WeaveUpdateRequest>();
  for (const [entry, path] of context.paths) {
    pending.set(JSON.stringify(path), {
      entry,
      inputs: [],
      consume: () => {
        context.transaction.editState(entry).pendingInputs = [];
      },
    });
  }
  return executeWeaveCompilation<TComposite>(context, { canReuse: () => false, retained: new Map(), pending });
};
