import React from 'react';
import Router from 'react-router';
import { Route, Redirect } from 'react-router';

import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import RepoKanban from './repo-kanban.jsx';
import MilestonesView from './milestones-view.jsx';
import ByUserView from './by-user-view.jsx';
import MergedSince from './merged-since.jsx';

const routes = (
  <Route name='app' path='/' handler={App}>
    <Redirect from='/' to='viewDashboard' />
    <Route name='viewDashboard' path='/dashboard' handler={Dashboard}/>
    <Route name='viewBoard' path='/r/:repoOwner/:repoNames' handler={RepoKanban}/>
    <Route name='viewBoardByRegexp' path='/r/:repoOwner/:repoNames/by/:columnRegExp' handler={RepoKanban}/>
    <Route name='viewMilestones' path='/r/:repoOwner/:repoNames/milestones' handler={MilestonesView}/>
    <Route name='viewBoardByUser' path='/r/:repoOwner/:repoNames/by-user' handler={ByUserView}/>
    <Route name='viewMergedSince' path='/r/:repoOwner/:repoNames/since/:sha' handler={MergedSince}/>
  </Route>
);


export default function() {
  Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.body);
  });
}
