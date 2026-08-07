/** 获取对象全部属性值的联合类型 */
export type ValueOf<T extends object> = T[keyof T];

/** 保留字符串字面量提示并允许其它字符串值 */
export type OpenString<T extends string> = T | (string & {});
