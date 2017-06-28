import React from 'react';

import Client from '../github-client';

import Etherpad from './etherpad';


const EtherpadIssueShell = React.createClass({
  render() {
    const {repoOwner, repoName, branch, splat} = this.props.params;
    const path = splat;

    const title = `Editing ${repoOwner}/${repoName} (${branch}) ${path}`;
    const padName = `file_github.com_${repoOwner}_${repoName}_${path.replace('/', '_')}`;

    let fileText = null;
    let fileSha = null;
    const getBody = () => {
      return fileText || ''; // return '' so it can be trimmed when comparing
    };
    const saveBody = (text) => {
      const message = 'Saved using gh-board';
      return Client.getOcto().repos(repoOwner, repoName).contents(path).add({message, content: btoa(text), sha: fileSha, branch}).then(({content}) => {
        fileSha = content.sha;
      });
    };
    const loadBody = () => {
      return Client.getOcto().repos(repoOwner, repoName).contents(path).fetch({ref: branch}).then(({content, sha, encoding}) => {
        fileText = atob(content);
        fileSha = sha;
        return fileText;
      });
    };

    const promise = loadBody();
    return (
      <Etherpad promise={promise} title={title} padName={padName} getBody={getBody} saveBody={saveBody} loadBody={loadBody} repoOwner={repoOwner} repoName={repoName}/>
    );
  }
});

export default EtherpadIssueShell;
