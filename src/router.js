import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router';

import history from './history';
import App from './components/app';
import Dashboard from './components/dashboard';
import RepoKanban from './components/repo-kanban';
import ByMilestoneView from './components/by-milestone-view';
import ByUserView from './components/by-user-view';
import MergedSince from './components/merged-since';

const routes = [
  // Redirect from `/dashboard` to `/`
  { path: '/dashboard',
    onEnter: (nextState, replaceState) => replaceState(null, '/')
  },
  { path: '/',
    component: App,
    indexRoute: { component: Dashboard },
    childRoutes: [
      { path: '/r/:repoStr(/m/:milestonesStr)(/t/:tagsStr)(/u/:user)(/x/:columnRegExp)',
        indexRoute: {component: RepoKanban},
        childRoutes: [
          { path: 'by-milestone', component: ByMilestoneView },
          { path: 'by-user', component: ByUserView },
          { path: 'milestone-review', onEnter: (state, replace) => replace(null, `/r/${state.params.repoStr}/gantt`) },
          { path: 'gantt',
            // Keep the review page as a separate chunk because it contains d3
            getComponent(location, callback) {
              require.ensure([], (require) => {
                // Remember to add the `.default`!
                callback(null, require('./components/gantt-view').default);
              });
            }
          }
      ] },
      { path: '/r/:repoOwner/:repoNames/since/:shaStart', component: MergedSince },
      { path: '/r/:repoOwner/:repoNames/since/:shaStart/:shaEnd', component: MergedSince },
    ],
  }
];

const router = React.createElement(Router, {history, routes});

export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(router, div);
}
