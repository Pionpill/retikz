/** 判断两个数组内容是否相同 */
export const isSameArray = (arr1: unknown[], arr2: unknown[]) => {
    if (arr1.length !== arr2.length) return false
    const length = arr1.length;
    for (let i = 0; i < length; i++) {
        if (arr1[i] !== arr2[i]) return false
    }
    return true;
}

/** 判断两个对象是否相同 */
export const isSameObj = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false
    const keys = Object.keys(obj1);
    for (let i = 0; i < keys.length; i++) {
        if (obj1[keys[i]] !== obj2[keys[i]]) return false
    }
    return true;
}