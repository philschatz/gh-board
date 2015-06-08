/*eslint no-unused-vars:0*/
import React from "react";
import BS from "react-bootstrap";

import Client from "../github-client";
import GithubFlavoredMarkdown from "./gfm.jsx";

export default React.createClass({
  render() {
    let {issue, repoOwner, repoName} = this.props;

    return (
      <table>
        <tbody>
          <tr>
            <td className="body-avatar">
              <a target="_blank" href={issue.user.html.url}>
                <img className="avatar-image" src={issue.user.avatar.url}/>
              </a>
            </td>
            <td className="body-markup">
              <GithubFlavoredMarkdown
                text={issue.body}
                repoOwner={repoOwner}
                repoName={repoName}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
});
