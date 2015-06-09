import React from 'react';
import Client from '../github-client';
import BS from 'react-bootstrap';

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
    this.props.onRequestHide();
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
      <BS.Modal {...this.props}
        title='GitHub Credentials'>
        <div className='modal-body'>
          <BS.Input
            type='text'
            value={token}
            disabled={!!token}
            placeholder='Enter GitHub token'
            ref='token'
          />
        </div>
        <div className='modal-footer'>
          {footer}
        </div>
    </BS.Modal>
    );
  }
});
