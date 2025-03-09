import authHeader from "./header";

export type ContentType = {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    /** github 地址 */
    html_url: string;
    git_url: string;
    /** 下载地址 */
    download_url: string | null;
    type: 'file' | 'dir';
    children?: ContentType[];
}

/** 获取 github 参数某个文件夹下的文件列表 */
export const getContentsApi = (repos: string, path: string) => fetch(
    `https://api.github.com/repos/Pionpill/${repos}/contents/${path}`,
    {
      method: "GET",
      headers: authHeader
    }
  ).then(res => res.json() as Promise<ContentType[]>);

/** 获取文档：github 文件字符串 */
export const getRawApi = (repo: string, path: string) => fetch(`https://raw.githubusercontent.com/Pionpill/${repo}/main/${path}`).then(res => res.text());

export type CommitInfo = {
  commit: {
    author: {
      date: string;
    }
  }
}

/** 获取仓库的 commit 列表 */
export const getReposCommitApi = (repos: string, path?: string): Promise<Array<CommitInfo>> => fetch(
  `https://api.github.com/repos/Pionpill/${repos}/commits?${path ? `path=${path}` : ''}`,
  {
    method: "GET",
    headers: authHeader,
  }
).then(res => res.json());