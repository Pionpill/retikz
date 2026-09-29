import { Layout, Node, Path, Step } from '@retikz/react';
import type { ReactNode } from 'react';

const actionOf = (values: StepActionsPreviewValues): ReactNode => {
  switch (values.actionKind) {
    case 'line':
      return (
        <Path>
          <Step kind="move" to="A" />
          <Step kind="line" to="B" />
        </Path>
      );
    case 'move':
      return (
        <Path>
          <Step kind="move" to={[-90, -55]} />
          <Step kind="line" to={[-15, -5]} />
          <Step kind="move" to={[15, 5]} />
          <Step kind="line" to={[90, 55]} />
        </Path>
      );
    case 'fold':
      if (values.via === '-|-' || values.via === '|-|') {
        return (
          <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
            <Step kind="move" to="A" />
            <Step kind="fold" via={values.via} fraction={values.fraction} to="B" />
          </Path>
        );
      }
      return (
        <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
          <Step kind="move" to="A" />
          <Step kind="fold" via={values.via} to="B" />
        </Path>
      );
    case 'cycle':
      return (
        <Path style={{ fill: '#dbeafe' }}>
          <Step kind="move" to="A" />
          <Step kind="line" to="B" />
          <Step kind="line" to="C" />
          <Step kind="cycle" />
        </Path>
      );
    case 'rectangle':
      return (
        <Path style={{ fill: '#dbeafe' }}>
          <Step kind="rectangle" from={[-90, -55]} to={[90, 55]} cornerRadius={values.cornerRadius} />
        </Path>
      );
  }
};

/** 图形参数 */
export type StepActionsPreviewValues = {
  actionKind: 'fold' | 'line' | 'move' | 'cycle' | 'rectangle';
  via: '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
  cornerRadius: number;
};

/** 绘制示例图形 */
export const StepActionsPreview = (values: StepActionsPreviewValues) => {
  return (
    <Layout viewBox={{ x: -140, y: -120, width: 280, height: 240 }}>
      {values.actionKind !== 'rectangle' && values.actionKind !== 'move' && (
        <>
          <Node id="A" position={[-90, -45]} style={{ stroke: 'gray', dashed: true }}>
            a
          </Node>
          <Node id="B" position={[90, 45]} style={{ stroke: 'gray', dashed: true }}>
            b
          </Node>
          {values.actionKind === 'cycle' && (
            <Node id="C" position={[0, 90]} style={{ stroke: 'gray', dashed: true }}>
              c
            </Node>
          )}
        </>
      )}
      {values.actionKind === 'fold' && (
        <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
          <Step kind="move" to="A.center" />
          <Step kind="line" to="B.center" />
        </Path>
      )}
      {actionOf(values)}
    </Layout>
  );
};
