import {
  AnimationDirection,
  AnimationEasing,
  AnimationFill,
  AnimationProperty,
  AnimationTrigger,
  BendDirection,
  BlendMode,
  BuiltinArrowShape,
  BuiltinShape,
  FoldStepVia,
  FontStyle,
  FontWeightKeyword,
  GeometryLabelPosition,
  NodeTextAlign,
  PathCloseMode,
  PathFillRule,
  PathKind,
  PathLineCap,
  PathLineJoin,
  PathThickness,
  PatternShape,
  RibbonAlignment,
  RibbonMode,
  RibbonTaperInterpolation,
  ScopeBoundingShape,
  ShadowPreset,
  Side,
  WebFontSizePreset,
} from '@retikz/core';
import { DataFieldFormat, DataFieldType, DataSortOrder, FieldOrderMode } from '@retikz/data';
import {
  AxisPlacementKind,
  Cartesian1DOrientation,
  DensityBandwidthKind,
  FacetEmptyPolicy,
  JitterAxis,
  LegendOrient,
  LegendPosition,
  LegendSymbolFit,
  NormalizeBasis,
  PairMeasureOperationKind,
  PathClosureKind,
  PathCurve,
  ReferenceMarkKind,
  RelationGeometryKind,
  ScaffoldFrameMode,
  SmoothMethodKind,
  StackOffset,
} from '@retikz/plot';
import {
  AxesArrowMode,
  AxesLabelEnd,
  AxesTickExtent,
  AxesTickSide,
  AxesTickSourceKind,
  GridBorderOrder,
} from '@retikz/standard';
import {
  TableBorderKind,
  TableBorderMode,
  TableCellFit,
  TableCellOverflow,
  TableComposite,
  TableHorizontalAlignment,
  TableStructureKind,
  TableTrackSizeKind,
  TableVerticalAlignment,
} from '@retikz/table';
import { MathJaxExtension, MathJaxProfile } from '@retikz/tex';

/** API 值集合注册项 */
export type ApiValueRegistryEntry = {
  /** 按公开常量声明顺序展示的值 */
  values: ReadonlyArray<string>;
};

/** MDX 可引用的公开 API 值集合 */
export const API_VALUE_REGISTRY = {
  AnimationDirection: {
    values: Object.values(AnimationDirection),
  },
  AnimationEasing: {
    values: Object.values(AnimationEasing),
  },
  AnimationFill: {
    values: Object.values(AnimationFill),
  },
  AnimationProperty: {
    values: Object.values(AnimationProperty),
  },
  AnimationTrigger: {
    values: Object.values(AnimationTrigger),
  },
  AxesArrowMode: {
    values: Object.values(AxesArrowMode),
  },
  AxesLabelEnd: {
    values: Object.values(AxesLabelEnd),
  },
  AxesTickExtent: {
    values: Object.values(AxesTickExtent),
  },
  AxesTickSide: {
    values: Object.values(AxesTickSide),
  },
  AxesTickSourceKind: {
    values: Object.values(AxesTickSourceKind),
  },
  AxisPlacementKind: {
    values: Object.values(AxisPlacementKind),
  },
  BendDirection: {
    values: Object.values(BendDirection),
  },
  BlendMode: {
    values: Object.values(BlendMode),
  },
  BuiltinArrowShape: {
    values: Object.values(BuiltinArrowShape),
  },
  BuiltinShape: {
    values: Object.values(BuiltinShape),
  },
  Cartesian1DOrientation: {
    values: Object.values(Cartesian1DOrientation),
  },
  DataFieldFormat: {
    values: Object.values(DataFieldFormat),
  },
  DataFieldType: {
    values: Object.values(DataFieldType),
  },
  DataSortOrder: {
    values: Object.values(DataSortOrder),
  },
  DensityBandwidthKind: {
    values: Object.values(DensityBandwidthKind),
  },
  FacetEmptyPolicy: {
    values: Object.values(FacetEmptyPolicy),
  },
  FieldOrderMode: {
    values: Object.values(FieldOrderMode),
  },
  FoldStepVia: {
    values: Object.values(FoldStepVia),
  },
  FontStyle: {
    values: Object.values(FontStyle),
  },
  FontWeightKeyword: {
    values: Object.values(FontWeightKeyword),
  },
  GeometryLabelPosition: {
    values: Object.values(GeometryLabelPosition),
  },
  GridBorderOrder: {
    values: Object.values(GridBorderOrder),
  },
  JitterAxis: {
    values: Object.values(JitterAxis),
  },
  LegendOrient: {
    values: Object.values(LegendOrient),
  },
  LegendPosition: {
    values: Object.values(LegendPosition),
  },
  LegendSymbolFit: {
    values: Object.values(LegendSymbolFit),
  },
  MathJaxExtension: {
    values: Object.values(MathJaxExtension),
  },
  MathJaxProfile: {
    values: Object.values(MathJaxProfile),
  },
  NodeTextAlign: {
    values: Object.values(NodeTextAlign),
  },
  NormalizeBasis: {
    values: Object.values(NormalizeBasis),
  },
  PairMeasureOperationKind: {
    values: Object.values(PairMeasureOperationKind),
  },
  PathCloseMode: {
    values: Object.values(PathCloseMode),
  },
  PathClosureKind: {
    values: Object.values(PathClosureKind),
  },
  PathCurve: {
    values: Object.values(PathCurve),
  },
  PathFillRule: {
    values: Object.values(PathFillRule),
  },
  PathKind: {
    values: Object.values(PathKind),
  },
  PathLineCap: {
    values: Object.values(PathLineCap),
  },
  PathLineJoin: {
    values: Object.values(PathLineJoin),
  },
  PathThickness: {
    values: Object.values(PathThickness),
  },
  PatternShape: {
    values: Object.values(PatternShape),
  },
  ReferenceMarkKind: {
    values: Object.values(ReferenceMarkKind),
  },
  RelationGeometryKind: {
    values: Object.values(RelationGeometryKind),
  },
  RibbonAlignment: {
    values: Object.values(RibbonAlignment),
  },
  RibbonMode: {
    values: Object.values(RibbonMode),
  },
  RibbonTaperInterpolation: {
    values: Object.values(RibbonTaperInterpolation),
  },
  ScaffoldFrameMode: {
    values: Object.values(ScaffoldFrameMode),
  },
  ScopeBoundingShape: {
    values: Object.values(ScopeBoundingShape),
  },
  ShadowPreset: {
    values: Object.values(ShadowPreset),
  },
  Side: {
    values: Object.values(Side),
  },
  SmoothMethodKind: {
    values: Object.values(SmoothMethodKind),
  },
  StackOffset: {
    values: Object.values(StackOffset),
  },
  TableComposite: {
    values: Object.values(TableComposite),
  },
  TableBorderKind: {
    values: Object.values(TableBorderKind),
  },
  TableBorderMode: {
    values: Object.values(TableBorderMode),
  },
  TableCellFit: {
    values: Object.values(TableCellFit),
  },
  TableCellOverflow: {
    values: Object.values(TableCellOverflow),
  },
  TableHorizontalAlignment: {
    values: Object.values(TableHorizontalAlignment),
  },
  TableStructureKind: {
    values: Object.values(TableStructureKind),
  },
  TableTrackSizeKind: {
    values: Object.values(TableTrackSizeKind),
  },
  TableVerticalAlignment: {
    values: Object.values(TableVerticalAlignment),
  },
  WebFontSizePreset: {
    values: Object.values(WebFontSizePreset),
  },
} as const satisfies Record<string, ApiValueRegistryEntry>;
