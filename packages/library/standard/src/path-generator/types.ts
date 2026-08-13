import type { StandardPathGeneratorName as StandardPathGeneratorNames } from './constants';

/** Standard 可选路径生成器名称 */
export type StandardPathGeneratorNameValue =
  (typeof StandardPathGeneratorNames)[keyof typeof StandardPathGeneratorNames];
