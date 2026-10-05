import type { AnyChannelDefinition } from '../../../contract';
import { NODE_CHANNELS } from './node';
import { PATH_CHANNELS } from './path';
import { SCOPE_CHANNELS } from './scope';

export {
  BUILTIN_NODE_CHANNELS,
  NODE_CHANNELS,
  OPACITY_MIN,
  SIZE_MAX_RADIUS,
  SIZE_MIN_RADIUS,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
} from './node';
export * from './paint';
export { BUILTIN_PATH_CHANNELS, PATH_CHANNELS } from './path';
export * from './position';
export { BUILTIN_SCOPE_CHANNELS, SCOPE_CHANNELS } from './scope';
export * from './text';

/** 汇集向 Core 节点、路径与作用域交付属性的内置通道定义 */
export const DELIVERY_CHANNELS: ReadonlyArray<AnyChannelDefinition> = [
  ...NODE_CHANNELS,
  ...PATH_CHANNELS,
  ...SCOPE_CHANNELS,
];
