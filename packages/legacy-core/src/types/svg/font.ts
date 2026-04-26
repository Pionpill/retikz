export type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter';

export type FontProps = {
  fill?: 'currentColor' | string;
  fillOpacity?: number;
  fontSize?: string | number;
  fontWeight?: FontWeight | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontFamily?: string;
  fontStretch?:
    | 'normal'
    | 'condensed'
    | 'semi-condensed'
    | 'ultra-condensed'
    | 'extra-condensed'
    | 'expanded'
    | 'semi-expanded'
    | 'extra-expanded'
    | 'ultra-expanded'
    | 'inherit'
    | 'initial'
    | 'revert'
    | 'revert-layer'
    | 'unset'
    | string;
};
