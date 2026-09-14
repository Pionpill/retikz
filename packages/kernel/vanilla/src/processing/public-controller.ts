import { createDomProcessingController } from './internal/controller';
import type { ProcessingController, ProcessingOptions, ProcessingSource } from './types';

/** 创建只发布完整成功 revision 的 framework-neutral retained processing controller */
export const createProcessingController = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
): ProcessingController => createDomProcessingController(source, options);
