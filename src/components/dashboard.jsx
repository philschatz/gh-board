/*eslint no-unused-vars:0*/
import React from "react";
import _ from "underscore";
import {Link} from "react-router";
import BS from "react-bootstrap";

import Client from "../github-client";
import Loadable from "./loadable.jsx";

const Dashboard = React.createClass({
  displayName: "Dashboard",
  render() {
    let {data} = this.props;

    let items = _.map(data, (repo) => {
      let repoOwner = repo.owner.login;
      let repoName = repo.name;

      return (
        <div key={repo.id}>
          {repoOwner} /
          <Link to="viewRepo" params={{repoOwner, repoName}}>{repoName}</Link>
        </div>
      );
    });

    return (
      <div className="dashboard">
        {items}
      </div>
    );
  }
});

const DashboardShell = React.createClass({
  displayName: "DashboardShell",
  render() {
    return (
      <Loadable
        promise={Client.getOcto().user.repos.fetch()}
        renderLoaded={(data) => { return (<Dashboard data={data}/>); } }
      />
    );
  }
});

export default DashboardShell;
