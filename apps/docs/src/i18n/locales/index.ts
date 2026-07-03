import enResource from './en.json';
import zhResource from './zh.json';

/** 中文原始 JSON 文案。 */
export const zhJson = zhResource;

/** 中文文案。结构同 en.json；新增 key 时两边同步。i18n-ally 直接读取 zh.json。 */
export const zh = zhJson;

/** 资源结构由 zh 推导，供其它语言反向受类型约束。 */
export type I18nResources = typeof zh;

/** 英文原始 JSON 文案，结构受 zh.json 约束。 */
export const enJson: I18nResources = enResource;

/** English copy. Structure mirrors zh.json; keep keys in sync. */
export const en: I18nResources = enJson;
