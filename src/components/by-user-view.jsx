import React from 'react';
import _ from 'underscore';
import * as BS from 'react-bootstrap';

import IssueStore from '../issue-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import {KANBAN_LABEL, getReposFromStr} from '../helpers';
import Loadable from './loadable';
import IssueList from './issue-list';
import Issue from './issue';
import Board from './board';

/* Copy-pasta from MilestonesView */

const KanbanColumn = React.createClass({
  render() {
    const {login, cards, primaryRepoName, columnRegExp} = this.props;

    const issueComponents = _.map(cards, (card) => {
      return (
        <Issue
          key={card.issue.id}
          primaryRepoName={primaryRepoName}
          card={card}
          columnRegExp={columnRegExp}
          />
      );
    });

    let heading;
    heading = (
      <span className='user-title'>
        <i className='octicon octicon-user'/>
        {login}
      </span>
    );

    return (
      <BS.Col key={login} md={4} className='kanban-board-column'>
        <IssueList title={heading}>
          {issueComponents}
        </IssueList>
      </BS.Col>
    );

  }
});


const MilestonesView = React.createClass({
  render() {
    const {repoInfos, columnData, cards, columnRegExp} = this.props;
    const [{repoName}] = repoInfos; // primaryRepoName

    let sortedCards = FilterStore.filterAndSort(cards, true/*isShowingMilestones*/);

    let kanbanColumnCount = 0; // Count the number of actual columns displayed

    const kanbanColumns = _.map(columnData, (login) => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = _.filter(sortedCards, (card) => {
        return card.issue.owner && card.issue.owner.login === login || card.issue.user.login === login;
      });


      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      kanbanColumnCount++; // Count the number of actual columns displayed
      /*HACK: Column should handle milestones */
      return (
        <KanbanColumn
          login={login}
          cards={columnCards}
          primaryRepoName={repoName}
          columnRegExp={columnRegExp}
        />
      );
    });

    return (
      <BS.Grid className='kanban-board' data-column-count={kanbanColumnCount}>
        <BS.Row>
          {kanbanColumns}
        </BS.Row>
      </BS.Grid>
    );
  }
});


const RepoKanbanShell = React.createClass({
  displayName: 'RepoKanbanShell',
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  renderLoaded() {
    let {repoStr, columnRegExp} = this.props.params;
    const repoInfos = getReposFromStr(repoStr);

    if (columnRegExp) {
      columnRegExp = new RegExp(columnRegExp);
    } else {
      columnRegExp = KANBAN_LABEL;
    }

    const columnDataPromise =
      IssueStore.fetchAllIssues(repoInfos, false/*isForced*/)
      .then((cards) => {
        const logins = new Set();
        for (const card of cards) {
          logins.add(card.issue.user.login);
        }
        const loginsArray = [];
        for (const login of logins) {
          loginsArray.push(login);
        }
        loginsArray.sort();
        return loginsArray;
      });

    return (
      <Board {...this.props}
        repoInfos={repoInfos}
        columnRegExp={columnRegExp}
        type={MilestonesView}
        columnDataPromise={columnDataPromise}
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
