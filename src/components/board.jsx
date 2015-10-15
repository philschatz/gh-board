import React from 'react';

import IssueStore from '../issue-store';
import SettingsStore from '../settings-store';
import FilterStore from '../filter-store';
import Loadable from './loadable.jsx';

const Board = React.createClass({
  propTypes: {
    type: React.PropTypes.func.isRequired, // A React Component
    repoOwner: React.PropTypes.string.isRequired,
    repoNames: React.PropTypes.array.isRequired,
    columnDataPromise: React.PropTypes.object.isRequired
  },
  componentDidMount() {
    IssueStore.on('change', this.onChange);
    FilterStore.on('change', this.onChange);
    SettingsStore.on('change', this.onChange);
    SettingsStore.on('change:showPullRequestData', this.onChangeAndRefetch);
  },
  componentWillUnmount() {
    IssueStore.off('change', this.onChange);
    FilterStore.off('change', this.onChange);
    SettingsStore.off('change', this.onChange);
    SettingsStore.off('change:showPullRequestData', this.onChangeAndRefetch);
  },
  onChangeAndRefetch() {
    IssueStore.clearCacheCards();
    this.forceUpdate();
  },
  onChange() {
    this.setState({});
  },
  onLabelsChanged() {
    this.setState({});
  },
  // Curried func to squirrell the primaryRepoName var
  renderKanbanRepos(primaryRepoName) {
    const {type, columnRegExp} = this.props;

    return ([columnData, cards]) => {

      return React.createElement(type, {columnData, cards, primaryRepoName, columnRegExp});

    };
  },
  render() {
    const {repoOwner, repoNames, columnDataPromise} = this.props;
    const primaryRepoName = repoNames[0];
    const cardsPromise = IssueStore.fetchAllIssues(repoOwner, repoNames);

    return (
      <Loadable key="${repoOwner}/${repoNames}"
        promise={Promise.all([columnDataPromise, cardsPromise])}
        loadingText='Loading GitHub Issues and Pull Requests...'
        renderLoaded={this.renderKanbanRepos(primaryRepoName)}
        renderError={() => (<span>Problem loading. Is it a valid repo? And have you exceeded your number of requests? Usually happens when not logged in because GitHub limits anonymous use of their API.</span>)}
      />
    );
  }
});

export default Board;
