import React from "react";
import Client from "../github-client";

let cachedPromise = null;

export default React.createClass({
  displayName: "GitHubMessage",
  getInitialState() {
    return {msg: ""};
  },
  componentDidMount() {
    if (!cachedPromise) {
      cachedPromise = Client.readMessage();
    }
    cachedPromise.then((msg)=> this.setState({msg}));
  },
  render() {
    let {msg} = this.state;

    return (
      <div>Howdy! Here is a message from GitHub: {msg}</div>
    );
  }
});
