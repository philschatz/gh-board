/*eslint no-unused-vars:0*/
import React from "react";
import _ from "underscore";
import BS from "react-bootstrap";

import Client from "../github-client";
import Loadable from "./loadable.jsx";

// Of the form `# - ...`
const KANBAN_LABEL = /^\d+\ -\ /;

const RepoKanban = React.createClass({
  displayName: "RepoKanban",
  render() {
    let {repoOwner, repoName} = this.props;

    // Get all the issue labels first
    let renderLoaded = (labels) => {
      // If there are at least 2 "special" kanban labels then consider it valid
      let kanbanLabels = _.filter(labels, (label) => KANBAN_LABEL.test(label));

      if (kanbanLabels.length > 1) {
        return (
          <div>Looks like a Valid kanban repo</div>
        );
      } else {
        return (
          <div>Not a valid kanban repo! Would you like to initialize it?</div>
        );
      }
    };

    return (
      <Loadable
        promise={Client.getOcto().repos(repoOwner, repoName).labels.fetch()}
        renderLoaded={renderLoaded}
      />
    );
  }
});

const RepoKanbanShell = React.createClass({
  displayName: "RepoKanbanShell",
  contextTypes: {
    router: React.PropTypes.func
  },
  render() {
    let {repoOwner, repoName} = this.context.router.getCurrentParams();

    let renderLoaded = (data) => {
      return (
        <RepoKanban {...this.props}
          repoOwner={repoOwner}
          repoName={repoName}
          data={data}
        />
      );
    };

    return (
      <Loadable
        promise={Client.getOcto().repos(repoOwner, repoName).fetch()}
        renderLoaded={renderLoaded}
      />
    );
  }
});

export default RepoKanbanShell;
