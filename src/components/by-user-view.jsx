import {Component} from 'react';
import _ from 'underscore';
import {UserIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import IssueStore from '../issue-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import Loadable from './loadable';
import IssueList from './issue-list';
import Issue from './issue';
import Board from './board';

function KanbanColumn(props) {
  const {login, cards, primaryRepoName, columnRegExp} = props;

  const issueComponents = _.map(cards, (card) => {
    return (
      <Issue
        key={card.key()}
        primaryRepoName={primaryRepoName}
        card={card}
        columnRegExp={columnRegExp}
        />
    );
  });

  const heading = (
    <span className='user-title'>
      <UserIcon/>
      {login}
    </span>
  );

  return (
    <div key={login} className='kanban-board-column'>
      <IssueList title={heading}>
        {issueComponents}
      </IssueList>
    </div>
  );

}

function UsersView(props) {
  const {repoInfos, columnData, cards, columnRegExp} = props;
  const [{repoName}] = repoInfos; // primaryRepoName

  let sortedCards = FilterStore.filterAndSort(cards, true);

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
    return (
      <KanbanColumn
        key={kanbanColumnCount}
        login={login}
        cards={columnCards}
        primaryRepoName={repoName}
        columnRegExp={columnRegExp}
      />
    );
  });

  return (
    <div className='kanban-board'>
      {kanbanColumns}
    </div>
  );
}

class RepoKanbanShell extends Component {
  UNSAFE_componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  }

  componentWillUnmount() {
    IssueStore.stopPolling();
  }

  renderLoaded = () => {
    const {repoInfos, columnRegExp} = getFilters().getState();

    const columnDataPromise =
      IssueStore.fetchIssues()
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
        type={UsersView}
        columnDataPromise={columnDataPromise}
      />
    );
  };

  render() {

    return (
      <Loadable
        promise={CurrentUserStore.fetchUser()}
        renderLoaded={this.renderLoaded}
      />
    );
  }
}

export default RepoKanbanShell;
