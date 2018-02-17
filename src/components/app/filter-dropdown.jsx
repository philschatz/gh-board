import _ from 'underscore'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router'
import * as BS from 'react-bootstrap'
import classnames from 'classnames'
import { XIcon, SearchIcon, CheckIcon, MilestoneIcon } from 'react-octicons'
import SavedFiltersButton from './saved-filters'

import { UNCATEGORIZED_NAME } from '../../helpers'

import GithubFlavoredMarkdown from '../gfm'

class FilterCategory extends React.Component {
  state = { filterStr: null }

  filterItems = () => {
    const { items } = this.props
    const { filterStr } = this.state
    return items.filter(({ text }) => {
      if (filterStr) {
        // ignore case when filtering
        return text.toLowerCase().indexOf(filterStr.toLowerCase()) >= 0
      }
      return true
    })
  }

  onFilterInputChange = e => {
    this.setState({ filterStr: e.currentTarget.value })
  }

  renderItem = item => {
    const { isSelected, isExcluded, text, iconNode } = item
    const { toggleHref, excludeHref } = item

    let checkmark
    if (isSelected) {
      checkmark = <CheckIcon className="item-checkmark" />
    }
    let iconLink
    if (iconNode) {
      iconLink = <Link to={toggleHref}>{iconNode}</Link>
    }
    let excludeLink
    if (excludeHref) {
      excludeLink = (
        <Link
          to={excludeHref}
          className="item-toggle-exclude"
          title="Exclude this from the board"
        >
          <XIcon />
        </Link>
      )
    }
    return (
      <BS.ListGroupItem
        key={text}
        className={classnames({
          'is-selected': isSelected,
          'is-excluded': isExcluded,
        })}
      >
        {checkmark}
        {iconLink}
        <Link to={toggleHref} className="item-text">
          <GithubFlavoredMarkdown
            disableLinks={true}
            inline={true}
            text={text}
          />
        </Link>
        {excludeLink}
      </BS.ListGroupItem>
    )
  }

  render() {
    const { noSearch } = this.props
    const items = this.filterItems()

    let searchInput
    if (!noSearch) {
      searchInput = (
        <BS.FormControl
          type="text"
          placeholder={'Search for ' + this.props.name + '...'}
          onChange={this.onFilterInputChange}
        />
      )
    }
    return (
      <form>
        {searchInput}
        <BS.ListGroup>{items.map(this.renderItem)}</BS.ListGroup>
      </form>
    )
  }
}

class FilterDropdown extends React.Component {
  state = {
    activeKey: null,
  }

  handleSelect = activeKey => {
    this.setState({ activeKey })
  }

  renderTagNames = items => {
    const { filters } = this.props
    const state = filters.getState()
    items = items.map(item => {
      const name = item.name

      const isSelected = state.tagNames.indexOf(name) >= 0
      const isExcluded = state.tagNames.indexOf(`-${name}`) >= 0
      const iconNode = (
        <span
          className="item-icon tag-name-color"
          style={{ backgroundColor: `#${item.color}` }}
        />
      )
      let toggleHref
      let excludeHref
      if (isExcluded) {
        toggleHref = filters
          .toggleTagName(`-${name}`)
          .toggleTagName(name)
          .url()
        excludeHref = filters.toggleTagName(`-${name}`).url()
      } else if (isSelected) {
        toggleHref = filters.toggleTagName(name).url()
        excludeHref = filters
          .toggleTagName(name)
          .toggleTagName(`-${name}`)
          .url()
      } else {
        toggleHref = filters.toggleTagName(name).url()
        excludeHref = filters.toggleTagName(`-${name}`).url()
      }
      return {
        text: name,
        isSelected,
        isExcluded,
        iconNode,
        toggleHref,
        excludeHref,
      }
    })

    // Remove the columns from the set of tagNames
    items = _.filter(items, ({ text }) => {
      return !state.columnRegExp.test(text)
    })
    items = _.sortBy(items, 'text')

    return <FilterCategory items={items} name="labels" />
  }

