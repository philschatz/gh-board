import React from 'react';

import Client from '../github-client';
import Loadable from './loadable';
import {MergedSinceInner} from './merged-since';


const DiffEnvs = React.createClass({
  requestRev(hostName) {
    return Client.getAnonymousOcto().fromUrl(`https://${hostName}/rev.txt`).read().then((textFile) => {
      const shaInfos = {};
      textFile.split('\n').forEach((line) => {
        let [repoName, updatedStr, toStr, sha] = line.split(' ');
        if (repoName && sha) {
          if (updatedStr !== 'updated') { throw new Error('BUG! looks like rev.txt is malformed'); }
          if (toStr !== 'to')           { throw new Error('BUG! looks like rev.txt is malformed'); }
          // HACK: to account for the fact that rev.txt uses the old name for tutor-server
          if (repoName === 'tutor') {
            repoName = 'tutor-server';
          }
          shaInfos[repoName] = sha;
        }
      });
      return shaInfos;
    });
  },
  render() {
    let {startHost, endHost} = this.props.params;

    const allPromise = Promise.all([this.requestRev(startHost), this.requestRev(endHost)])
    .then(([startShaInfos, endShaInfos]) => {
      // build up an array of shas
      const repoInfos = Object.keys(endShaInfos).map((repoName) => {
        // HACK: assume the org is openstax
        return {repoOwner: 'openstax', repoName};
      });
      const startShas = repoInfos.map(({repoName}) => {
        return startShaInfos[repoName];
      });
      const endShas = repoInfos.map(({repoName}) => {
        return endShaInfos[repoName];
      });

      return {repoInfos, startShas, endShas};
    });

    return (
      <Loadable
        promise={allPromise}
        renderLoaded={({repoInfos, startShas, endShas}) => <MergedSinceInner repoInfos={repoInfos} startShas={startShas} endShas={endShas}/>}
      />
    );
  }
});


export default DiffEnvs;
