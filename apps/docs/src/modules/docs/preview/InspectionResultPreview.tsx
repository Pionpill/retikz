import { useTheme } from '@retikz/react';
import type { FC } from 'react';
import { useId } from 'react';

import type { InspectionResultPreviewProps } from './inspect';
import { buildInspectionPreview } from './inspect';

/** 两个独立 SVG 使用同一视口，不把辅助结果写入主图 */
export const InspectionResultPreview: FC<InspectionResultPreviewProps> = props => {
  const id = useId();
  const theme = useTheme();
  const output = buildInspectionPreview(props, id, theme);
  return (
    <div style={{ position: 'relative' }}>
      <div dangerouslySetInnerHTML={{ __html: output.primary }} />
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: output.auxiliary }}
      />
    </div>
  );
};
