import React from 'react';

import Client from '../github-client';
import Loadable from './loadable';
import {MergedSinceInner} from './merged-since';


const DiffEnvs = React.createClass({
  requestRev(hostName) {
    return Client.getAnonymousOcto().fromUrl(`https://${hostName}/rev.txt`).read().then((textFile) => {
      const shaInfos = {};
      textFile.split('\n').forEach((line) => {
        let [repoName, atSymbol, sha] = line.split(' ');
        if (repoName[0] === '/') {
          repoName = repoName.substring(1);
        }
        if (repoName && sha) {
          if (atSymbol !== '@') {
            alert('BUG! looks like rev.txt is malformed. Skipping: ' + line);
          } else {
            shaInfos[repoName] = sha;
          }
        }
      });
      return shaInfos;
    });
  },
  render() {
    let {startHost, endHost} = this.props.params;

    const allPromise = Promise.all([this.requestRev(startHost), this.requestRev(endHost)])
    .then(([startShaInfos, endShaInfos]) => {
      // Make sure repoInfos only contains repos that are in both the start and end
      Object.keys(endShaInfos).forEach((key) => {
        if (!startShaInfos[key]) {
          delete endShaInfos[key];
        }
      })
      Object.keys(startShaInfos).forEach((key) => {
        if (!endShaInfos[key]) {
          delete startShaInfos[key];
        }
      })


      // build up an array of shas
      let repoInfos = Object.keys(endShaInfos).map((repoPath) => {
        // HACK: assume the org is openstax
        const [repoOwner, repoName] = repoPath.split('/');
        return {repoOwner, repoName};
      });
      const startShas = repoInfos.map(({repoOwner, repoName}) => {
        return startShaInfos[`${repoOwner}/${repoName}`];
      });
      const endShas = repoInfos.map(({repoOwner, repoName}) => {
        return endShaInfos[`${repoOwner}/${repoName}`];
      });

      console.log('startShaInfos');
      console.log(startShaInfos);
      console.log('endShaInfos');
      console.log(endShaInfos);

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
