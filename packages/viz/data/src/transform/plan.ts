import type { DataTransformModel } from '../model';
import type { AnyStatisticsReducerDefinition, IRDataReducerOperation } from '../operators/reducer';
import type { AnyRegressionDefinition, IRRegressionMethod } from '../operators/regression';
import type { AnyRowSelectorDefinition, IRDataSelectorOperation } from '../operators/selector';
import type { AnyTransformDefinition } from './contract';
import type { IRDataExecution } from './declaration';
import type { IRDataTransform } from './types';

/** 变换的精确统计依赖及本次请求的语义身份 */
export type DataTransformDependency =
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'reducer';
      /** 该依赖的精确操作声明 */
      operation: IRDataReducerOperation;
      /** 与操作匹配的语义定义 */
      definition: AnyStatisticsReducerDefinition;
    }>
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'selector';
      /** 该依赖的精确操作声明 */
      operation: IRDataSelectorOperation;
      /** 与操作匹配的语义定义 */
      definition: AnyRowSelectorDefinition;
    }>
  | Readonly<{
      /** 区分归约、行选择与拟合依赖 */
      type: 'regression';
      /** 该依赖的精确操作声明 */
      operation: IRRegressionMethod;
      /** 与操作匹配的语义定义 */
      definition: AnyRegressionDefinition;
    }>;

/** 按声明顺序解析的单个变换阶段 */
export type DataTransformStage = Readonly<{
  /** 当前阶段的唯一语义身份 */
  definition: AnyTransformDefinition;
  /** 精确 schema 解析后的参数 */
  operation: IRDataTransform;
  /** 此声明的稀疏配置 */
  dataExecution?: IRDataExecution;
  /** 全部间接计算依赖 */
  dependencies: Array<DataTransformDependency>;
  /** 当前阶段的完整预期输出模型 */
  outputModel: DataTransformModel;
}>;

/** 不依赖行数据的语义解析结果 */
export type DataTransformResolution = Readonly<{
  /** 第一阶段输入模型 */
  inputModel: DataTransformModel;
  /** 固定声明顺序的阶段 */
  stages: Array<DataTransformStage>;
}>;
