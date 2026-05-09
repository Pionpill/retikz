import zhJson from './zh.json';

/** 中文文案。结构同 en.json；新增 key 时两边同步。i18n-ally 直接读取 zh.json。 */
export const zh = zhJson;

/** 资源结构由 zh 推导（由 JSON 收敛成 string，让 en 等其它语言能赋值） */
export type I18nResources = typeof zh;

export default zh;
