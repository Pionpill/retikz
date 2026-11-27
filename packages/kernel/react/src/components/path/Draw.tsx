import type { WayDSL } from '@retikz/vanilla';
import { parseWay } from '@retikz/vanilla';
import type { FC, ReactElement } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import { KernelDisplayName, mergeLabels } from '../../shared';
import type { PathProps } from './Path';
import { Path, readPathChildren } from './Path';
import { Step } from './Step';

/** Draw 的作者侧属性 */
export type DrawProps = Readonly<
  Omit<PathProps, 'children'> & {
    /** 路径走向简写 */
    way: WayDSL;
    /** 附加的整条路径标签，不接受额外步骤 */
    children?: ReactElement | ReadonlyArray<ReactElement>;
  }
>;

/**
 * 路径简写
 * @description 用 way 声明整条路径
 */
export const Draw: FC<DrawProps> = props => {
  const { way, children, label, ...path } = props;
  let pathLabel = label;
  if (children !== undefined) {
    const content = readPathChildren(children);
    if (content.steps.length) throw new RetikzReactError(RetikzReactErrorCode.Sugar, 'Draw 不能同时指定 way 和 Step');
    pathLabel = mergeLabels(label, content.labels);
  }
  return (
    <Path {...path} label={pathLabel}>
      {parseWay(way).map((step, index) => (
        <Step key={index} {...step} />
      ))}
    </Path>
  );
};
Draw.displayName = KernelDisplayName.Draw;
