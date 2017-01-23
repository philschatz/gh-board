import React from 'react';
import _ from 'underscore';
import {connect} from 'react-redux';
import {Link} from 'react-router';
import {ListUnorderedIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import {contains, KANBAN_LABEL, getReposFromStr, UNCATEGORIZED_NAME} from '../helpers';
import {
  fetchLabels,
  fetchIssues
} from '../redux/ducks/issue';
import IssueList from './issue-list';
import Issue from './issue';
import AnonymousModal from './anonymous-modal';

function filterCards(cards, labels) {
  let filtered = cards;
  // Curry the fn so it is not declared inside a loop
  const filterFn = (label) => (card) => {
    const containsLabel = contains(card.issue.labels, (cardLabel) => {
      return cardLabel.name === label.name;
    });
    if (containsLabel) {
      return true;
    } else if (UNCATEGORIZED_NAME === label.name) {
      // If the issue does not match any list then add it to the backlog
      for (const l of card.issue.labels) {
        if (KANBAN_LABEL.test(l.name)) {
          return false;
        }
      }
      // no list labels, so include it in the backlog
      return true;
    }
  };
  for (const i in labels) {
    const label = labels[i];
    filtered = _.filter(filtered, filterFn(label));
    if (filtered.length === 0) {
      return [];
    }
  }
  return filtered;
}

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
    const {label, cards, primaryRepo, settings, columnRegExp} = this.props;

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

    if (issueComponents.length || settings.isShowEmptyColumns) {
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
  componentWillMount() {
    const {repoInfos, dispatch} = this.props;
    // Get the "Primary" repo for milestones and labels
    const [{repoOwner, repoName}] = repoInfos;
    dispatch(fetchLabels(repoOwner, repoName));
    dispatch(fetchIssues(repoInfos));
  },
  render() {
    const {labels, cards, repoInfos, settings, columnRegExp} = this.props;

    // Get the primary repo
    const [primaryRepo] = repoInfos;

    let allLabels;
    if (!settings.isHideUncategorized) {
      const uncategorized = [{name: UNCATEGORIZED_NAME}];
      allLabels = uncategorized.concat(labels);
    } else {
      allLabels = labels;
    }

    const kanbanLabels = filterKanbanLabels(allLabels, columnRegExp);

    const isFilteringByColumn = false;

    const kanbanColumns = _.map(kanbanLabels, (label) => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = filterCards(cards, [label]);


      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      if ((!isFilteringByColumn && (settings.isShowEmptyColumns || columnCards.length)) || (isFilteringByColumn && isFilteringByColumn.name === label.name)) {
        return (
          <KanbanColumn
            columnRegExp={columnRegExp}
            settings={settings}
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

export default connect((state, ownProps) => {
  return {
    repoInfos: getReposFromStr((ownProps.params || {}).repoStr || ''),
    settings: state.settings,
    columnRegExp: state.filter.columnRegExp,
    cards: state.issues.cards,
    labels: state.issues.labels
  };
})(KanbanRepo);

// const RepoKanbanShell = React.createClass({
//   componentWillMount() {
//     // Needs to be called before `render()`
//     IssueStore.startPolling();
//   },
//   componentWillUnmount() {
//     IssueStore.stopPolling();
//   },
//   render() {
//     const {repoInfos} = this.props;
//     // Get the "Primary" repo for milestones and labels
//     const [{repoOwner, repoName}] = repoInfos;
//
//     // Alert the user once when they are viewing a repository that does not have any columns.
//     // That way they know why everything is "Uncategorized"
//     const promise = IssueStore.fetchLabels(repoOwner, repoName).then((labels) => {
//       if (!showedWarning && filterKanbanLabels(labels, getFilters().getState().columnRegExp).length === 0) {
//         showedWarning = true;
//         alert('You are viewing a repository that does not have any properly formatted labels denoting columns so everything will show up as "Uncategorized". To create columns, rename your labels so they are "# - title" where # denotes the order of the column');
//       }
//       return labels;
//     });
//     return (
//       <Board {...this.props}
//         type={KanbanRepo}
//         columnDataPromise={promise}
//       />
//     );
//   },
// });
