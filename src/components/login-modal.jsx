import React from 'react';
import Client from '../github-client';
import * as BS from 'react-bootstrap';

export default React.createClass({
  displayName: 'Login',
  onSave() {
    const {token} = this.refs;
    const tokenVal = token.getValue();
    Client.setToken(tokenVal);
    // Close the modal
    this.onCancel();
  },
  onClear() {
    Client.setToken(null);
    // Re-render the modal
    this.setState({});
  },
  onCancel() {
    this.props.onHide();
  },
  render() {
    const {token} = Client.getCredentials();

    const footer = (
      <span>
        <BS.Button bsStyle='primary' onClick={this.onSave}>Save</BS.Button>
        <BS.Button bsStyle='default' onClick={this.onClear}>Clear</BS.Button>
        <BS.Button bsStyle='default' onClick={this.onCancel}>Cancel</BS.Button>
      </span>
    );

    return (
      <BS.Modal {...this.props}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title>GitHub Credentials</BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body className='modal-body'>
          <BS.Input
            type='text'
            defaultValue={token}
            disabled={!!token}
            placeholder='Enter GitHub token'
            ref='token'
          />
          <div className='github-token-instructions'>
            To create a GitHub token:
            <ol>
              <li>Go to <a href='https://github.com/settings/tokens/new' target='_blank'>https://github.com/settings/tokens/new{' '}<i className='octicon octicon-link-external'/></a></li>
              <li>Provide a descriptive title (like "gh-board") in the "Token Description"</li>
              <li>Unselect all the checkboxes to just look at public repositories</li>
                <ul>
                  <li>Select <code>public_repo</code> to be able to update/move issues</li>
                  <li>Select <code>repo</code> if you want to see/update information for <strong>private</strong> repositories</li>
                </ul>
              <li>Click <code>Generate Token</code></li>
              <li>Copy the new token and paste it in here!</li>
              <li><strong>Note:</strong> You may need to refresh the page when you click "Save"</li>
            </ol>
          </div>
        </BS.Modal.Body>
        <BS.Modal.Footer className='modal-footer'>
          {footer}
        </BS.Modal.Footer>
    </BS.Modal>
    );
  }
});
