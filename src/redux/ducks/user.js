import Duck from 'reduck';

import {
  LOGOUT,
  LOGIN,
  FETCH_USER,
  FETCH_REPOS,
  FETCH_REPO,
  STAR_REPO,
  RESET_DATABASES
} from '../actions';

let storedSettings;
try {
  storedSettings = JSON.parse(window.localStorage.getItem('gh-board-user'));
} catch (err) {
  storedSettings = undefined;
}

const DEFAULT_STATE = {
  ready: true,
  rootURL: undefined,
  info: undefined,
  token: undefined,
};

const initialState = storedSettings || DEFAULT_STATE;

const duck = new Duck('user', initialState);

export const logout = duck.defineAction(LOGOUT, {
  creator() {
    return {meta: {
      updateUserStorage: true,
      github: {action: 'logout'}
    }};
  },
  reducer() {
    return DEFAULT_STATE;
  },
});

export const starRepo = duck.defineAction(STAR_REPO, {
  creator(repo) {
    return {
      payload: {
        repo,
      },
      meta: {
        github: {action: 'starRepo'}
      }
    };
  },
});

export const login = duck.defineAction(LOGIN, {
  creator(token, rootURL) {
    return {
      payload: {
        token,
        rootURL: rootURL ? rootURL : undefined,
      },
      meta: {
        updateUserStorage: true,
        github: {action: 'login'}
      }
    };
  },
  reducer(state, {payload}) {
    return {
      ...state,
      token: payload.token,
      rootURL: payload.rootURL,
      ready: false
    };
  },
  resolve(state, {payload}) {
    return {
      ...state,
      ready: true,
      info: payload
    };
  },
  reject(state) {
    return {
      ...state,
      ready: true,
    };
  }
});

export const fetchUser = duck.defineAction(FETCH_USER, {
  creator() {
    return {meta: {
      updateUserStorage: true,
      github: {action: 'fetchUser'}
    }};
  },
  reducer(state) {
    return {
      ...state,
      ready: false
    };
  },
  resolve(state, {payload}) {
    if (state.info && state.info.repositories) {
      payload.repositories = state.info.repositories; // don't overwrite repos if already fetched
    }
    return {
      ...state,
      ready: true,
      info: payload
    };
  },
  reject(state) {
    // TODO handle 403 and clear info and user
    return {
      ...state,
      ready: true,
    };
  }
});

export const fetchRepositories = duck.defineAction(FETCH_REPOS, {
  creator() {
    return {meta: {
      github: {action: 'fetchRepos'}
    }};
  },
  reducer(state) {
    return {
      ...state,
      ready: false
    };
  },
  resolve(state, {payload}) {
    return {
      ...state,
      ready: true,
      info: {
        ...(state.info || {}),
        repositories: payload.map((r) => ({
          createdAt: r.createdAt,
          defaultBranch: r.defaultBranch,
          description: r.description,
          fork: r.fork,
          forks: r.forks,
          fullName: r.fullName,
          htmlUrl: r.htmlUrl,
          id: r.id,
          language: r.language,
          name: r.name,
          openIssues: r.openIssues,
          owner: r.owner,
          private: r.private,
          stargazersCount: r.stargazersCount,
          updatedAt: r.updatedAt,
          hasIssues: r.hasIssues
        }))
      }
    };
  },
  reject(state) {
    return {
      ...state,
      ready: true,
    };
  }
});

export const resetDatabases = duck.defineAction(RESET_DATABASES, {
  creator() {
    return {meta: {
      github: {action: 'reset'}
    }};
  },
});

export const fetchRepo = duck.defineAction(FETCH_REPO, {
  creator(repoFullName) {
    return {
      payload: {
        repoFullName,
      },
      meta: {
        github: {action: 'fetchRepo'}
      }
    };
  },
});

export default duck.reducer;
