import { FlexLayoutInspectOptionsSchema } from '../../flex-layout/schemas';
import type { FlexLayoutInspectOptions } from '../../flex-layout/types';
import { resolveBaseLayoutInspectOptions } from '../shared';
import type { CanonicalFlexLayoutInspectOptions } from './types';

/** 解析 Flex 观测选项的共享简写与专属默认 */
export const resolveFlexLayoutInspectOptions = (
  options: FlexLayoutInspectOptions,
): CanonicalFlexLayoutInspectOptions => {
  const defaultOptions = FlexLayoutInspectOptionsSchema.parse({});
  return {
    ...resolveBaseLayoutInspectOptions(options),
    lines: options.lines ?? defaultOptions.lines,
    gaps: options.gaps ?? defaultOptions.gaps,
    distributedSpace: options.distributedSpace ?? defaultOptions.distributedSpace,
  };
};
