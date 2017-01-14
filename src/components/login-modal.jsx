import React from 'react';
import Client from '../github-client';
import * as BS from 'react-bootstrap';
import {LinkExternalIcon} from 'react-octicons';

export default React.createClass({
  displayName: 'Login',
  onSave() {
    const {token, rootURL} = this.refs;
    let rootURLVal = rootURL.getValue();
    if (rootURLVal) {
      rootURLVal = rootURLVal.trim();
    }
    Client.setRootUrl(rootURLVal);
    let tokenVal = token.getValue();
    if (tokenVal) {
      // needs trimming because just copying the token
      // from GitHub (by double-clicking the string instead of
      // clicking the Copy button) adds a leading space character
      tokenVal = tokenVal.trim();
    }
    Client.setToken(tokenVal);
    // Close the modal
    this.onCancel();
  },
  onClear() {
    Client.setRootUrl(null);
    Client.setToken(null);
    // Re-render the modal
    this.setState({});
  },
  onCancel() {
    this.props.onHide();
  },
  render() {
    const {token, rootURL} = Client.getCredentials();

    let defaultRootURL = rootURL || (() => {

      let hostname = document.location.hostname;
      let tld = hostname.split('.').slice(-2).join('.');
      if (tld == 'github.io') return null;
      if (tld == 'localhost') return null;
      return 'https://' + hostname + '/api/v3';

    })();


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
          <BS.FormControl
            type='text'
            defaultValue={token}
            disabled={!!token}
            placeholder='Enter GitHub token'
            ref='token'
          />
          <div className='github-token-instructions'>
            <h4>"Why do I need a token?"</h4>
            <p>Unlinke other issue trackers, this one runs <em>in your browser</em> via any <a href='https://pages.github.com' target='_blank'>static webserver{' '}<LinkExternalIcon/></a> so secret application keys are not possible.</p>
            <h4>"OK, That's fair. How do I create a token?"</h4>
            <ol>
              <li>Go to <a href='https://github.com/settings/tokens/new' target='_blank'>https://github.com/settings/tokens/new{' '}<LinkExternalIcon/></a></li>
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
            <h4>"GitHub Enterprise Endpoint"</h4>
            <p>
              If you need to set a custom API endpoint:<br/>
              <BS.Input
                type='text'
                defaultValue={defaultRootURL}
                placeholder='Enter GitHub API URL, e.g. https://github.example.com/api/v3'
                ref='rootURL'
              />
            </p>
          </div>
        </BS.Modal.Body>
        <BS.Modal.Footer className='modal-footer'>
          {footer}
        </BS.Modal.Footer>
    </BS.Modal>
    );
  }
});
