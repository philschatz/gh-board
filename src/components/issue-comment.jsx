import React from 'react';
import BS from 'react-bootstrap';

import AsyncButton from './async-button.jsx';
import GithubFlavoredMarkdown from './gfm.jsx';
import Time from './time.jsx';

const EditableComment = React.createClass({

  getInitialState() {
    return {isEditing: this.props.isEditing};
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
      return onEdit(newText).then(this.onCancel()); // Close editing when save completes
    } else {
      this.onCancel();
    }
  },
  render() {
    const {user, text, repoOwner, repoName, cancelText, saveText, dateTime} = this.props;
    const {isEditing} = this.state;

    let header;
    let footer;
    let body;

    if (isEditing) {
      let cancelButton;
      if (cancelText) {
        cancelButton = (
          <BS.Button onClick={this.onCancel}>{cancelText}</BS.Button>
        );
      }

      header = null;
      footer = (
        <span>
          {cancelButton}
          <AsyncButton
            bsStyle='primary'
            action={this.onSave}
            renderError={() => (<span className='error'>Error Saving. Refresh</span>)}
            >{saveText}
          </AsyncButton>
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
      let timestamp;
      if (dateTime) {
        timestamp = (
          <Time dateTime={dateTime}/>
        );
      }
      header = (
        <span>
          {user.login + ' commented'}
          {timestamp}
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
    const {user, text, repoOwner, repoName, canEdit, onEdit, isEditing} = this.props;

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
          <EditableComment {...this.props} />
        </div>
      </div>
    );
  }
});
