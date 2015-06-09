import React from 'react';

import GithubFlavoredMarkdown from './gfm.jsx';

export default React.createClass({
  render() {
    const {user, body, repoOwner, repoName} = this.props;

    return (
      <table>
        <tbody>
          <tr>
            <td className='body-avatar'>
              <a target='_blank' href={user.html.url}>
                <img className='avatar-image' src={user.avatar.url}/>
              </a>
            </td>
            <td className='body-markup'>
              <GithubFlavoredMarkdown
                text={body}
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
