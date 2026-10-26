import type { Lang } from '@/i18n';

import { createReferenceDataControls } from '../shared/reference-data-control-factory';

/** 当前几何的数据绑定控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => createReferenceDataControls('path', lang);
/** 默认控件状态 */
export const previewControlContract = createPreviewControlContract();
