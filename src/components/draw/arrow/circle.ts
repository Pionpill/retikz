import { Position } from "../../../types/coordinate/descartes";
import { ArrowAttributes } from "./types";

const getCirclePath = (attributes: ArrowAttributes) => {
  const {
    width = 5,
    left = false,
    right=false,
    scale = 1,
  } = attributes;

  const radius = (width / 2) * scale;
  const diameter = width * scale;
  const startPoint: Position = [0, 0];

  const path = `M ${startPoint.join(',')} ` + (left ? 
      `A ${radius},${radius} 0 1,0 ${-diameter},0 Z` : right ?
      `A ${radius},${radius} 0 1,1 ${-diameter},0 Z` : 
      `A ${radius},${radius} 0 1,0 ${-diameter},0` + `A ${radius},${radius} 0 1,0 ${startPoint.join(',')} Z`)

  return {
    d: path,
    offsetDistance: radius,
    insertDistance: radius,
  }
};

export default getCirclePath;