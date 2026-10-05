import { array, boolean, enum as zodEnum, union } from 'zod';

import { DataExpandComponent } from './constants';

/** 校验嵌套 JSON 的展开策略：全部展开、保持文本或仅展开指定的 Map／Array 结构 */
export const DataExpandSchema = union([boolean(), array(zodEnum(DataExpandComponent))])
  .default(true)
  .describe('Expand nested nonempty JSON structures: true for all, false for text, or selected map/array components.');
