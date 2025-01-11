import { FontProps } from "../../types/svg/font";

export const TikZFontSizeMap = {
  tiny: '5px',
  script: '8px',
  footnote: '10px',
  small: '12px',
  normal: '16px',
  large: '18px',
  Large: '22px',
  LARGE: '26px',
  huge: '30px',
  Huge: '36px',
};

export type TikZFontSize = keyof typeof TikZFontSizeMap;

export const convertFontSize = (fontSize?: string | TikZFontSize | number) => {
  return typeof fontSize === 'string' && TikZFontSizeMap.hasOwnProperty(fontSize)
    ? TikZFontSizeMap[fontSize as TikZFontSize]
    : fontSize;
};

export type FontStyle = 'bold' | 'italic' | 'serif' | 'sans-serif';

export const convertFontStyle = (fontStyle?: FontStyle): Partial<FontProps> => {
  switch (fontStyle) {
    case "bold":
      return {fontWeight: 'bold'};
    case 'italic':
      return {fontStyle: 'italic'};
    case 'serif':
      return {fontFamily: 'serif'};
    case 'sans-serif':
      return {fontFamily: 'sans-serif'};
    default:
      return {};
  }
}