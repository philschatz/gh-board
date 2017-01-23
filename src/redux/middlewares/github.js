import GithubClient from './utils/githubClient';
import fetchIssues from './utils/fetchIssues';
import fetchLabels from './utils/fetchLabels';
import fetchMilestones from './utils/fetchMilestones';

const githubClient = new GithubClient();

export default ({getState}) => next => action => {
  if (!action || !action.meta || !action.meta.github) {
    return next(action);
  }

  let promise;
  switch (action.meta.github.action) {
  case 'logout':
    promise = githubClient.reset();
    break;
  case 'login':
    promise = githubClient.reset().then(() => {
      githubClient.credentials.token = action.payload.token;
      githubClient.credentials.rootURL = action.payload.rootURL;
    }).then(() => {
      return githubClient.getOcto().then(({user}) => user.fetch());
    });
    break;
  case 'fetchUser':
    promise = githubClient.hasCredentials()
      ? githubClient.getOcto().then(({user}) => user.fetch())
      : Promise.reject('no credentials');
    break;
  case 'fetchRepos':
    promise = githubClient.hasCredentials()
      ? githubClient.getOcto().then(({user}) => user.repos.fetchAll())
      : Promise.reject('no credentials');
    break;
  case 'fetchEmojis':
    promise = githubClient.getAnonymousOcto().then(({emojis}) => emojis.fetch());
    break;
  case 'fetchIssues': {
    const {issues, filter} = getState();
    if (!action.payload.isForced && issues.cacheCards && issues.cacheCardsRepoInfos === JSON.stringify(action.payload.repoInfos)) {
      promise = Promise.resolve(issues.cacheCards);
      break;
    }

    const explicitlyListedRepos = {};
    action.payload.repoInfos.forEach(({repoOwner, repoName}) => {
      if (repoName !== '*') {
        explicitlyListedRepos[`${repoOwner}/${repoName}`] = true;
      }
    });
    promise = fetchIssues(githubClient, filter, action.payload.repoInfos);
    break;
  }
  case 'fetchLabels':
    promise = fetchLabels(githubClient, action.payload.repoOwner, action.payload.repoName);
    break;
  case 'fetchMilestones':
    promise = fetchMilestones(githubClient, action.payload.repoOwner, action.payload.repoName);
    break;
  }

  const actionToDispatch = {
    ...action,
    meta: {
      ...action.meta,
      ...promise && {promise}
    }
  };

  delete actionToDispatch.meta.github;

  return next(actionToDispatch);
};
