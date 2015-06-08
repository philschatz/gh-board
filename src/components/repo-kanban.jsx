/*eslint no-unused-vars:0*/
import React from "react";
import _ from "underscore";
import BS from "react-bootstrap";

import Client from "../github-client";
import Loadable from "./loadable.jsx";
import EditIssue from "./edit-issue.jsx";

// Of the form `# - ...`
const KANBAN_LABEL = /^\d+\ -\ /;

const filterKanbanLabels = (labels) => {
  let kanbanLabels = _.filter(labels, (label) => KANBAN_LABEL.test(label.name));
  // TODO: Handle more than 10 workflow states
  return kanbanLabels.sort();
};

const kanbanLabelName = (label) => label.name.slice(label.name.indexOf("-") + 2);

const KanbanIssue = React.createClass({
  displayName: "KanbanIssue",
  render() {
    let {issue, repoOwner, repoName} = this.props;
    let assignedAvatar = null;
    if (issue.assignee) {
      assignedAvatar = (
        <img src={issue.assignee.avatar_url}/>
      );
    }
    let footer = [
      assignedAvatar,
      <a className="issue-number" target="_window" href={issue.htmlUrl}>{issue.number}</a>
    ];
    let modal = (
      <EditIssue
        issue={issue}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    );
    return (
      <BS.ModalTrigger modal={modal}>
        <BS.Panel className="issue" bsStyle="default" footer={footer}>
          {issue.title}
        </BS.Panel>
      </BS.ModalTrigger>
    );
  }
});

const KanbanIssues = React.createClass({
  displayName: "KanbanIssues",
  render() {
    let {issues, repoOwner, repoName} = this.props;

    let kanbanIssues = _.map(issues, (issue) => {
      return (
        <KanbanIssue
          key={issue.id}
          issue={issue}
          repoOwner={repoOwner}
          repoName={repoName}
        />
      );
    });

    return (
      <div>{kanbanIssues}</div>
    );
  }
});

const KanbanRepo = React.createClass({
  displayName: "KanbanRepo",
  renderHeadings(labels) {
    return _.map(labels, (label) => {
      let name = kanbanLabelName(label);
      return (
        <th>{name}</th>
      );
    });
  },
  renderIssues(labels) {
    let {repoOwner, repoName} = this.props;

    return _.map(labels, (label) => {
      return (
        <td>
          <Loadable
            promise={Client.getOcto().repos(repoOwner, repoName).issues.fetch({labels: label.name})}
            renderLoaded={(issues) => <KanbanIssues issues={issues} repoOwner={repoOwner} repoName={repoName}/>}
          />
        </td>
      );
    });
  },
  render() {
    let {labels} = this.props;
    let kanbanLabels = filterKanbanLabels(labels);

    let workflowStateHeadings = this.renderHeadings(kanbanLabels);
    let workflowStateIssues = this.renderIssues(kanbanLabels);

    return (
      <table className="kanban-board">
        <thead>
          {workflowStateHeadings}
        </thead>
        <tbody>
          <tr>
            {workflowStateIssues}
          </tr>
        </tbody>
      </table>
    );
  }
});

const Repo = React.createClass({
  displayName: "Repo",
  render() {
    let {repoOwner, repoName, data} = this.props;

    // Get all the issue labels first
    let renderLoaded = (labels) => {
      // If there are at least 2 "special" kanban labels then consider it valid
      let kanbanLabels = filterKanbanLabels(labels);

      if (kanbanLabels.length > 1) {
        return (
          <KanbanRepo
            repoOwner={repoOwner}
            repoName={repoName}
            labels={labels}
            data={data}
          />
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
        <Repo {...this.props}
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
