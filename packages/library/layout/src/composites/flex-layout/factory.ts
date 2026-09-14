import { LAYOUT_NAMESPACE } from '../../shared';
import type { FlexLayoutInput, IRFlexLayout } from './types';

/** 创建稀疏持久化的 Layout FlexLayout composite */
export const createFlexLayout = (input: FlexLayoutInput): IRFlexLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'flexLayout',
  ...input,
});
