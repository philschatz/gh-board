/*eslint no-unused-vars:0*/
import React from "react";
import Router from "react-router";
import { Link, Route, RouteHandler } from "react-router";

import GitHubMessage from "./gh-message.jsx";

const App = React.createClass({
  render: () => {
    return (
      <div className="nav">
        <Link to="app">Home</Link>
        <Link to="viewFoo">View Message</Link>

        {/* Subroutes are added here */}
        <RouteHandler/>
      </div>
    );
  }
});

const routes = (
  <Route name="app" path="/" handler={App}>
    <Route name="viewFoo" path="/foo" handler={GitHubMessage}/>
  </Route>
);

Router.run(routes, function (Handler) {
  React.render(<Handler/>, document.body);
});
