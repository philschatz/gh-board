import React from 'react';
import * as BS from 'react-bootstrap';
import history from '../history';

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
  componentWillUnmount() {
    clearTimeout(this.__timeout); // stop polling for the new markdown to generate the preview
  },
  poll() {
    // Start polling
    Client.getAnonymousOcto().fromUrl(`${this.getUrl()}/export/txt`).read().then((text) => {
      this.setState({text});
      // This is the magic text inside a newly-created pad.
      // Defined in `etherpad-lite-heroku`'s settings file
      if (text.indexOf('Welcome to Etherpad!') >= 0) {
        this.loadIssueBody().then(() => {
          this.poll(); // Should be guaranteed to no longer be "This is an empty pad"
        })
      } else {
        this.__timeout = setTimeout(this.poll, 2000);
      }
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
    return card.fetchIssue().then(() => {

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
      return card.issue.body; // just in case someone uses this promise

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
  getIssueBody() {
    const {repoOwner, repoName, number} = this.props;
    const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);
    if (card.issue) {
      return card.issue.body;
    } else {
      return ''; // return '' so it can be trimmed when comparing
    }
  },
  promptLoadIssueBody() {
    if (confirm('Are you sure you want to discard the current collaborative edits and replace it with what is currently in GitHub?')) {
      this.loadIssueBody();
    }
  },
  render() {
    const {repoOwner, repoName} = this.props;
    const {text, isSaving} = this.state;
    const src = this.getUrl();
    let goBack;
    if (window.history.length) {
      goBack = (
        <BS.Button onClick={() => history.goBack()}>Go Back</BS.Button>
      );
    }
    let isLoadEnabled = false;
    let isSaveEnabled = false;
    if (text.trim() !== this.getIssueBody().trim()) {
      isLoadEnabled = true;
      // Only if the text changed and the user is authenticated should we allow saving
      if (UserStore.getUser()) {
        isSaveEnabled = !isSaving;
      }
    }
    return (
      <div>
        <div className='etherpad-operations'>
          {goBack}
          <BS.Button disabled={!isLoadEnabled} onClick={this.promptLoadIssueBody} title='Discards Edits and replaces the editor with what is currently on GitHub'>Reset Editor</BS.Button>
          <BS.Button disabled={!isSaveEnabled} onClick={this.saveIssueBody} title='Save changed made here back to GitHub (you must be logged in to gh-board)'>Save to GitHub</BS.Button>
        </div>
        <div className='etherpad-wrapper col-xs-12'>
          <iframe className='etherpad-frame col-xs-6' src={src} />
          <div className='etherpad-preview col-xs-6'>
            <GithubFlavoredMarkdown text={text} repoOwner={repoOwner} repoName={repoName} />
          </div>
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
