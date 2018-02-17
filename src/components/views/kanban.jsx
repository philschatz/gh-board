import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router'
import { ListUnorderedIcon } from 'react-octicons'
import isDeepEqual from 'fast-deep-equal'

import { selectors } from '../../redux/ducks/filter'
import {
  KANBAN_LABEL,
  UNCATEGORIZED_NAME,
  sortByColumnName,
} from '../../helpers'
import { fetchLabels, fetchIssues } from '../../redux/ducks/issue'
import IssueList from '../issue-list'
import Issue from '../issue'
import AnonymousModal from '../anonymous-modal'

function filterCards(cards, labels) {
  let filtered = cards
  // Curry the fn so it is not declared inside a loop
  const filterFn = label => card => {
    const containsLabel = card.issue.labels.some(cardLabel => {
      return cardLabel.name === label.name
    })
    if (containsLabel) {
      return true
    } else if (UNCATEGORIZED_NAME === label.name) {
      // If the issue does not match any list then add it to the backlog
      for (const l of card.issue.labels) {
        if (KANBAN_LABEL.test(l.name)) {
          return false
        }
      }
      // no list labels, so include it in the backlog
      return true
    }
  }
  for (const i in labels) {
    const label = labels[i]
    filtered = filtered.filter(filterFn(label))
    if (filtered.length === 0) {
      return []
    }
  }
  return filtered
}

const filterKanbanLabels = (labels, columnRegExp) => {
  return labels
    .filter(label => columnRegExp.test(label.name))
    .sort(sortByColumnName())
}

class KanbanColumn extends React.Component {
  render() {
    const {
      label,
      cards,
      primaryRepo,
      settings,
      columnRegExp,
      filters,
    } = this.props

    const issueComponents = cards.map(card => {
      return (
        <Issue
          key={card.issue.id}
          filters={filters}
          primaryRepoName={primaryRepo.repoName}
          card={card}
          columnRegExp={columnRegExp}
        />
      )
    })

    let icon
    let name
    if (columnRegExp.test(label.name)) {
      icon = <ListUnorderedIcon />
      name = label.name.replace(/^\d+ - /, ' ')
    } else {
      icon = null
      name = label.name
    }
    const title = (
      <Link
        className="label-title"
        to={filters.toggleColumnLabel(label.name).url()}
      >
        {name}
      </Link>
    )

    if (issueComponents.length || settings.isShowEmptyColumns) {
      return (
        <div key={label.name} className="kanban-board-column">
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
      )
    } else {
      return null // TODO: Maybe the panel should say "No Issues" (but only if it's the only column)
    }
  }
}

class KanbanRepo extends React.Component {
  componentWillMount() {
    this.fetchStuff(this.props)
  }

  componentWillReceiveProps(nextProps) {
    if (
      !isDeepEqual(nextProps.repoInfos, this.props.repoInfos) ||
      !isDeepEqual(nextProps.filter, this.props.filter)
    ) {
      this.fetchStuff(nextProps)
    }
  }

  fetchStuff(props) {
    const { repoInfos, dispatch } = props
    // Get the "Primary" repo for milestones and labels
    const [{ repoOwner, repoName }] = repoInfos
    dispatch(fetchLabels(repoOwner, repoName))
    dispatch(fetchIssues(repoInfos))
  }

  render() {
    const {
      labels,
      cards,
      repoInfos,
      settings,
      columnRegExp,
      filters,
    } = this.props

    // Get the primary repo
    const [primaryRepo] = repoInfos

    let allLabels
    if (!settings.isHideUncategorized) {
      const uncategorized = [{ name: UNCATEGORIZED_NAME }]
      allLabels = uncategorized.concat(labels)
    } else {
      allLabels = labels
    }

    const kanbanLabels = filterKanbanLabels(allLabels, columnRegExp)

    const isFilteringByColumn = false

    const kanbanColumns = kanbanLabels.map(label => {
      // If we are filtering by a kanban column then only show that column
      // Otherwise show all columns
      const columnCards = filterCards(cards, [label])

      // Show the column when:
      // isFilteringByColumn = label (the current column we are filtering on)
      // !isFilteringByColumn && (!getShowEmptyColumns || columnCards.length)

      if (
        (!isFilteringByColumn &&
          (settings.isShowEmptyColumns || columnCards.length)) ||
        (isFilteringByColumn && isFilteringByColumn.name === label.name)
      ) {
        return (
          <KanbanColumn
            columnRegExp={columnRegExp}
            filters={filters}
            settings={settings}
            key={label.name}
            label={label}
            cards={columnCards}
            primaryRepo={primaryRepo}
          />
        )
      } else {
        return null
      }
    })

    return (
      <div className="kanban-board">
        {kanbanColumns}
        {/* addCardList */}
        <AnonymousModal />
      </div>
    )
  }
}

// let showedWarning = false;

export default connect((state, ownProps) => {
  const repoInfos = selectors.getReposFromParams(ownProps.params)
  return {
    repoInfos,
    filter: state.filter,
    filters: new selectors.FilterBuilder(state.filter, repoInfos),
    settings: state.settings,
    columnRegExp: state.filter.columnRegExp,
    cards: state.issues.cards,
    labels: state.issues.labels,
  }
})(KanbanRepo)

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
