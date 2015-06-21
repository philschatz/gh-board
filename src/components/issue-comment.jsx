import React from 'react';
import BS from 'react-bootstrap';

import GithubFlavoredMarkdown from './gfm.jsx';

const EditableComment = React.createClass({

  getInitialState() {
    return {isEditing: false};
  },
  onEditStart() {
    this.setState({isEditing: true});
  },
  onCancel() {
    this.setState({isEditing: false});
  },
  onSave() {
    const {onEdit, text} = this.props;
    const {content} = this.refs;
    const newText = content.getValue();

    if (text !== newText) {
      onEdit(newText).then(this.onCancel()); // Close editing when save completes
    } else {
      this.onCancel();
    }
  },
  render() {
    const {user, text, repoOwner, repoName} = this.props;
    const {isEditing} = this.state;

    let header;
    let footer;
    let body;

    if (isEditing) {
      header = user.login + ' commented';
      footer = (
        <span>
          <BS.Button onClick={this.onCancel}>Cancel</BS.Button>
          <BS.Button bsStyle='primary' onClick={this.onSave}>Update Comment</BS.Button>
        </span>
      );
      body = (
        <BS.Input
          type='textarea'
          className='edit-text'
          placeholder='Enter Markdown here'
          ref='content'
          defaultValue={text}
          />
      );
    } else {
      header = (
        <span>
          {user.login + ' commented'}
          <BS.Button
            bsSize='xsmall'
            className='pull-right'
            onClick={this.onEditStart}>
            <i className='fa fa-pencil'></i>
          </BS.Button>
        </span>
      );
      footer = null;
      body = (
        <GithubFlavoredMarkdown
          text={text}
          repoOwner={repoOwner}
          repoName={repoName}
        />
      );
    }
    return (
      <BS.Panel
        bsStyle='primary'
        header={header}
        footer={footer}
        >{body}</BS.Panel>
    );
  }
});

export default React.createClass({
  render() {
    const {user, text, repoOwner, repoName, canEdit, onEditText} = this.props;

    return (
      <div className='media'>
        <div className='media-left'>
          <a target='_blank' href={user.html.url}>
            <img
              className='media-object avatar-image'
              src={user.avatar.url}
            />
          </a>
        </div>
        <div className='media-body'>
          <EditableComment
             user={user}
             text={text}
             repoOwner={repoOwner}
             repoName={repoName}
             onEdit={onEditText}
           />
        </div>
      </div>
    );
  }
});
