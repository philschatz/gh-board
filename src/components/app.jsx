/*eslint no-unused-vars:0*/
import React from "react";
import { Link, RouteHandler } from "react-router";

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

export default App;
