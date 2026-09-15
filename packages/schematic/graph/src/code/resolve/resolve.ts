import type { IRBlock } from '../../schemas/block';
import type { IRCodeBlock } from '../schemas';
import { CodeBlockPropsSchema } from '../schemas';

/** 从实体事实投射唯一 Block 外壳；不复制领域字段或已转移的 theme */
export const resolveCodeBlockSurface = (
  source: IRCodeBlock,
): Omit<IRBlock, 'namespace' | 'type' | 'children' | 'theme'> => {
  const fields = Object.keys(CodeBlockPropsSchema.shape).filter(
    key => !['name', 'description', 'icon', 'trail', 'theme'].includes(key),
  );
  return Object.fromEntries(fields.filter(key => key in source).map(key => [key, source[key as keyof IRCodeBlock]]));
};
