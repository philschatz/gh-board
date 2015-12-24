import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router';
import { Route, Redirect, IndexRoute } from 'react-router';

import history from '../history';
import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import RepoKanban from './repo-kanban.jsx';
import ByMilestoneView from './by-milestone-view.jsx';
import ByUserView from './by-user-view.jsx';
import MergedSince from './merged-since.jsx';

const routes = [
  // Redirect from `/dashboard` to `/`
  { path: '/dashboard',
    onEnter: (nextState, replaceState) => replaceState(null, '/')
  },
  { path: '/',
    component: App,
    indexRoute: { component: Dashboard },
    childRoutes: [
      { path: '/r/:repoOwner/:repoNames', component: RepoKanban },
      { path: '/r/:repoOwner/:repoNames/by/:columnRegExp', component: RepoKanban },
      { path: '/r/:repoOwner/:repoNames/by-milestone', component: ByMilestoneView },
      { path: '/r/:repoOwner/:repoNames/by-user', component: ByUserView },
      { path: '/r/:repoOwner/:repoNames/since/:sha', component: MergedSince },
      { path: '/r/:repoOwner/:repoNames/milestone-review',
        // Keep the review page as a separate chunk because it contains d3
        getComponent(location, callback) {
          require.ensure([], (require) => {
            // Remember to add the `.default`!
            callback(null, require('./milestone-review.jsx').default);
          })
        }
      }
    ],
  }
];

const router = (
  <Router history={history} routes={routes}/>
);


export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(router, div);
}
