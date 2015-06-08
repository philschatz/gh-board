/*eslint no-unused-vars:0*/
import React from "react";
import _ from "underscore";

import Client from "../github-client";
import Loadable from "./loadable.jsx";

export default React.createClass({
  displayName: "GithubFlavoredMarkdown",
  getPromise() {
    let {text, repoOwner, repoName} = this.props;
    let context = repoOwner + "/" + repoName;
    const isRaw = true;
    const HACK = JSON.stringify({text: text, context: context, mode: "gfm"});
    return Client.getOcto().markdown.create(HACK, isRaw);
  },
  updateLinks() {
    let links = this.getDOMNode().querySelectorAll("a");
    _.each(links, (link) => {
      link.setAttribute("target", "_window");
    });
  },
  componentDidMount() {
    this.updateLinks();
  },
  componentDidUpdate() {
    this.updateLinks();
  },
  render() {
    return (
      <Loadable
        promise={this.getPromise()}
        renderLoaded={(html) => {
          return (
            <div className="rendered-markdown" dangerouslySetInnerHTML={{__html: html}} />
          );
        }}
      />
    );
  }
});
