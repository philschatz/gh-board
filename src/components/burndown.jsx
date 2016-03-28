import React from 'react';
import _ from 'underscore';

import {LineChart} from 'react-d3';
import Database from '../database';
import {filterCardsByFilter} from '../route-utils';
import IssueStore from '../issue-store';
import Loadable from './loadable';


const BurndownShell = React.createClass({
  componentWillMount() {
    // Needs to be called before `render()`
    IssueStore.startPolling();
  },
  componentWillUnmount() {
    IssueStore.stopPolling();
  },
  renderLoaded(cards) {
    function getDay(dateStr) {
      return Math.floor(Date.parse(dateStr) / 1000 / 60 / 60 / 24);
    }

    // Get the total number of Issues
    const total = cards.length;

    if (!cards.length) {
      return (
        <span>Not showing a chart because there are 0 cards to show</span>
      );
    }

    cards = _.sortBy(cards, (card) => getDay(card.issue.createdAt));
    // Get the oldest Issue and the newest Issue Date
    const startDate = cards[0].issue.createdAt;
    // From this point, we only care about closed Issues
    cards = cards.filter((card) => card.issue.closedAt);
    cards = _.sortBy(cards, (card) => getDay(card.issue.closedAt));
    const endDate = cards[cards.length - 1].issue.closedAt;

    if (!cards.length) {
      return (
        <span>Not showing a chart because there are 0 closed cards to show</span>
      );
    }

    const startDays = getDay(startDate);
    const endDays = getDay(endDate);
    // TODO: If the number of days is more than, say 50, then show changes per week.
    // Loop over the days and build a chart
    let openCount = total;
    const values = [];
    values.push({x: 0, y: openCount});
    for (let currentDay = startDays; currentDay <= endDays; currentDay++) {
      // loop through the cards to count how many have closed on this day
      let closedToday = 0;
      for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
        const cardDay = getDay(cards[cardIndex].issue.closedAt);
        if (cardDay === currentDay) {
          closedToday++;
        } else if (cardDay < currentDay) {
          throw new Error('BUG: Looks like the cards are not sorted properly');
        } else {
          break;
        }
      }
      // remove the cards since they are now accounted for
      if (closedToday) {
        cards.splice(0, closedToday);
        openCount -= closedToday;
        values.push({x: currentDay - startDays, y: openCount});
      }
    }

    if (cards.length > 0) {
      throw new Error('BUG: Should have counted all the cards');
    }

    const lineData = [
      {
        name: 'Remaining Issues',
        values: values
      },
      {
        name: 'Ideal Burndown',
        values: [{x: 0, y: total}, {x: endDays - startDays, y: 0}]
      }
    ];
    return (
      <div>
        <p>Open Issues remaining: {openCount}</p>
        <LineChart
          legend={true}
          data={lineData}
          width={600}
          height={400}
          viewBoxObject={{
            x: 0,
            y: 0,
            width: 500,
            height: 400
          }}
          title="Burndown Chart"
          yAxisLabel="Remaining Issues"
          xAxisLabel="Days"
          gridHorizontal={true}
        />
      </div>
    );
  },
  render() {
    // TODO: send the current filter as an arg to `Database.fetchCards()` so it can smartly (using Indexes) fetch the cards
    const promise = Database.fetchCards().then((cards) => {
      return filterCardsByFilter(cards);
    });

    return (
      <div className='burndown'>
        <h2>Burndown Chart</h2>
        <p>Make sure you selected <strong>closed</strong> and <strong>Issues</strong> and optionally a Milestone from the filter dropdown at the top of this page</p>
        <Loadable
          promise={promise}
          renderLoaded={this.renderLoaded}
        />
      </div>
    );
  }
});

export default BurndownShell;
