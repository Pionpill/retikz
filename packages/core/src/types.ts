/** 获取对象所有值的联合类型，等价于 (typeof T)[keyof typeof T] */
export type ValueOf<T extends object> = T[keyof T];
