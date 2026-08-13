import type { StandardArrowName as StandardArrowNames } from './constants';

/** Standard 可选箭头 provider 名称 */
export type StandardArrowNameValue = (typeof StandardArrowNames)[keyof typeof StandardArrowNames];
