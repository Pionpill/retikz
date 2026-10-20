import type { JsonValue } from '@retikz/foundation';

import type { CompileObservationOwner } from '../../contract';
import { createOwnerOutputPublisher, freezeOccurrence } from '../orchestration';
import type { CompileObservationContribution } from '../orchestration';
import type { ElementCompileOptions } from './types';

/** 收集独立元素的 owner 输出事实，不在计算阶段调用 observer.observe */
export const collectElementObservation = (
  context: ElementCompileOptions,
  owner: CompileObservationOwner,
  schema: { parse: (value: unknown) => unknown },
  project: () => JsonValue,
): ReadonlyArray<CompileObservationContribution> => {
  const occurrence = freezeOccurrence(context.occurrence ?? { sourcePath: context.irPath, expansionPath: [] });
  const output = createOwnerOutputPublisher(owner, occurrence.sourcePath, { schema }, context.observation);
  if (!output.publisher.requested) return [];
  output.publisher.publish(project());
  const value = output.value();
  if (value === undefined) return [];
  return [
    {
      owner,
      occurrence,
      origin: occurrence,
      ancestors: context.ancestors ?? [],
      scopeChain: [],
      value,
      observerKeys: output.keys,
      theme: context.scope.theme,
      scopeDefaults: context.scope.defaults,
    },
  ];
};
