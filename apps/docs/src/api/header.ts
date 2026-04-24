import { GITHUB_TOKEN } from "@/config/token";

const authHeader = new Headers();
authHeader.append(
  "Authorization",
  `Bearer ghp_${"NyAFX9Uivyw"}${GITHUB_TOKEN}`
);

export default authHeader;