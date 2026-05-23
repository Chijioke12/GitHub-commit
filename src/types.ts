export interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  branch: string;
  injectViteWorkflow?: boolean;
}
