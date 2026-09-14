/** 文档正文引用的单个仓库源码入口 */
export type SourceLinkItem = {
  /** 面向读者的入口名称 */
  label: string;
  /** 仓库根目录下的相对路径 */
  path: string;
  /** 起始行号 */
  startLine?: number;
  /** 结束行号 */
  endLine?: number;
};
