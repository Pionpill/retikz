/** 判断两个数组内容是否相同 */
export const isSameArray = (arr1: Array<unknown>, arr2: Array<unknown>) => {
  if (arr1.length !== arr2.length) return false;
  for (const [index, value] of arr1.entries()) {
    if (value !== arr2[index]) return false;
  }
  return true;
};

/** 判断两个对象是否相同 */
export const isSameObj = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
  if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
  const keys = Object.keys(obj1);
  for (const key of keys) {
    if (obj1[key] !== obj2[key]) return false;
  }
  return true;
};
