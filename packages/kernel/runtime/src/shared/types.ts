/** 获取对象全部属性值的联合类型 */
export type ValueOf<T extends object> = T[keyof T];
