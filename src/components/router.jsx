import React from 'react';
import Router from 'react-router';
import { Route, Redirect } from 'react-router';

import App from './app.jsx';
import Dashboard from './dashboard.jsx';
import RepoKanban from './repo-kanban.jsx';

const routes = (
  <Route name='app' path='/' handler={App}>
    <Redirect from='/' to='viewDashboard' />
    <Route name='viewDashboard' path='/dashboard' handler={Dashboard}/>
    <Route name='viewRepo' path='/r/:repoOwner/:repoName' handler={RepoKanban}/>
  </Route>
);


export default function() {
  Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.body);
  });
}
