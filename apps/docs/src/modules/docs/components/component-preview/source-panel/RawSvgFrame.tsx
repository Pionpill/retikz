import type { FC } from 'react';

/** SVG 字符串渲染框属性。 */
export type RawSvgFrameProps = {
  /** 待注入预览区的 SVG 字符串。 */
  svg: string;
};

/** 把一段 SVG 字符串注入预览区。 */
export const RawSvgFrame: FC<RawSvgFrameProps> = props => {
  const { svg } = props;

  return (
    <div
      className="flex max-h-full max-w-full [&>svg]:max-h-full [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
