import type { FC } from 'react';

import { ScalePositionFlow } from './scale-position-flow';

/** 中文位置比例尺解析流程图 */
const Demo: FC = () => (
  <ScalePositionFlow
    labels={{
      inputsTitle: '字段与图元',
      inputsDetail: '类型 · 角色 · 基线',
      scaleTitle: '比例尺类型',
      scaleDetail: '显式配置 · 自动派生',
      resolveTitle: '值域与范围',
      resolveDetail: '数据 · 坐标系范围',
      outputsTitle: '位置与格宽',
      outputsDetail: '图元 · 导引 · 刻度',
      derive: '派生',
      validate: '校验',
      map: '映射',
    }}
  />
);

export default Demo;
