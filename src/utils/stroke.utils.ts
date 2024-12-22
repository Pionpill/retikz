import { StrokeProps } from "../types/svg/stroke";

export type StrokeType = 'solid' | 'dashed' | 'dotted';

/** 将 StrokeType 转换为 svg 原生的属性 */
export const convertStrokeType = (strokeType: StrokeType, strokeWidth = 1): Partial<StrokeProps> => {
    switch (strokeType) {
        case 'solid':
            return {};
        case 'dashed':
            return { strokeDasharray: `${strokeWidth * 3} ${strokeWidth * 2}` };
        case 'dotted':
            return { strokeDasharray: `0 ${strokeWidth * 2}`, strokeLinecap: 'round' as StrokeProps['strokeLinecap'] };
    }
};