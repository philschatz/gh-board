import React from 'react';
import {connect} from 'react-redux';
import _ from 'underscore';
import {Link} from 'react-router';
import {MilestoneIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import {getReposFromStr} from '../helpers';
import {
  fetchMilestones,
  fetchIssues
} from '../redux/ducks/issue';
import IssueList from './issue-list';
import Issue from './issue';
import GithubFlavoredMarkdown from './gfm';


const KanbanColumn = React.createClass({
  render() {
    const {milestone, cards, primaryRepoName, columnRegExp} = this.props;

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

    let heading;
    if (milestone) {
      heading = (
        <Link className='milestone-title' to={getFilters().toggleMilestoneTitle(milestone.title).url()}>
          <MilestoneIcon/>
          <GithubFlavoredMarkdown
            inline
            disableLinks={true}
            text={milestone.title}/>
        </Link>
      );
    } else {
      heading = 'No Milestone';
    }

    return (
      <div className='kanban-board-column'>
        <IssueList
          title={heading}
          milestone={milestone}
        >
          {issueComponents}
        </IssueList>
      </div>
    );
  }
});


const ByMilestoneView = React.createClass({
  componentWillMount() {
    const {repoInfos, dispatch} = this.props;
    // pull out the primaryRepoName
    const [{repoOwner, repoName}] = repoInfos;
    dispatch(fetchIssues(repoInfos));
    dispatch(fetchMilestones(repoOwner, repoName));
  },
  render() {
    const {milestones, cards, repoInfos, columnRegExp, settings, filter} = this.props;

    // Get the primary repo
    const [primaryRepo] = repoInfos;

    const uncategorizedCards = _.filter(cards, (card) => {
      return !card.issue.milestone;
    });

    const uncategorizedColumn = (
      <KanbanColumn
        settings={settings}
        cards={uncategorizedCards}
        primaryRepoName={primaryRepo.repoName}
        columnRegExp={columnRegExp}
      />
    );

    const kanbanColumns = milestones.reduce((prev, milestone) => {
      if (filter.milestoneTitles.length && filter.milestoneTitles.indexOf(milestone.title) === -1) {
        return prev;
      }

      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = _.filter(cards, (card) => {
        return card.issue.milestone && card.issue.milestone.title === milestone.title;
      });

      /*HACK: Column should handle milestones */
      prev.push(
        <KanbanColumn
          settings={settings}
          key={milestone.title}
          milestone={milestone}
          cards={columnCards}
          primaryRepoName={primaryRepo.repoName}
          columnRegExp={columnRegExp}
        />
      );
      return prev;
    }, []);

    return (
      <div className='kanban-board'>
        {!settings.isHideUncategorized && uncategorizedColumn}
        {kanbanColumns}
      </div>
    );
  }
});

export default connect((state, ownProps) => {
  return {
    repoInfos: getReposFromStr((ownProps.params || {}).repoStr || ''),
    settings: state.settings,
    cards: state.issues.cards,
    columnRegExp: state.filter.columnRegExp,
    milestones: state.issues.milestones,
    filter: state.filter
  };
})(ByMilestoneView);

//
// const RepoKanbanShell = React.createClass({
//   componentWillMount() {
//     // Needs to be called before `render()`
//     IssueStore.startPolling();
//   },
//   componentWillUnmount() {
//     IssueStore.stopPolling();
//   },
//   renderLoaded() {
//     const {repoInfos, columnRegExp} = getFilters().getState();
//     // pull out the primaryRepoName
//     const [{repoOwner, repoName}] = repoInfos;
//
//     return (
//       <Board {...this.props}
//         repoInfos={repoInfos}
//         columnRegExp={columnRegExp}
//         type={ByMilestoneView}
//         columnDataPromise={IssueStore.fetchMilestones(repoOwner, repoName)}
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

// export default RepoKanbanShell;
