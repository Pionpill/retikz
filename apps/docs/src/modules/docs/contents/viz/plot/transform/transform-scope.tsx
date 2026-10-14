import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './transform-scope.controls';
import { TransformScopePreview } from './transform-scope.preview';

/** 预览器缺少注册信息时使用的中文控件 */
export const previewControls = previewControlContract.controls;

/** 双语视图复用相同结构与 canonical 状态 */
const localizedPreviews = {
  zh: defineControlledPreview(previewControlContract, (values, dimensions) =>
    TransformScopePreview(values, 'zh', dimensions),
  ),
  en: defineControlledPreview(createPreviewControlContract('en'), (values, dimensions) =>
    TransformScopePreview(values, 'en', dimensions),
  ),
};

/** 从 canonical 状态派生稳定源码 */
export const previewSource = localizedPreviews.zh.source;

/** 作用域示例的文档语言 */
export type TransformScopeProps = { lang?: Lang };

/** 两层点展示根级与图元局部作用域 */
const TransformScope: FC<TransformScopeProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = localizedPreviews[lang].Component;
  return <Preview />;
};

export default TransformScope;
