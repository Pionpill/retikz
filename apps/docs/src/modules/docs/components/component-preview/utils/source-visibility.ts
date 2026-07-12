/** 解析源码区可见性；全局隐藏优先于卡片本地状态。 */
export const resolvePreviewCodeVisible = (globalHideCode: boolean, localIsCodeVisible: boolean | undefined): boolean =>
  !globalHideCode && (localIsCodeVisible ?? false);
