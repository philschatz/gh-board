import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router';
import { Route, Redirect } from 'react-router';

import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import RepoKanban from './repo-kanban.jsx';
import MilestonesView from './milestones-view.jsx';
import ByUserView from './by-user-view.jsx';
import MergedSince from './merged-since.jsx';

const routes = (
  <Route name='app' path='/' component={App}>
    <Redirect from='/' to='viewDashboard' />
    <Route name='viewDashboard' path='/dashboard' component={Dashboard}/>
    <Route name='viewBoard' path='/r/:repoOwner/:repoNames' component={RepoKanban}/>
    <Route name='viewBoardByRegexp' path='/r/:repoOwner/:repoNames/by/:columnRegExp' component={RepoKanban}/>
    <Route name='viewMilestones' path='/r/:repoOwner/:repoNames/milestones' component={MilestonesView}/>
    <Route name='viewBoardByUser' path='/r/:repoOwner/:repoNames/by-user' component={ByUserView}/>
    <Route name='viewMergedSince' path='/r/:repoOwner/:repoNames/since/:sha' component={MergedSince}/>
  </Route>
);


export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(<Router>{routes}</Router>, div);
}
