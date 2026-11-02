/** segment 自身 opacity 与宿主 opacity 相乘（任一缺省取另一个） */
export const combineOpacity = (segment?: number, host?: number): number | undefined =>
  segment !== undefined ? (host !== undefined ? segment * host : segment) : host;
