import {Component} from 'react';
import _ from 'underscore';
import {Link} from 'react-router';
import {MilestoneIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import IssueStore from '../issue-store';
import SettingsStore from '../settings-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import Loadable from './loadable';
import IssueList from './issue-list';
import Issue from './issue';
import Board from './board';
import GithubFlavoredMarkdown from './gfm';


function KanbanColumn(props) {
  const {milestone, cards, primaryRepoName, columnRegExp} = props;

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

  const isShowingColumn = (
       (!milestone && !SettingsStore.getHideUncategorized())
    || (milestone && (
           getFilters().getState().milestoneTitles.length == 0
        || getFilters().getState().milestoneTitles.indexOf(milestone.title) >= 0))
  );

  if (isShowingColumn) {
    return (
      <div key={milestone && milestone.title || 'no-milestone'} className='kanban-board-column'>
        <IssueList
          title={heading}
          milestone={milestone}
        >
          {issueComponents}
        </IssueList>
      </div>
    );
  } else {
    return null; // TODO: Maybe the panel should say "No Issues" (but only if it's the only column)
  }

}

function ByMilestoneView(props) {
  const {columnData, cards, primaryRepoName, columnRegExp} = props;

  const uncategorizedCards = _.filter(cards, (card) => {
    return !card.issue.milestone;
  });

  let sortedCards = FilterStore.filterAndSort(cards, true/*isShowingMilestones*/);

  let kanbanColumnCount = 0; // Count the number of actual columns displayed
  kanbanColumnCount++; // "No Milestone" counts as a column

  const uncategorizedColumn = (
    <KanbanColumn
      cards={uncategorizedCards}
      primaryRepoName={primaryRepoName}
      columnRegExp={columnRegExp}
    />
  );

  const kanbanColumns = _.map(columnData, (milestone) => {
    // If we are filtering by a kanban column then only show that column
    // Otherwise show all columns
    const columnCards = _.filter(sortedCards, (card) => {
      return card.issue.milestone && card.issue.milestone.title === milestone.title;
    });


    // Show the column when:
    // isFilteringByColumn = label (the current column we are filtering on)
    // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

    kanbanColumnCount++; // Count the number of actual columns displayed
    /*HACK: Column should handle milestones */
    return (
      <KanbanColumn
        key={kanbanColumnCount}
        milestone={milestone}
        cards={columnCards}
        primaryRepoName={primaryRepoName}
        columnRegExp={columnRegExp}
      />
    );
  });

  return (
    <div className='kanban-board'>
      {uncategorizedColumn}
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
    // pull out the primaryRepoName
    const [{repoOwner, repoName}] = repoInfos;

    return (
      <Board {...this.props}
        repoInfos={repoInfos}
        columnRegExp={columnRegExp}
        type={ByMilestoneView}
        columnDataPromise={IssueStore.fetchMilestones(repoOwner, repoName)}
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
