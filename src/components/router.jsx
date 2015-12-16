import React from 'react';
import ReactDOM from 'react-dom';
import Router from 'react-router';
import { Route, Redirect } from 'react-router';

import history from '../history';
import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import RepoKanban from './repo-kanban.jsx';
import MilestonesView from './milestones-view.jsx';
import ByUserView from './by-user-view.jsx';
import MergedSince from './merged-since.jsx';

const router = (
  <Router history={history}>
    <Redirect from='/' to='/dashboard' />
    <Route path='/' component={App}>
      <Route path='/dashboard' component={Dashboard}/>
      <Route path='/r/:repoOwner/:repoNames' component={RepoKanban}/>
      <Route path='/r/:repoOwner/:repoNames/by/:columnRegExp' component={RepoKanban}/>
      <Route path='/r/:repoOwner/:repoNames/milestones' component={MilestonesView}/>
      <Route path='/r/:repoOwner/:repoNames/by-user' component={ByUserView}/>
      <Route path='/r/:repoOwner/:repoNames/since/:sha' component={MergedSince}/>
    </Route>
  </Router>
);


export default function() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  ReactDOM.render(router, div);
}
