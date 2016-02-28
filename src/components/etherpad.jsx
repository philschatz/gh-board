import React from 'react';
import * as BS from 'react-bootstrap';

import GithubFlavoredMarkdown from './gfm';
import Client from '../github-client';
import IssueStore from '../issue-store';
import UserStore from '../user-store';
import EtherpadClient from 'etherpad-lite-client';

const Etherpad = React.createClass({
  getInitialState() {
    return {isSaving: false, text: 'Please wait, it may take 30sec for the free Heroku site to spin up. See [Heroku Free Dynos](https://blog.heroku.com/archives/2015/5/7/heroku-free-dynos)'};
  },
  componentDidMount() {
    this.poll();
  },
  poll() {
    // Start polling
    Client.getAnonymousOcto().fromUrl(`${this.getUrl()}/export/txt`).read().then((text) => {
      this.setState({text});
      setTimeout(this.poll, 2000);
    });
  },
  getPadName() {
    const {repoOwner, repoName, number} = this.props;
    return `github.com_${repoOwner}_${repoName}_${number}`;
  },
  getUrl() {
    const {hostName} = this.props;
    const padName = this.getPadName();
    // from https://github.com/ether/etherpad-lite-jquery-plugin/blob/master/js/etherpad.js
    return `${hostName}/p/${padName}`;
  },
  loadIssueBody() {
    const {hostName, secret} = this.props;
    const {repoOwner, repoName, number} = this.props;

    const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);

    // refetch the Issue body (esp if it hasn't been loaded yet)
    card.fetchIssue().then(() => {

      // const url = `${hostName}/api/1/setText?apiKey=${secret}&padID=${this.getPad()}&text=`;
      const etherpad = EtherpadClient.connect({
        apikey: 'openstaxkey',
        host: 'openstax-pad.herokuapp.com',
        port: 443,
        protocol: 'https:', //because browserify's `https` module is really `http`
        ssl: true
      });
      etherpad.setText({padID: this.getPadName(), text: card.issue.body}, (err, val) => {
        console.log('Because of CORS this returns an error but actually succeeeds');
        console.log(err);
        console.log(val);
      });

    });
  },
  saveIssueBody() {
    const {text} = this.state;
    const {repoOwner, repoName, number} = this.props;
    this.setState({isSaving: true});
    Client.getOcto().repos(repoOwner, repoName).issues(number).update({body: text}).then((resp) => {
      // TODO: un-disable the state
      this.setState({isSaving: false});
    });
  },
  render() {
    const {repoOwner, repoName} = this.props;
    const {text, isSaving} = this.state;
    const src = this.getUrl();
    let saveButton;
    if (UserStore.getUser()) {
      saveButton = (
        <BS.Button disabled={isSaving} onClick={this.saveIssueBody}>Save Changes to Issue</BS.Button>
      );
    }
    return (
      <div>
        <div className='etherpad-operations'>
          <BS.Button onClick={this.loadIssueBody}>Load Issue into Editor</BS.Button>
          {saveButton}
        </div>
        <div className='etherpad-wrapper'>
            <iframe className='etherpad-frame' src={src} />
            <GithubFlavoredMarkdown text={text} repoOwner={repoOwner} repoName={repoName} />
        </div>
      </div>
    );
  }
});

const EtherpadShell = React.createClass({
  render() {
    const {repoOwner, repoName, number} = this.props.params;
    const hostName = 'https://openstax-pad.herokuapp.com';
    const secret = 'openstax';

    return (
      <div>
        <Etherpad hostName={hostName} secret={secret} repoOwner={repoOwner} repoName={repoName} number={number}/>
      </div>
    );
  }
});

export default EtherpadShell;
