export interface GitHubConfig {
  pat: string;
  branch: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  html_url: string;
  default_branch: string;
}
