import React from 'react';
import _ from 'underscore';
import {Link} from 'react-router';
import {ListUnorderedIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import {UNCATEGORIZED_NAME} from '../helpers';
import IssueStore from '../issue-store';
import {filterCards} from '../issue-store';
import SettingsStore from '../settings-store';
import FilterStore from '../filter-store';
import CurrentUserStore from '../user-store';
import Loadable from './loadable';
import IssueList from './issue-list';
import Issue from './issue';
import Board from './board';
import AnonymousModal from './anonymous-modal';


const filterKanbanLabels = (labels, columnRegExp) => {
  const kanbanLabels = _.filter(labels, (label) => columnRegExp.test(label.name));
  // TODO: Handle more than 10 workflow states
  return _.sortBy(kanbanLabels, ({name}) => {
    if (name === UNCATEGORIZED_NAME) {
      // make sure Uncategorized is the left-most column
      return -1;
    } else {
      const result = /^(\d+)/.exec(name);
      return result && result[1] || name;
    }
  });
};


const KanbanColumn = React.createClass({
  render() {
    const {label, cards, primaryRepo} = this.props;
    const {columnRegExp} = getFilters().getState();

    const issueComponents = _.map(cards, (card) => {
      return (
        <Issue
          key={card.issue.id}
          primaryRepoName={primaryRepo.repoName}
          card={card}
          columnRegExp={columnRegExp}
          />
      );
    });

    let icon;
    let name;
    if (columnRegExp.test(label.name)) {
      icon = (<ListUnorderedIcon/>);
      name = label.name.replace(/^\d+\ -\ /, ' ');
    } else {
      icon = null;
      name = label.name;
    }
    const title = (
      <Link className='label-title' to={getFilters().toggleColumnLabel(label.name).url()}>
        {name}
      </Link>
    );

    if (issueComponents.length || SettingsStore.getShowEmptyColumns()) {
      return (
        <div key={label.name} className='kanban-board-column'>
          <IssueList
            icon={icon}
            title={title}
            backgroundColor={label.color}
            label={label}
            primaryRepo={primaryRepo}
          >
            {issueComponents}
          </IssueList>
        </div>
      );
    } else {
      return null; // TODO: Maybe the panel should say "No Issues" (but only if it's the only column)
    }
  }
});

const KanbanRepo = React.createClass({
  render() {
    const {columnData, cards, repoInfos} = this.props;
    const {columnRegExp} = getFilters().getState();

    // Get the primary repoOwner and repoName
    const [primaryRepo] = repoInfos;

    let allLabels;
    if (!SettingsStore.getHideUncategorized()) {
      const uncategorized = [{name: UNCATEGORIZED_NAME}];
      allLabels = uncategorized.concat(columnData);
    } else {
      allLabels = columnData;
    }

    const kanbanLabels = filterKanbanLabels(allLabels, columnRegExp);

    let sortedCards = FilterStore.filterAndSort(cards);

    const isFilteringByColumn = false;

    const kanbanColumns = _.map(kanbanLabels, (label) => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = filterCards(sortedCards, [label]);


      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      if ((!isFilteringByColumn && (SettingsStore.getShowEmptyColumns() || columnCards.length)) || (isFilteringByColumn && isFilteringByColumn.name === label.name)) {
        return (
          <KanbanColumn
            key={label.name}
            label={label}
            cards={columnCards}
            primaryRepo={primaryRepo}
          />
        );
      } else {
        return null;
      }
    });

    return (
      <div className='kanban-board'>
        {kanbanColumns}
        {/* addCardList */}
        <AnonymousModal/>
      </div>
    );
  }
});


let showedWarning = false;

const RepoKanbanShell = React.createClass({
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  renderLoaded() {
    const {repoInfos} = getFilters().getState();
    // Get the "Primary" repo for milestones and labels
    const [{repoOwner, repoName}] = repoInfos;

    // Alert the user once when they are viewing a repository that does not have any columns.
    // That way they know why everything is "Uncategorized"
    const promise = IssueStore.fetchLabels(repoOwner, repoName).then((labels) => {
      if (!showedWarning && filterKanbanLabels(labels, getFilters().getState().columnRegExp).length === 0) {
        showedWarning = true;
        alert('You are viewing a repository that does not have any properly formatted labels denoting columns so everything will show up as "Uncategorized". To create columns, rename your labels so they are "# - title" where # denotes the order of the column');
      }
      return labels;
    });
    return (
      <Board {...this.props}
        repoInfos={repoInfos}
        type={KanbanRepo}
        columnDataPromise={promise}
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
