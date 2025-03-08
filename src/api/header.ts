import { GITHUB_TOKEN } from "@/config/token";

const authHeader = new Headers();
authHeader.append(
  "Authorization",
  `Bearer ghp_${"oatjtY6iYyg"}${GITHUB_TOKEN}`
);

export default authHeader;