import type { DataLineageOptions } from '../contract';

/** 将请求级事件开关转换为共享记录配置；具体默认值仍由 recorder 应用 */
export const resolveDataLineageOptions = (options?: boolean | DataLineageOptions): DataLineageOptions | undefined =>
  options === true ? {} : options === false ? undefined : options;
