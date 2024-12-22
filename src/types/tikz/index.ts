import { Ref } from "react";

export type TikZKey = string;

export type TikZProps = {
  name?: TikZKey;
  ref?: Ref<SVGGElement>;
};
