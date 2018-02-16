export default function fetchLabels(githubClient, repoOwner, repoName) {
  return githubClient
    .getOcto()
    .then(({ repos }) => repos(repoOwner, repoName).milestones.fetchAll())
}
