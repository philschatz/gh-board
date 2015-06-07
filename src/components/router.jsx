/*eslint no-unused-vars:0*/
import React from "react";
import Router from "react-router";
import { Route, RouteHandler } from "react-router";

import App from "./app.jsx";
import GitHubMessage from "./gh-message.jsx";

const routes = (
  <Route name="app" path="/" handler={App}>
    <Route name="viewFoo" path="/foo" handler={GitHubMessage}/>
  </Route>
);


export default function() {
  Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.body);
  });
}
