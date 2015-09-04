import React from 'react';
import Client from '../github-client';
import BS from './rbs';

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
    const {token, username, password} = Client.getCredentials();

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
        </BS.Modal.Body>
        <BS.Modal.Footer className='modal-footer'>
          {footer}
        </BS.Modal.Footer>
    </BS.Modal>
    );
  }
});
