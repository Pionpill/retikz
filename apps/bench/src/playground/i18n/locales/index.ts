import enResource from './en.json';
import zhResource from './zh.json';

/** 中文文案结构真源 */
export const zh = zhResource;

/** Bench 国际化资源结构 */
export type I18nResources = typeof zh;

/** 英文文案，结构受中文资源约束 */
export const en: I18nResources = enResource;
