import {applyMiddleware, createStore, combineReducers} from 'redux';
import optimist from 'redux-optimist';
import optimistPromiseMiddleware from 'redux-optimist-promise';
import {middleware as feedbackMiddleware, reducer as feedback} from 'redux-toast-feedback';

import createHashHistory from 'history/lib/createHashHistory';
import {useRouterHistory} from 'react-router';
import {syncHistoryWithStore, routerReducer as routing, routerMiddleware} from 'react-router-redux';

import settingsStorageMiddleware from './middlewares/settingsStorage';
import userStorageMiddleware from './middlewares/userStorage';
import githubMiddleware from './middlewares/github';

import reducers from './reducers';

let reducer = optimist(combineReducers({
  routing,
  feedback,
  ...reducers
}));

const hashHistory = useRouterHistory(createHashHistory)();

let _middlewares = [
  routerMiddleware(hashHistory),
  settingsStorageMiddleware,
  userStorageMiddleware
];

if (process.env.NODE_ENV !== 'production') {
  const { createLogger } = require('redux-logger');
  _middlewares.push(createLogger({
    collapsed: true,
    duration: true,
    timestamp: false
  }));
}

_middlewares = _middlewares
  .concat([
    feedbackMiddleware(),
    githubMiddleware,
    optimistPromiseMiddleware()
  ]);

const createStoreWithMiddleware = applyMiddleware(..._middlewares)(createStore);

export const store = createStoreWithMiddleware(reducer);

// Sync dispatched route actions to the history
export const history = syncHistoryWithStore(hashHistory, store);

history.listen(() => {
  if (window.ga) {
    const {pathname, hash} = window.location;
    window.ga('set', 'page', pathname + hash);
    // window.ga('set', 'page', '/gh-board/#' + locationChangeEvent.pathname + locationChangeEvent.search);
    window.ga('send', 'pageview');
  }
});
