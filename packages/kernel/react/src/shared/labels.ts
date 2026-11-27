/** 保留仅配置时的标签形态，子标签按声明顺序追加 */
export const mergeLabels = <TLabel extends object>(
  configured: TLabel | Array<TLabel> | undefined,
  children: Array<TLabel>,
): TLabel | Array<TLabel> | undefined => {
  if (children.length === 0) return configured;
  if (configured === undefined) return children.length === 1 ? children[0] : children;
  return Array.isArray(configured) ? [...configured, ...children] : [configured, ...children];
};
