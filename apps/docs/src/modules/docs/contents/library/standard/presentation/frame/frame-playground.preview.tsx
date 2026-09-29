import { Draw, Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react/presentation';

/** 图形参数 */
export type FramePlaygroundPreviewValues = {
  borderLineStyle: 'solid' | 'dotted' | 'dashed';
  borderStroke: 'currentColor' | 'dimgray' | 'dodgerblue' | 'darkorange';
  strokeWidth: number;
  strokeOpacity: number;
  fillOpacity: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  headerDirection: 'horizontal' | 'vertical';
  borderCornerRadius: number;
  titleFillOpacity: number;
  titleFontSize: 'sm' | 'xs' | 'base' | 'lg';
  titleFontWeight: number;
  titlePadding: number;
  descriptionFontSize: 'sm' | 'xs' | 'base';
  descriptionOpacity: number;
  nodeAText: string;
  nodeBText: string;
  connected: boolean;
};

/** 绘制示例图形 */
export const renderFramePlaygroundPreview = (values: FramePlaygroundPreviewValues) => {
  const borderLineStyle =
    values.borderLineStyle === 'dashed'
      ? { dashPattern: [6, 4] }
      : values.borderLineStyle === 'dotted'
        ? { dashPattern: [1, 4], lineCap: 'round' as const }
        : {};
  const borderStyle = {
    stroke: values.borderStroke,
    strokeWidth: values.strokeWidth,
    strokeOpacity: values.strokeOpacity,
    fill: 'dodgerblue',
    fillOpacity: values.fillOpacity,
    ...borderLineStyle,
  };

  return (
    <Layout viewBox={{ x: 0, y: 0, width: 420, height: 260 }}>
      <Frame
        id="frame-playground"
        padding={{ x: values.paddingX, y: values.paddingY }}
        gap={values.gap}
        headerDirection={values.headerDirection}
        border={{ style: borderStyle, cornerRadius: values.borderCornerRadius }}
      >
        <FrameTitle
          style={{
            fill: 'dodgerblue',
            fillOpacity: values.titleFillOpacity,
            font: { size: values.titleFontSize, weight: values.titleFontWeight },
          }}
          layout={{ padding: values.titlePadding }}
        >
          FrameTitle
        </FrameTitle>
        <FrameDescription style={{ font: { size: values.descriptionFontSize }, opacity: values.descriptionOpacity }}>
          FrameDescription
        </FrameDescription>
        <Node id="A" position={[130, 165]} text={values.nodeAText} />
        <Node id="B" position={[290, 165]} text={values.nodeBText} />
      </Frame>
      {values.connected ? <Draw way={['A', 'B']} style={{ stroke: 'gray' }} /> : null}
    </Layout>
  );
};
