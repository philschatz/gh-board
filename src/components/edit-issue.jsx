/*eslint no-unused-vars:0*/
import React from "react";
import BS from "react-bootstrap";

import Client from "../github-client";
import IssueComment from "./issue-comment.jsx";
import GithubFlavoredMarkdown from "./gfm.jsx";

const IssueTitle = React.createClass({
  getInitialState() {
    return {isEditing: false};
  },
  onEdit() {
    this.setState({isEditing: true});
  },
  onCancel() {
    this.setState({isEditing: false});
  },
  onSave() {
    let {issue, repoOwner, repoName} = this.props;
    let newTitle = this.refs.title.getValue();

    Client.getOcto().repos(repoOwner, repoName).issues(issue.number).update({title: newTitle});
  },
  render() {
    let {issue} = this.props;
    let {isEditing} = this.state;

    if (isEditing) {
      return (
        <span className="issue-title is-editing">
          <BS.Input
            ref="title"
            type="text"
            value={issue.title}
          />
          <BS.Button
            bsStyle="primary"
            onClick={this.onSave}>Save
          </BS.Button>
          <BS.Button
            bsStyle="default"
            onClick={this.onCancel}>Cancel
          </BS.Button>
        </span>
      );

    } else {
      return (
        <h2 className="issue-title">
          <span className="issue-title-text" onClick={this.onEdit}>{issue.title}</span>
          <BS.Button
            bsStyle="default"
            onClick={this.onEdit}>Edit
          </BS.Button>
        </h2>
      );
    }
  }
});

export default React.createClass({
  displayName: "EditIssue",
  onClose() {
    this.props.onRequestHide();
  },
  render() {
    let {issue, repoOwner, repoName} = this.props;

    let footer = (
      <span>
        <BS.Button bsStyle="default" onClick={this.onClose}>Close</BS.Button>
      </span>
    );

    let title = (
      <IssueTitle
        issue={issue}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    );

    return (
      <BS.Modal {...this.props}
        title={title}
        className="issue-edit">
        <div className="modal-body">
          <IssueComment
            issue={issue}
            repoOwner={repoOwner}
            repoName={repoName}
          />
        </div>
        <div className="modal-footer">
          {footer}
        </div>
    </BS.Modal>
    );
  }
});
