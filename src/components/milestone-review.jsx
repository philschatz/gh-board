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
import Loadable from './loadable';
import IssueList from './issue-list';
import Issue from './issue';
import Board from './board';
import GithubFlavoredMarkdown from './gfm';

import d3 from 'd3';
import gantt from '../gantt-chart';


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

const GanttChart = React.createClass({
  componentDidMount() {
    const {milestones} = this.props;
    const {ganttWrapper} = this.refs;
    const now = new Date();
    const tasks = milestones.map((milestone) => {
      const {createdAt, dueOn, title, state, closedIssues, openIssues} = milestone;
      const dueAt = dueOn ? new Date(dueOn) : null;
      let status;
      if (dueAt && dueAt.getTime() < now.getTime()) {
        status = 'milestone-status-overdue';
      } else {
        status = `milestone-status-${state}`;
      }
      let percent;
      if (closedIssues + openIssues) {
        percent = closedIssues / (closedIssues + openIssues);
      } else {
        percent = Math.random(); //TODO: HACK to just show something "interesting"
      }
      return {
        startDate: createdAt,
        endDate: dueAt || now,
        taskName: title,
        status: status,
        percent: percent,
        progress: closedIssues,
        progressTotal: closedIssues + openIssues
      }
    });

    const taskStatus = {
      'milestone-status-overdue': 'milestone-status-overdue',
        'milestone-status-open' : 'milestone-status-open',
        'milestone-status-closed' : 'milestone-status-closed'
    };

    const taskNames = tasks.map(({taskName}) => taskName).sort();

    tasks.sort(function(a, b) {
        return a.endDate - b.endDate;
    });
    const maxDate = tasks[tasks.length - 1].endDate;
    tasks.sort(function(a, b) {
        return a.startDate - b.startDate;
    });
    const minDate = tasks[0].startDate;

    const format = '%H:%M';

    const chart = gantt(taskNames.length).taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format).selector('#the-gantt-chart');
    chart(tasks);


    function changeTimeDomain(timeDomainString) {
        let format;
        switch (timeDomainString) {
          case '1hr':
          	format = '%H:%M:%S';
          	chart.timeDomain([ d3.time.hour.offset(maxDate, -1), maxDate ]);
          	break;
          case '3hr':
          	format = '%H:%M';
          	chart.timeDomain([ d3.time.hour.offset(maxDate, -3), maxDate ]);
          	break;

          case '6hr':
          	format = '%H:%M';
          	chart.timeDomain([ d3.time.hour.offset(maxDate, -6), maxDate ]);
          	break;

          case '1day':
          	format = '%H:%M';
          	chart.timeDomain([ d3.time.day.offset(maxDate, -1), maxDate ]);
          	break;

          case '1week':
          	format = '%m/%d';
          	chart.timeDomain([ d3.time.day.offset(maxDate, -7), maxDate ]);
          	break;
          default:
          	format = '%H:%M'

        }
        chart.tickFormat(format);
        chart.redraw(tasks);
    }

    changeTimeDomain('1week');

  },
  render() {
    return (
      <div ref='ganttWrapper' id='the-gantt-chart'/>
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
  renderLoaded(allMilestones) {
    return (
      <GanttChart milestones={allMilestones}/>
    );
  },
  render() {
    let {repoOwner, repoNames, columnRegExp} = this.props.params;
    repoNames = repoNames.split('|');

    const primaryRepoName = repoNames[0];
    // TODO: Actually do all the milestones
    const allMilestones = Client.getOcto().repos(repoOwner, primaryRepoName).milestones.fetch();

    return (
      <Loadable
        promise={allMilestones}
        renderLoaded={this.renderLoaded}
      />
    );
  }
});

export default RepoKanbanShell;
