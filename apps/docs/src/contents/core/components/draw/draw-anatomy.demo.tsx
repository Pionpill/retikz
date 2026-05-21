import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Draw 家族解剖图
 * @description 画一条 <Draw>（A→B→C，末端箭头）。下方灰色备注：Way（目标点数组）/ Step（一段）/
 *   Arrow（末端箭头，指向真正的箭头而非 Node C），整条标为 Draw (Sugar) / Path (Kernel)。
 *   纯技术 label，单文件共用。
 */
const Demo: FC = () => (
  <TikZ width={620} height={260}>
    {/* 主体：A→B→C 一条 Draw */}
    <Node id="aNode" position={[-200, -30]}>
      A
    </Node>
    <Node id="bNode" position={[0, -30]}>
      B
    </Node>
    <Node id="cNode" position={[200, -30]}>
      C
    </Node>
    <Draw way={['aNode', 'bNode', 'cNode']} arrow="->" />

    {/* 下方点注：Step / Way / Arrow，备注在下方、箭头朝上 */}
    <Node id="capStep" position={[-100, 35]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Step
    </Node>
    <Draw way={[[-100, 18], [-100, -22]]} arrow="->" stroke="gray" />

    <Node id="capWay" position={[0, 35]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Way
    </Node>
    <Draw way={[[0, 18], 'bNode']} arrow="->" stroke="gray" />

    <Node id="capArrow" position={[170, 35]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Arrow
    </Node>
    <Draw way={[[170, 18], [183, -23]]} arrow="->" stroke="gray" />

    {/* 整条 = Draw (Sugar) / Path (Kernel) */}
    <Node id="capWhole" position={[0, 80]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Draw (Sugar) / Path (Kernel)
    </Node>
  </TikZ>
);

export default Demo;
