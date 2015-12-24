import React from 'react';
import _ from 'underscore';
import * as BS from 'react-bootstrap';

import IssueStore from '../issue-store';
import {buildBipartiteGraph} from '../issue-store';
import SettingsStore from '../settings-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import Client from '../github-client';
import {KANBAN_LABEL} from '../helpers';
import Loadable from './loadable.jsx';
import IssueList from './issue-list.jsx';
import Issue from './issue.jsx';
import Board from './board.jsx';
import GithubFlavoredMarkdown from './gfm.jsx';


const KanbanColumn = React.createClass({
  render() {
    const {milestone, cards, graph, primaryRepoName, columnRegExp} = this.props;

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

    let heading;
    if (milestone) {
      heading = (
        <span className='milestone-title' onClick={() => FilterStore.setMilestone(milestone)}>
          <i className='octicon octicon-milestone'/>
          <GithubFlavoredMarkdown
            inline
            disableLinks={true}
            text={milestone.title}/>
        </span>
      );
    } else {
      heading = 'No Milestone';
    }

    const milestoneFilter = FilterStore.getMilestone();
    const isShowingColumn = (
        issueComponents.length
      || SettingsStore.getShowEmptyColumns()
      || (milestone && milestoneFilter && milestone.title === milestoneFilter.title)
    );

    if (isShowingColumn) {
      return (
        <BS.Col key={milestone && milestone.title || 'no-milestone'} md={4} className='kanban-board-column'>
          <IssueList
            title={heading}
            milestone={milestone}
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


const ByMilestoneView = React.createClass({
  render() {
    const {columnData, cards, primaryRepoName, columnRegExp} = this.props;

    const graph = buildBipartiteGraph(cards);

    const uncategorizedCards = _.filter(cards, (card) => {
      return !card.issue.milestone;
    });

    let sortedCards = FilterStore.filterAndSort(graph, cards, true/*isShowingMilestones*/);

    let kanbanColumnCount = 0; // Count the number of actual columns displayed

    const uncategorizedColumn = (
      <KanbanColumn
        cards={uncategorizedCards}
        graph={graph}
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
          milestone={milestone}
          cards={columnCards}
          graph={graph}
          primaryRepoName={primaryRepoName}
          columnRegExp={columnRegExp}
        />
      );
    });

    return (
      <BS.Grid className='kanban-board' data-column-count={kanbanColumnCount}>
        <BS.Row>
          {uncategorizedColumn}
          {kanbanColumns}
        </BS.Row>
      </BS.Grid>
    );
  }
});


const RepoKanbanShell = React.createClass({
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  renderLoaded() {
    let {repoOwner, repoNames, columnRegExp} = this.props.params;
    repoNames = repoNames.split('|');

    const primaryRepoName = repoNames[0];

    if (columnRegExp) {
      columnRegExp = new RegExp(columnRegExp);
    } else {
      columnRegExp = KANBAN_LABEL;
    }

    return (
      <Board {...this.props}
        repoOwner={repoOwner}
        repoNames={repoNames}
        columnRegExp={columnRegExp}
        type={ByMilestoneView}
        columnDataPromise={Client.getOcto().repos(repoOwner, primaryRepoName).milestones.fetch()}
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
