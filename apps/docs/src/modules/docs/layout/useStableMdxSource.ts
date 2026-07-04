import { useState } from 'react';

/** 与当前已渲染 MDX 内容配对的稳定 source。 */
export type StableMdxSource = {
  stableSource: string | null;
  stableSegments: Array<string> | null;
};

/** 保留上一份非空 MDX source，避免路由切换时内容闪空。 */
export const useStableMdxSource = (
  source: string | null,
  sourceSegments: Array<string> | null,
): StableMdxSource => {
  const [stableSource, setStableSource] = useState<string | null>(source);
  const [stableSegments, setStableSegments] = useState<Array<string> | null>(sourceSegments);
  if (source != null && source !== stableSource) {
    setStableSource(source);
    setStableSegments(sourceSegments);
  }
  return { stableSource, stableSegments };
};
