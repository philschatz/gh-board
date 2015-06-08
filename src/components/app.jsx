/*eslint no-unused-vars:0*/
import React from "react";
import {Link, RouteHandler} from "react-router";
import BS from "react-bootstrap";

import LoginModal from "./login-modal.jsx";

const App = React.createClass({
  render: () => {
    return (
      <div className="nav">
        <Link to="viewDashboard">Dashboard</Link>
        <BS.ModalTrigger modal={<LoginModal/>}>
          <BS.Button>Login</BS.Button>
        </BS.ModalTrigger>
        <Link to="viewFoo">View Message</Link>

        {/* Subroutes are added here */}
        <RouteHandler/>
      </div>
    );
  }
});

export default App;