  renderColumnNames = items => {
    const { filters } = this.props
    const state = filters.getState()

    // Add the "UNCATEGORIZED_NAME" label into the mix
    items = items.concat({ name: UNCATEGORIZED_NAME })

    items = items.map(item => {
      const name = item.name

      const isSelected = (state.columnLabels || []).indexOf(name) >= 0
      const isExcluded = (state.columnLabels || []).indexOf(`-${name}`) >= 0
      const iconNode = (
        <i
          className="item-icon column-name-color"
          style={{ backgroundColor: `#${item.color}` }}
        />
      )
      let toggleHref
      let excludeHref
      if (isExcluded) {
        toggleHref = filters
          .toggleColumnLabel(`-${name}`)
          .toggleColumnLabel(name)
          .url()
        excludeHref = filters.toggleColumnLabel(`-${name}`).url()
      } else if (isSelected) {
        toggleHref = filters.toggleColumnLabel(name).url()
        excludeHref = filters
          .toggleColumnLabel(name)
          .toggleColumnLabel(`-${name}`)
          .url()
      } else {
        toggleHref = filters.toggleColumnLabel(name).url()
        excludeHref = filters.toggleColumnLabel(`-${name}`).url()
      }
      return {
        text: name,
        isSelected,
        isExcluded,
        iconNode,
        toggleHref,
        excludeHref,
      }
    })

    // Remove the non-columns
    items = _.filter(items, ({ text }) => {
      return state.columnRegExp.test(text)
    })
    // sort **BEFORE** stripping off the column index
    items = _.sortBy(items, 'text')
    items = items.map(
      ({ text, isSelected, isExcluded, iconNode, toggleHref, excludeHref }) => {
        text = text.replace(state.columnRegExp, '')
        return {
          text,
          isSelected,
          isExcluded,
          iconNode,
          toggleHref,
          excludeHref,
        }
      }
    )

    return <FilterCategory items={items} name="columns" />
  }

  // copy/pasta from renderTagNames
  renderMilestones = items => {
    const { filters } = this.props
    const state = filters.getState()
    items = items.map(item => {
      const name = item.title

      const isSelected = state.milestoneTitles.indexOf(name) >= 0
      const isExcluded = state.milestoneTitles.indexOf(`-${name}`) >= 0
      // const iconNode = (
      //   <MilestoneIcon/>
      // );
      let toggleHref
      let excludeHref
      if (isExcluded) {
        toggleHref = filters
          .toggleMilestoneTitle(`-${name}`)
          .toggleMilestoneTitle(name)
          .url()
        excludeHref = filters.toggleMilestoneTitle(`-${name}`).url()
      } else if (isSelected) {
        toggleHref = filters.toggleMilestoneTitle(name).url()
        excludeHref = filters
          .toggleMilestoneTitle(name)
          .toggleMilestoneTitle(`-${name}`)
          .url()
      } else {
        toggleHref = filters.toggleMilestoneTitle(name).url()
        excludeHref = filters.toggleMilestoneTitle(`-${name}`).url()
      }
      return {
        text: name,
        isSelected,
        isExcluded,
        /*iconNode,*/ toggleHref,
        excludeHref,
      }
    })

    // // Remove the columns from the set of milestoneTitles
    // items = _.filter(items, ({text}) => {
    //   return !state.columnRegExp.test(text);
    // });
    items = _.sortBy(items, 'text')

    return <FilterCategory items={items} name="milestones" />
  }

  renderStates = () => {
    const { filters } = this.props
    const { states } = filters.getState()

    const items = ['open', 'closed'].map(state => {
      return {
        text: state,
        isSelected: states.indexOf(state) >= 0,
        toggleHref: filters.toggleState(state).url(),
      }
    })

    return <FilterCategory noSearch items={items} name="states" />
  }

  renderTypes = () => {
    const { filters } = this.props
    const { types } = filters.getState()

    const items = ['issue', 'pull-request'].map(type => {
      return {
        text: type,
        isSelected: types.indexOf(type) >= 0,
        toggleHref: filters.toggleType(type).url(),
      }
    })

    return <FilterCategory noSearch items={items} name="types" />
  }

