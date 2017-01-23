import Duck from 'reduck';

import BipartiteGraph from './utils/bipartite-graph';
import {cardFactory} from './utils/card';

import {
  LOGOUT,
  CLEAR_CACHE,
  FETCH_ISSUES,
  FETCH_LABELS,
  FETCH_MILESTONES
} from '../actions';

const initialState = {
  GRAPH_CACHE: new BipartiteGraph(),
  CARD_CACHE: {},
  LABEL_CACHE: {},
  cacheCardsRepoInfos: null,
  cards: [],
  labels: [],
  milestones: [],
  isPollingEnabled: false
};

const duck = new Duck('issues', initialState);

duck.addReducerCase(LOGOUT, {
  reducer(state) {
    return {
      ...initialState,
      isPollingEnabled: state.isPollingEnabled
    };
  },
});

export const clearCache = duck.defineAction(CLEAR_CACHE, {
  creator() {
    return {};
  },
  reducer(state) {
    return {
      ...initialState,
      isPollingEnabled: state.isPollingEnabled
    };
  },
});

export const fetchLabels = duck.defineAction(FETCH_LABELS, {
  creator(repoOwner, repoName) {
    return {
      payload: {repoOwner, repoName},
      meta: {
        github: {action: 'fetchLabels'}
      }
    };
  },
  resolve(state, {payload: labels}) {
    return {
      ...state,
      labels,
    };
  },
  reject(state) {
    return {
      ...state,
      ready: true,
    };
  }
});

export const fetchMilestones = duck.defineAction(FETCH_MILESTONES, {
  creator(repoOwner, repoName) {
    return {
      payload: {repoOwner, repoName},
      meta: {
        github: {action: 'fetchMilestones'}
      }
    };
  },
  resolve(state, {payload: milestones}) {
    return {
      ...state,
      milestones,
    };
  },
  reject(state) {
    return {
      ...state,
      ready: true,
    };
  }
});

function sortCards(cards) {
  return cards.sort((a, b) => {
    if (a.getDueAt() && b.getDueAt()) {
      return a.getDueAt() - b.getDueAt();
    } else if (a.getDueAt()) {
      return -1;
    } else if (b.getDueAt()) {
      return 1;
    } else {
      // newest on top
      return Date.parse(b.getUpdatedAt()) - Date.parse(a.getUpdatedAt());
    }
  });
}

export const fetchIssues = duck.defineAction(FETCH_ISSUES, {
  creator(repoInfos, forced) {
    return {
      payload: {repoInfos, forced},
      meta: {
        github: {action: 'fetchIssues'}
      }
    };
  },
  reducer(state, {payload}) {
    return {
      ...state,
      cacheCardsRepoInfos: JSON.stringify((payload.repoInfos)),
    };
  },
  resolve(state, {payload: cards}) {
    const boundCards = cards.map(c => cardFactory(state.CARD_CACHE, state.GRAPH_CACHE)(c, true));
    state.GRAPH_CACHE.addCards(boundCards, cardFactory(state.CARD_CACHE, state.GRAPH_CACHE)); // mutating the state, that's bad
    boundCards.forEach(({issue}) => {
      issue.labels.forEach((label) => {
        state.LABEL_CACHE[label.name] = label; // mutating the state, that's bad
      });
    });
    return {
      ...state,
      cards: sortCards(boundCards),
    };
  },
  reject(state) {
    return {
      ...state,
      ready: true,
    };
  }
});

export const selectors = {
  getCard(state, c) {
    return cardFactory(state.CARD_CACHE, state.GRAPH_CACHE)(c, true);
  }
};

export default duck.reducer;
