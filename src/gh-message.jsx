import React from "react";
import Octo from "octokat";

const octo = new Octo();

let cachedPromise = null;

const GitHubMessage = React.createClass({
  displayName: "GitHubMessage",
  getInitialState() {
    return {msg: ""};
  },
  componentDidMount() {
    if (!cachedPromise) {
      cachedPromise = octo.zen.read();
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

export default GitHubMessage;
