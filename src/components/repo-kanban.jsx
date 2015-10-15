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
import Board from './board.jsx';


const filterKanbanLabels = (labels, columnRegExp) => {
  const kanbanLabels = _.filter(labels, (label) => columnRegExp.test(label.name));
  // TODO: Handle more than 10 workflow states
  return kanbanLabels.sort();
};


const KanbanColumn = React.createClass({
  render() {
    const {label, cards, graph, primaryRepoName, columnRegExp} = this.props;

    const issueComponents = _.map(cards, (card) => {
      return (
        <Issue
          key={card.issue.id}
          primaryRepoName={primaryRepoName}
          card={card}
          graph={graph}
          columnRegExp={columnRegExp}
          />
      );
    });

    let onClick;
    onClick = () => FilterStore.addLabel(label);

    let icon;
    let name;
    if (columnRegExp.test(label.name)) {
      icon = (<i className='octicon octicon-list-unordered'/>);
      name = label.name.replace(/^\d+\ -\ /, ' ');
    } else {
      icon = null;
      name = label.name;
    }
    const title = (
      <span className='label-title' onClick={onClick}>
        {icon}
        {name}
      </span>
    );

    if (issueComponents.length || SettingsStore.getShowEmptyColumns()) {
      return (
        <BS.Col key={label.name} md={4} className='kanban-board-column'>
          <IssueList
            title={title}
            backgroundColor={label.color}
            label={label}
          >
            {issueComponents}
          </IssueList>
        </BS.Col>
      );
    } else {
      return null; // TODO: Maybe the panel should say "No Issues" (but only if it's the only column)
    }

  }
});


let isAlreadyShowedAnonymousModal = false;

const AnonymousModal = React.createClass({
  render() {
    const onHide = () => {
      isAlreadyShowedAnonymousModal = true;
      this.setState({ showModal: false});
    };
    let showModal;
    if (CurrentUserStore.getUser()) {
      showModal = false;
    } else {
      showModal = !isAlreadyShowedAnonymousModal;
    }

    return (
      <BS.Modal show={showModal} container={this} onHide={onHide}>
        <BS.Modal.Header closeButton>Viewing a Board Anonymously</BS.Modal.Header>
        <BS.Modal.Body className='anonymous-instructions'>
          <p>You are currently <strong>not signed in</strong>. GitHub's API only allows <em>60</em> requests per hour for non-authenticated users.</p>
          <p>Showing additional information for Pull Requests requires making a separate API call for each and can end up depleting the 60 requests quickly.</p>

          <p>The following information is <strong>disabled initially</strong>:</p>
          <ul>
            <li>Status information from services like Travis-CI and Jenkins</li>
            <li>Merge conflict information</li>
            <li>More than 100 issues on the board</li>
          </ul>
          <p>You can enable it by clicking the <BS.Button disabled bsSize='xs'><i className='octicon octicon-gear'/>{' '}<span className='caret'/></BS.Button> on the top-right corner next to <BS.Button disabled bsStyle='success' bsSize='xs'>Sign In</BS.Button> and selecting "Show More Pull Request Info" or by clicking the <BS.Button disabled bsStyle='success' bsSize='xs'>Sign In</BS.Button>.</p>
        </BS.Modal.Body>
        <BS.Modal.Footer>
          <BS.Button bsStyle='primary' onClick={onHide}>Ok, I'll find it if I need it</BS.Button>
        </BS.Modal.Footer>
      </BS.Modal>
    );
  }
});

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
    const {columnData, cards, primaryRepoName, columnRegExp} = this.props;


    let allLabels;
    if (!SettingsStore.getHideUncategorized()) {
      const uncategorized = [{name: UNCATEGORIZED_NAME}];
      allLabels = uncategorized.concat(columnData);
    } else {
      allLabels = columnData;
    }

    const kanbanLabels = filterKanbanLabels(allLabels, columnRegExp);

    const graph = buildBipartiteGraph(cards);



    let sortedCards = FilterStore.filterAndSort(graph, cards);

    let kanbanColumnCount = 0; // Count the number of actual columns displayed

    const isFilteringByColumn = _.filter(FilterStore.getLabels(), (label) => {
      return columnRegExp.test(label.name);
    })[0];

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
            key={label.name}
            label={label}
            cards={columnCards}
            graph={graph}
            columnRegExp={columnRegExp}
            primaryRepoName={primaryRepoName}
          />
        );
      } else {
        return null;
      }
    });

    return (
      <BS.Grid className='kanban-board' data-column-count={kanbanColumnCount}>
        <BS.Row>
          {kanbanColumns}
          {/* addCardList */}
        </BS.Row>
        <AnonymousModal/>
      </BS.Grid>
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
  renderLoaded() {
    let {repoOwner, repoNames, columnRegExp} = this.context.router.getCurrentParams();
    repoNames = repoNames.split('|');

    if (columnRegExp) {
      columnRegExp = new RegExp(columnRegExp);
    } else {
      columnRegExp = KANBAN_LABEL;
    }

    const primaryRepoName = repoNames[0];

    return (
      <Board {...this.props}
        repoOwner={repoOwner}
        repoNames={repoNames}
        columnRegExp={columnRegExp}
        type={KanbanRepo}
        columnDataPromise={Client.getOcto().repos(repoOwner, primaryRepoName).labels.fetch()}
      />
    );
  },
  render() {

    return (
      <Loadable
        promise={CurrentUserStore.fetchUser()}
        renderLoaded={this.renderLoaded}
      />
    );
  }
});

export default RepoKanbanShell;
