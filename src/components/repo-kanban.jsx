import React from 'react';
import _ from 'underscore';
import * as BS from 'react-bootstrap';

import {KANBAN_LABEL, UNCATEGORIZED_NAME} from '../helpers';
import IssueStore from '../issue-store';
import {filterCards, buildBipartiteGraph} from '../issue-store';
import SettingsStore from '../settings-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import Client from '../github-client';
import Loadable from './loadable.jsx';
import IssueList from './issue-list.jsx';
import Issue from './issue.jsx';


const filterKanbanLabels = (labels) => {
  const kanbanLabels = _.filter(labels, (label) => KANBAN_LABEL.test(label.name));
  // TODO: Handle more than 10 workflow states
  return kanbanLabels.sort();
};

const kanbanLabelName = (label) => label.name.slice(label.name.indexOf('-') + 2);


const filterReferencedCards = (graph, cards, isFilteringPullRequests) => {
  const allPossiblyRelatedCards = {};
  _.each(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? !card.issue.pullRequest : card.issue.pullRequest) {
      allPossiblyRelatedCards[graph.cardToKey(card)] = true;
    }
  });
  return _.filter(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? card.issue.pullRequest : !card.issue.pullRequest) {
      // loop through all the related PR's. If one matches, remove this issue
      const graphGet = isFilteringPullRequests ? graph.getB : graph.getA;
      const hasVisiblePullRequest = _.filter(graphGet.bind(graph)(graph.cardToKey(card)), ({vertex: otherCard}) => {
        if (allPossiblyRelatedCards[graph.cardToKey(otherCard)]) {
          return true;
        }
        return false;
      });
      return !hasVisiblePullRequest.length;
    } else {
      return true;
    }
  });
};

const KanbanColumn = React.createClass({
  render() {
    const {label, cards, graph, primaryRepoName} = this.props;

    const issueComponents = _.map(cards, (card) => {
      return (
        <Issue
          key={card.issue.id}
          primaryRepoName={primaryRepoName}
          card={card}
          graph={graph}
          />
      );
    });

    return (
      <BS.Col key={label.name} md={4} className='kanban-board-column'>
        <IssueList
          title={kanbanLabelName(label)}
          label={label}
        >
          {issueComponents}
        </IssueList>
      </BS.Col>
    );
  }
});

let isAlreadyShowedAnonymousModal = false;

