import React from 'react';
import _ from 'underscore';
import BS from 'react-bootstrap';

import Client from '../github-client';
import {Store} from '../issue-store';
import {CurrentUserStore} from '../user-store';
import IssueComment from './issue-comment.jsx';
import Loadable from './loadable.jsx';
import AsyncButton from './async-button.jsx';

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

    return Store.update(repoOwner, repoName, issue.number, {title: newTitle})
    // close editing when successful
    .then(this.onCancel);
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
          <AsyncButton
            bsStyle='primary'
            action={this.onSave}
            renderError={() => (<span className='error'>Error Saving. Refresh</span>)}
            >Save
          </AsyncButton>
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
  onEditBody(body) {
    const {repoOwner, repoName, issue} = this.props;
    return Store.update(repoOwner, repoName, issue.number, {body})
    .then(() => {
      this.setState({});
    });
  },
  onNewComment(body) {
    const {repoOwner, repoName, issue} = this.props;
    return Store.createComment(repoOwner, repoName, issue.number, {body})
    .then(() => {
      this.setState({});
    });
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

    let newComment = null;
    if (CurrentUserStore.getUser()) {
      newComment = (
        <IssueComment
          user={CurrentUserStore.getUser()}
          text=''
          repoOwner={repoOwner}
          repoName={repoName}
          canEdit={true}
          isEditing={true}
          onEdit={this.onNewComment}
          cancelText={null}
          saveText='Create Comment'
        />
      );
    } else {
      newComment = (
        <span>Sign in to add comments.</span>
      );
    }

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
            cancelText='Cancel'
            saveText='Update Description'
          />
          <Loadable
            promise={Client.getOcto().repos(repoOwner, repoName).issues(issue.number).comments.fetch()}
            renderLoaded={renderComments}
            renderLoading={() => <span>Loading comments...</span>}
          />
        {newComment}
        </div>
        <div className='modal-footer'>
          {footer}
        </div>
    </BS.Modal>
    );
  }
});
