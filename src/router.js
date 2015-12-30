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

import {parseRoute, setFilters} from './route-utils';

const routes = [
  // Redirect from `/dashboard` to `/`
  { path: '/dashboard',
    onEnter: (nextState, replaceState) => replaceState(null, '/')
  },
  { path: '/',
    component: App,
    indexRoute: { component: Dashboard },
    childRoutes: [
      { path: '/r/:repoStr(/m/:milestonesStr)(/t/:tagsStr)(/u/:userName)(/x/:columnRegExpStr)',
        // Save all the filter criteria
        onEnter: setFilters,
        indexRoute: {component: RepoKanban},
        childRoutes: [
          { path: 'since/:startShas(/:endShas)', component: MergedSince },
          { path: 'by-milestone', component: ByMilestoneView },
          { path: 'by-user', component: ByUserView },
          // Redirect to the gantt URL
          { path: 'milestone-review', onEnter: (state, replace) => replace(null, buildRoute('gantt', parseRoute(state.params))) },
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
    ],
  }
];

const router = React.createElement(Router, {history, routes});

export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(router, div);
}