  render() {
    const { milestones, labels } = this.props

    const renderMilestone = milestone => {
      let dueDate
      if (milestone.dueOn) {
        dueDate = (
          <span key="due-at" className="due-at">
            {' due '}
            <Time dateTime={new Date(milestone.dueOn)} />
          </span>
        )
      }
      return [
        <MilestoneIcon key="icon" className="milestone-icon" />,
        <span key="milestone-title" className="milestone-title">
          <GithubFlavoredMarkdown
            inline
            disableLinks={true}
            text={milestone.title}
          />
        </span>,
        dueDate,
      ]
    }

    const panel = (
      <BS.PanelGroup accordion id="filters-accordeon">
        <BS.Panel className="filter-category" eventKey="1">
          <BS.Panel.Heading>
            <BS.Panel.Title toggle>Labels</BS.Panel.Title>
          </BS.Panel.Heading>
          <BS.Panel.Body collapsible>
            {this.renderTagNames(labels)}
          </BS.Panel.Body>
        </BS.Panel>
        <BS.Panel className="filter-category" eventKey="2">
          <BS.Panel.Heading>
            <BS.Panel.Title toggle>Milestones</BS.Panel.Title>
          </BS.Panel.Heading>
          <BS.Panel.Body collapsible>
            {this.renderMilestones(milestones)}
          </BS.Panel.Body>
        </BS.Panel>
        <BS.Panel className="filter-category" eventKey="3">
          <BS.Panel.Heading>
            <BS.Panel.Title toggle>Columns</BS.Panel.Title>
          </BS.Panel.Heading>
          <BS.Panel.Body collapsible>
            {this.renderColumnNames(labels)}
          </BS.Panel.Body>
        </BS.Panel>
        <BS.Panel className="filter-category" eventKey="4">
          <BS.Panel.Heading>
            <BS.Panel.Title toggle>States</BS.Panel.Title>
          </BS.Panel.Heading>
          <BS.Panel.Body collapsible>{this.renderStates()}</BS.Panel.Body>
        </BS.Panel>
        <BS.Panel className="filter-category" eventKey="5">
          <BS.Panel.Heading>
            <BS.Panel.Title toggle>Types</BS.Panel.Title>
          </BS.Panel.Heading>
          <BS.Panel.Body collapsible>{this.renderTypes()}</BS.Panel.Body>
        </BS.Panel>
      </BS.PanelGroup>
    )

    const { milestoneTitles } = this.props.filters.getState()
    let selectedMilestoneItem
    if (milestoneTitles.length) {
      if (milestoneTitles.length > 1) {
        selectedMilestoneItem = `${milestoneTitles.length} milestones`
      } else {
        // Only 1 milestone is selected so show the milestone title
        selectedMilestoneItem = renderMilestone({ title: milestoneTitles[0] })
      }
    } else {
      const { states, types } = this.props.filters.getState()
      let state = ''
      if (states.length === 1) {
        if (states[0] === 'open') {
          state = 'Open'
        } else if (states[0] === 'closed') {
          state = 'Closed'
        } else {
          throw new Error('BUG: invalid state')
        }
      }
      if (types.length === 2) {
        selectedMilestoneItem = `All ${state} Issues and Pull Requests`
      } else if (types.length === 1) {
        if (types[0] === 'issue') {
          selectedMilestoneItem = `All ${state} Issues`
        } else if (types[0] === 'pull-request') {
          selectedMilestoneItem = `All ${state} Pull Requests`
        } else {
          throw new Error('BUG: invalid type')
        }
      } else {
        throw new Error('BUG: invalid type')
      }
    }

    return (
      <BS.NavDropdown
        id="filter-dropdown"
        className="filter-menu"
        title={
          <span className="-filter-title">
            {selectedMilestoneItem} <SearchIcon />
          </span>
        }
      >
        <div className="header">
          <span>Filters</span>
          <SavedFiltersButton />
        </div>
        {panel}
      </BS.NavDropdown>
    )
  }
}

// const FilterDropdownShell = React.createClass({
//   render() {
//     const {repoInfos} = this.props;
//
//     if (repoInfos.length) {
//       const [{repoOwner, repoName}] = repoInfos;
//
//       // TODO: Poll all of these so we get updates
//       // TODO: Include *all* labels, not just the ones in the primary repo
//       const milestones = IssueStore.fetchMilestones(repoOwner, repoName);
//       const labels = IssueStore.fetchLabels(repoOwner, repoName);
//       const promise = Promise.all([milestones, labels]);
//       return (
//         <Loadable promise={promise} renderLoaded={([milestones, labels]) => <FilterDropdown milestones={milestones} labels={labels}/>} />
//       );
//     } else {
//       return null;
//     }
//
//   }
// });

export default connect(state => {
  return {
    labels: state.issues.labels,
    milestones: state.issues.milestones,
  }
})(FilterDropdown)
