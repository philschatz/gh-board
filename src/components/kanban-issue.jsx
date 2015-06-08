/*eslint no-unused-vars:0*/
import React from "react";
import BS from "react-bootstrap";

import EditIssue from "./edit-issue.jsx";

export default React.createClass({
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