const KanbanRepo = React.createClass({
  // onAddCardList() {
  //   const {onLabelsChanged} = this.props;
  //   const {labels} = this.props;
  //   const {repoOwner, repoName} = this.props;
  //
  //   const kanbanLabels = filterKanbanLabels(labels);
  //
  //   let lastId = '-1';
  //
  //   const lastLabel = kanbanLabels[kanbanLabels.length - 1];
  //   if (lastLabel.name === UNCATEGORIZED_NAME) {
  //     lastId = '-1';
  //   } else {
  //     lastId = lastLabel.name.match(/^\d+/)[0];
  //   }
  //   const newId = parseInt(lastId) + 1;
  //
  //   const labelName = prompt('Name of new CardList');
  //   if (labelName) {
  //     const name = newId + ' - ' + labelName;
  //     const color = 'cccccc';
  //
  //     // Add the label and re-render
  //     IssueStore.createLabel(repoOwner, repoName, {name, color})
  //     .then(() => {
  //       // Shortcut: Add the label to the list locally w/o refetching
  //       onLabelsChanged();
  //     });
  //   }
  // },
  render() {
    const {labels, cards, graph, primaryRepoName} = this.props;
    const close = () => {
      isAlreadyShowedAnonymousModal = true;
      this.setState({ showModal: false});
    };
    let showModal;
    if (CurrentUserStore.getUser()) {
      showModal = false;
    } else {
      showModal = !isAlreadyShowedAnonymousModal;
    }

    const kanbanLabels = filterKanbanLabels(labels);

    // Filter all the cards
    let filteredCards = cards;
    const userFilter = FilterStore.getUser();
    if (userFilter) {
      filteredCards = _.filter(filteredCards, (card) => {
        const issue = card.issue;
        if (issue.assignee && issue.assignee.login === userFilter.login) {
          return true;
        } else if (issue.user.login === userFilter.login) {
          return true;
        }
      });
    }
    const milestoneFilter = FilterStore.getMilestone();
    if (milestoneFilter) {
      filteredCards = _.filter(filteredCards, (card) => {
        const issue = card.issue;
        if (issue.milestone && issue.milestone.title === milestoneFilter.title) {
          return true;
        }
      });
    }

    filteredCards = filterCards(filteredCards, FilterStore.getLabels());
    const isFilteringByColumn = _.filter(FilterStore.getLabels(), (label) => {
      return KANBAN_LABEL.test(label.name);
    })[0];

    // Sort the cards by `updatedAt`
    let sortedCards = _.sortBy(filteredCards, (card) => {
      return card.issue.updatedAt;
    });
    // Reverse so newest ones are on top
    sortedCards.reverse();

    // Filter out any Issues that are associated with at least one Pull request in the list of cards
    if (!SettingsStore.getRelatedShowAll()) {
      const isFilteringPullRequests = SettingsStore.getRelatedHidePullRequests();
      sortedCards = filterReferencedCards(graph, sortedCards, isFilteringPullRequests);
    }

    let kanbanColumnCount = 0; // Count the number of actual columns displayed

    const kanbanColumns = _.map(kanbanLabels, (label) => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = filterCards(sortedCards, [label]);

      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      if ((!isFilteringByColumn && (SettingsStore.getShowEmptyColumns() || columnCards.length)) || (isFilteringByColumn && isFilteringByColumn.name === label.name)) {
        kanbanColumnCount++; // Count the number of actual columns displayed
        return (
          <KanbanColumn
            label={label}
            cards={columnCards}
            graph={graph}
            primaryRepoName={primaryRepoName}
          />
        );
      } else {
        return null;
      }
    });

    // const addCardList = (
    //   <td key='add-cardlist'>
    //     <BS.Button
    //       alt='Add a new Cardlist to Board'
    //       onClick={this.onAddCardList}>+</BS.Button>
    //   </td>
    // );

    return (
      <BS.Grid className='kanban-board' data-column-count={kanbanColumnCount}>
        <BS.Row>
          {kanbanColumns}
          {/* addCardList */}
        </BS.Row>
        <BS.Modal show={showModal} container={this} onHide={close}>
          <BS.Modal.Header closeButton>Viewing a Board Anonymously</BS.Modal.Header>
          <BS.Modal.Body className='anonymous-instructions'>
            <p>You are currently <strong>not signed in</strong>. GitHub's API only allows <em>60</em> requests per hour for non-authenticated users.</p>
            <p>Showing additional information for Pull Requests requires making a separate API call for each and can end up depleting the 60 requests quickly.</p>

            <p>The following information is <strong>disabled initially</strong>:</p>
            <ul>
              <li>Status information from services like Travis-CI and Jenkins</li>
              <li>Merge conflict information</li>
              <li>More than 20 issues on the board</li>
            </ul>
            <p>You can enable it by clicking the <BS.Button disabled bsSize='xs'><i className='octicon octicon-gear'/>{' '}<span className='caret'/></BS.Button> on the top-right corner next to <BS.Button disabled bsStyle='success' bsSize='xs'>Sign In</BS.Button> and selecting "Show More Pull Request Info".</p>
          </BS.Modal.Body>
          <BS.Modal.Footer>
            <BS.Button bsStyle='primary' onClick={close}>Ok, I'll find it if I need it</BS.Button>
          </BS.Modal.Footer>
        </BS.Modal>
      </BS.Grid>
    );
  }
});

const Repos = React.createClass({
  displayName: 'Repos',
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
    return ([labels, cards]) => {

      let allLabels;
      if (!SettingsStore.getHideUncategorized()) {
        const uncategorized = [{name: UNCATEGORIZED_NAME}];
        allLabels = uncategorized.concat(labels);
      } else {
        allLabels = labels;
      }

      const graph = buildBipartiteGraph(cards);

      return (
        <KanbanRepo
          labels={allLabels}
          cards={cards}
          graph={graph}
          primaryRepoName={primaryRepoName}
          onLabelsChanged={this.onLabelsChanged}
        />
      );

    };
  },
  render() {
    const {repoOwner, repoNames} = this.props;
    const primaryRepoName = repoNames[0];
    const labelsPromise = Client.getOcto().repos(repoOwner, primaryRepoName).labels.fetch();
    const cardsPromise = IssueStore.fetchAllIssues(repoOwner, repoNames);

    return (
      <Loadable key="${repoOwner}/${repoNames}"
        promise={Promise.all([labelsPromise, cardsPromise])}
        loadingText='Loading GitHub Issues and Pull Requests...'
        renderLoaded={this.renderKanbanRepos(primaryRepoName)}
        renderError={() => (<span>Problem loading. Is it a valid repo? And have you exceeded your number of requests? Usually happens when not logged in because GitHub limits anonymous use of their API.</span>)}
      />
    );
  }
});

const RepoKanbanShell = React.createClass({
  displayName: 'RepoKanbanShell',
  contextTypes: {
    router: React.PropTypes.func
  },
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  render() {
    let {repoOwner, repoNames} = this.context.router.getCurrentParams();
    repoNames = repoNames.split('|');

    return (
      <Loadable
        promise={CurrentUserStore.fetchUser()}
        renderLoaded={() => <Repos {...this.props} repoOwner={repoOwner} repoNames={repoNames}/>}
      />
    );
  }
});

export default RepoKanbanShell;
