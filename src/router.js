import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router';
import { Route, Redirect, IndexRoute } from 'react-router';

import history from './history';
import App from './components/app.jsx';
import Dashboard from './components/dashboard.jsx';
import RepoKanban from './components/repo-kanban.jsx';
import ByMilestoneView from './components/by-milestone-view.jsx';
import ByUserView from './components/by-user-view.jsx';
import MergedSince from './components/merged-since.jsx';

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
            callback(null, require('./components/milestone-review.jsx').default);
          })
        }
      }
    ],
  }
];

const router = React.createElement(Router, {history, routes});

export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(router, div);
}
