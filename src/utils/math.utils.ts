/** 判断值是否在范围内 */
export const between = (value: number, range: [number, number]) => {
    return value >= range[0] && value <= range[1];
}