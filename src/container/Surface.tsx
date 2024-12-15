import { CSSProperties, FC, PropsWithChildren, useMemo } from 'react';

export type SurfaceProps = {
  title?: string;
  desc?: string;
  width?: string | number;
  height?: string | number;
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  className?: string;
  style?: CSSProperties;
};

const Surface: FC<PropsWithChildren<SurfaceProps>> = props => {
  const { title, desc, viewBox, children, width, height, ...otherProps } = props;

  const svgViewBox = useMemo(() => {
    if (!viewBox?.x && !viewBox?.y) {
      return undefined;
    }
    const viewX = viewBox?.x || 0;
    const viewY = viewBox?.y || 0;
    const viewWidth = viewBox?.width || width;
    const viewHeight = viewBox?.height || height;
    return viewWidth === undefined || viewHeight === undefined
      ? [viewX, viewY].join(' ')
      : [viewX, viewY, viewWidth, viewHeight].join(' ');
  }, [width, height, viewBox]);
  
  return (
    <svg viewBox={svgViewBox} width={width} height={height} {...otherProps}>
      {title ? <title>{title}</title> : null}
      {desc ? <desc>{desc}</desc> : null}
      {children}
    </svg>
  );
};

export default Surface;
