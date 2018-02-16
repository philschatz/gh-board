import React from 'react';
import {connect} from 'react-redux';
import _ from 'underscore';
import {PersonIcon} from 'react-octicons';

import {selectors} from '../../redux/ducks/filter';
import {
  fetchIssues
} from '../../redux/ducks/issue';
import IssueList from '../issue-list';
import Issue from '../issue';

const KanbanColumn = React.createClass({
  render() {
    const {login, cards, primaryRepoName, columnRegExp, filters} = this.props;

    const issueComponents = _.map(cards, (card) => {
      return (
        <Issue
          key={card.key()}
          filters={filters}
          primaryRepoName={primaryRepoName}
          card={card}
          columnRegExp={columnRegExp}
        />
      );
    });

    const heading = (
      <span className='user-title'>
        <PersonIcon/>
        {login}
      </span>
    );

    return (
      <div className='kanban-board-column'>
        <IssueList
          title={heading}
          login={login}
        >
          {issueComponents}
        </IssueList>
      </div>
    );

  }
});


const UsersView = React.createClass({
  componentWillMount() {
    const {repoInfos, dispatch} = this.props;
    dispatch(fetchIssues(repoInfos));
  },
  render() {
    const {repoInfos, cards, columnRegExp, filters} = this.props;
    const [{repoName}] = repoInfos; // primaryRepoName

    const logins = new Set();
    for (const card of this.props.cards) {
      logins.add(card.issue.user.login);
    }
    const loginsArray = [];
    for (const login of logins) {
      loginsArray.push(login);
    }
    loginsArray.sort();

    const kanbanColumns = _.map(loginsArray, (login) => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = _.filter(cards, (card) => {
        return card.issue.owner && card.issue.owner.login === login || card.issue.user.login === login;
      });


      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      return (
        <KanbanColumn
          key={login}
          filters={filters}
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
});

export default connect((state, ownProps) => {
  const repoInfos = selectors.getReposFromParams(ownProps.params);
  return {
    repoInfos,
    filters: new selectors.FilterBuilder(state.filter, repoInfos),
    settings: state.settings,
    cards: state.issues.cards,
    columnRegExp: state.filter.columnRegExp,
    milestones: state.issues.milestones,
    filter: state.filter
  };
})(UsersView);


// const RepoKanbanShell = React.createClass({
//   displayName: 'RepoKanbanShell',
//   componentWillMount() {
//     // Needs to be called before `render()`
//     IssueStore.startPolling();
//   },
//   componentWillUnmount() {
//     IssueStore.stopPolling();
//   },
//   renderLoaded() {
//     const {repoInfos, columnRegExp} = getFilters().getState();
//
//     const columnDataPromise =
//       IssueStore.fetchIssues()
//       .then((cards) => {
//         const logins = new Set();
//         for (const card of cards) {
//           logins.add(card.issue.user.login);
//         }
//         const loginsArray = [];
//         for (const login of logins) {
//           loginsArray.push(login);
//         }
//         loginsArray.sort();
//         return loginsArray;
//       });
//
//     return (
//       <Board {...this.props}
//         repoInfos={repoInfos}
//         columnRegExp={columnRegExp}
//         type={UsersView}
//         columnDataPromise={columnDataPromise}
//       />
//     );
//   },
//   render() {
//
//     return (
//       <Loadable
//         promise={CurrentUserStore.fetchUser()}
//         renderLoaded={this.renderLoaded}
//       />
//     );
//   }
// });
//
// export default RepoKanbanShell;
