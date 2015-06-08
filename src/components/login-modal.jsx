/*eslint no-unused-vars:0*/
import React from "react";
import Client from "../github-client";
import BS from "react-bootstrap";

export default React.createClass({
  displayName: "Login",
  onSave() {
    let {token} = this.refs;
    token = token.getValue();
    Client.setToken(token);
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
    let {token, username, password} = Client.getCredentials();

    let footer = (
      <span>
        <BS.Button bsStyle="primary" onClick={this.onSave}>Save</BS.Button>
        <BS.Button bsStyle="default" onClick={this.onClear}>Clear</BS.Button>
        <BS.Button bsStyle="default" onClick={this.onCancel}>Cancel</BS.Button>
      </span>
    );

    return (
      <BS.Modal {...this.props}
        title="GitHub Credentials">
        <div className="modal-body">
          <BS.Input
            type="text"
            value={token}
            disabled={!!token}
            placeholder="Enter GitHub token"
            ref="token"
          />
        </div>
        <div className="modal-footer">
          {footer}
        </div>
    </BS.Modal>
    );
  }
});
