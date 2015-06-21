import React from 'react';
import _ from 'underscore';
import BS from 'react-bootstrap';

import Client from '../github-client';
import IssueComment from './issue-comment.jsx';
import Loadable from './loadable.jsx';

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
    const {issue} = this.props;
    const {isEditing} = this.state;

    if (isEditing) {
      return (
        <span className='issue-title is-editing'>
          <BS.Input
            ref='title'
            type='text'
            defaultValue={issue.title}
          />
          <BS.Button
            bsStyle='primary'
            onClick={this.onSave}>Save
          </BS.Button>
          <BS.Button
            bsStyle='default'
            onClick={this.onCancel}>Cancel
          </BS.Button>
        </span>
      );

    } else {
      return (
        <h2 className='issue-title'>
          <span className='issue-title-text' onClick={this.onEdit}>{issue.title}</span>
          <BS.Button
            bsStyle='default'
            onClick={this.onEdit}>Edit
          </BS.Button>
        </h2>
      );
    }
  }
});

export default React.createClass({
  displayName: 'IssueEditModal',
  onClose() {
    this.props.onRequestHide();
  },
  onEditBody(text) {
    alert(text);
  },
  render() {
    const {issue, repoOwner, repoName} = this.props;

    const footer = (
      <span>
        <BS.Button bsStyle='default' onClick={this.onClose}>Close</BS.Button>
      </span>
    );

    const title = (
      <IssueTitle
        issue={issue}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    );

    const renderComments = (comments) => {

      if (comments.length > 0) {
        const commentsWrapper = _.map(comments, (comment) => {
          return (
            <IssueComment
              user={comment.user}
              text={comment.body}
              repoOwner={repoOwner}
              repoName={repoName}
            />
          );
        });

        return (
          <div className='issue-comments'>
            <h2>Activity</h2>
            {commentsWrapper}
          </div>
        );
      } else {
        return (
          <div className='issue-comments is-empty'></div>
        );
      }
    };

    return (
      <BS.Modal {...this.props}
        title={title}
        className='issue-edit'>
        <div className='modal-body'>
          <IssueComment
            user={issue.user}
            text={issue.body}
            repoOwner={repoOwner}
            repoName={repoName}
            canEdit={true}
            onEdit={this.onEditBody}
          />
          <Loadable
            promise={Client.getOcto().repos(repoOwner, repoName).issues(issue.number).comments.fetch()}
            renderLoaded={renderComments}
            renderLoading={() => <span>Loading comments...</span>}
          />

        </div>
        <div className='modal-footer'>
          {footer}
        </div>
    </BS.Modal>
    );
  }
});
