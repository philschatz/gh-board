import React from 'react';
import _ from 'underscore';
import * as BS from 'react-bootstrap';

import {KANBAN_LABEL, ICEBOX_NAME} from '../helpers';
import {Store, filterCards} from '../issue-store';
import {FilterStore} from '../filter-store';
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

const KanbanColumn = React.createClass({
  render() {
    const {label, cards, primaryRepoName} = this.props;

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
    filteredCards = filterCards(filteredCards, FilterStore.getLabels().concat(label));
    // Sort the cards by `updatedAt`
    const sortedCards = _.sortBy(filteredCards, (card) => {
      return card.issue.updatedAt;
    });
    // Reverse so newest ones are on top
    sortedCards.reverse();

    const issueComponents = _.map(sortedCards, (card) => {
      return (
        <Issue
          key={card.issue.id}
          primaryRepoName={primaryRepoName}
          repoOwner={card.repoOwner}
          repoName={card.repoName}
          issue={card.issue}
          />
      );
    });

    return (
      <td key={label.name} className='kanban-board-column'>
        <IssueList
          title={kanbanLabelName(label)}
          label={label}
        >
          {issueComponents}
        </IssueList>
      </td>
    );
  }
});

const KanbanRepo = React.createClass({
  displayName: 'KanbanRepo',
  onAddCardList() {
    const {onLabelsChanged} = this.props;
    const {labels} = this.props;
    const {repoOwner, repoName} = this.props;

    const kanbanLabels = filterKanbanLabels(labels);

    let lastId = '-1';

    const lastLabel = kanbanLabels[kanbanLabels.length - 1];
    if (lastLabel.name === ICEBOX_NAME) {
      lastId = '-1';
    } else {
      lastId = lastLabel.name.match(/^\d+/)[0];
    }
    const newId = parseInt(lastId) + 1;

    const labelName = prompt('Name of new CardList');
    if (labelName) {
      const name = newId + ' - ' + labelName;
      const color = 'cccccc';

      // Add the label and re-render
      Store.createLabel(repoOwner, repoName, {name, color})
      .then(() => {
        // Shortcut: Add the label to the list locally w/o refetching
        onLabelsChanged();
      });
    }
  },
  render() {
    const {labels, cards, primaryRepoName} = this.props;
    const kanbanLabels = filterKanbanLabels(labels);

    const kanbanColumns = _.map(kanbanLabels, (label) => {
      return (
        <KanbanColumn
          label={label}
          cards={cards}
          primaryRepoName={primaryRepoName}
        />
      );
    });

    const addCardList = (
      <td key='add-cardlist'>
        <BS.Button
          alt='Add a new Cardlist to Board'
          onClick={this.onAddCardList}>+</BS.Button>
      </td>
    );

    return (
      <table className='kanban-board' data-column-count={kanbanColumns.length}>
        <tbody>
          <tr>
            {kanbanColumns}
            {addCardList}
          </tr>
        </tbody>
      </table>
    );
  }
});

const Repos = React.createClass({
  displayName: 'Repos',
  componentDidMount() {
    Store.on('change', this.onChange);
  },
  componentWillUnmount() {
    Store.off('change', this.onChange);
  },
  onChange() {
    this.setState({});
  },
  onLabelsChanged() {
    this.setState({});
  },
  // Curried func to squirrell the primaryRepoName var
  renderKanbanRepos(primaryRepoName) {
    return (values) => {
      const labels = values[0];
      const cards = values[1];

      // If there are at least 2 'special' kanban labels then consider it valid
      // const kanbanLabels = filterKanbanLabels(labels);
      // const isValidKanbanRepo = kanbanLabels.length > 1;
      let allLabels;
      if (FilterStore.getShowIcebox()) {
        const icebox = [{name: ICEBOX_NAME}];
        allLabels = icebox.concat(labels);
      } else {
        allLabels = labels;
      }

      return (
        <KanbanRepo
          labels={allLabels}
          cards={cards}
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
    const cardPromises = _.map(repoNames, (repoName) => {
      return Store.fetchAll(repoOwner, repoName).then((issues) => {
        return _.map(issues, (issue) => {
          return {repoOwner, repoName, issue};
        });
      });
    });

    const cardsPromise = Promise.all(cardPromises).then((arr) => {
      return _.flatten(arr, true /*shallow*/);
    });

    return (
      <Loadable key="${repoOwner}/${repoNames}"
        promise={Promise.all([labelsPromise, cardsPromise])}
        renderLoaded={this.renderKanbanRepos(primaryRepoName)}
      />
    );
  }
});

const RepoKanbanShell = React.createClass({
  displayName: 'RepoKanbanShell',
  contextTypes: {
    router: React.PropTypes.func
  },
  render() {
    let {repoOwner, repoNames} = this.context.router.getCurrentParams();
    repoNames = repoNames.split('|');

    const renderError = () => {
      return (
        <div>Problem loading repo. Is it a valid repo? And are you connected to the internet?</div>
      );
    };

    return (
      <Repos {...this.props}
        repoOwner={repoOwner}
        repoNames={repoNames}
      />
    );
  }
});

export default RepoKanbanShell;
