import React from 'react';
import _ from 'underscore';
import {GraphIcon} from 'react-octicons';

import Chart from './chart';
import Database from '../database';
import {getFilters} from '../route-utils';
import IssueStore from '../issue-store';
import Loadable from './loadable';
import moment from 'moment';

const BurnupShell = React.createClass({
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

    let chunkType = null;
    function getChunk(dateStr) {
      if (chunkType === 'day') {
        return Math.floor(Date.parse(dateStr) / 1000 / 60 / 60 / 24);
      // } else if (chunkType === 'week') {
      //   return Math.floor(Date.parse(dateStr) / 1000 / 60 / 60 / 24 / 7);
      } else if (chunkType === 'month') {
        const d = new Date(dateStr);
        return d.getFullYear() * 100 + d.getMonth();
      } else if (chunkType === 'year') {
        const d = new Date(dateStr);
        return d.getFullYear();
      } else {
        throw new Error('BUG: Invalid date range chunk type');
      }
    }
    function formatChunk(chunk) {
      if (chunkType === 'day') {
        const m = new moment(chunk * 1000 * 60 * 60 * 24);
        return m.format('MMM DD');
      // } else if (chunkType === 'week') {
      //   return Math.floor(Date.parse(dateStr) / 1000 / 60 / 60 / 24 / 7);
      } else if (chunkType === 'month') {
        const month = chunk % 100;
        if (month === 0) {
          const year = (chunk / 100) % 100; // only use the last 2 digits of the year
          return `${moment.monthsShort(month)} '${year}`; // moment months are 0-indexed
        } else {
          return moment.monthsShort(month); // moment months are 0-indexed
        }
      } else if (chunkType === 'year') {
        return chunk;
      } else {
        throw new Error('BUG: Invalid date range chunk type');
      }
    }
    function incrementChunk(chunk) {
      if (chunkType === 'day') {
        return chunk + 1;
      // } else if (chunkType === 'week') {
      //   return chunk + 7;
      } else if (chunkType === 'month') {
        const month = chunk % 100; // split off the year
        if (month >= 12) {
          return chunk - month + 100;
        } else {
          return chunk + 1;
        }
      } else if (chunkType === 'year') {
        return chunk + 1;
      } else {
        throw new Error('BUG: Invalid date range chunk type');
      }
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

    let openedCards = cards;

    // From this point, we only care about closed Issues
    let closedCards = cards.filter((card) => card.issue.closedAt);
    closedCards = _.sortBy(closedCards, (card) => getDay(card.issue.closedAt));
    let endDate;
    if (closedCards.length && openedCards.length) {
      const lastOpened = openedCards[openedCards.length - 1].issue.createdAt;
      const lastClosed = closedCards[closedCards.length - 1].issue.closedAt;
      if (Date.parse(lastOpened) < Date.parse(lastClosed)) {
        endDate = lastClosed;
      } else {
        endDate = lastOpened;
      }
    } else if (openedCards.length) {
      endDate = openedCards[openedCards.length - 1].issue.createdAt;
    } else if (closedCards.length) {
      endDate = closedCards[closedCards.length - 1].issue.closedAt;
    } else {
      throw new Error('BUG: should not have gotten here');
    }

    const startDays = getDay(startDate);
    const endDays = getDay(endDate);

    if (endDays - startDays < 90) {
      chunkType = 'day';
    // } else if (endDays - startDays < 100) {
    //   chunkType = 'week';
    } else if (endDays - startDays < 1500){
      chunkType = 'month';
    } else {
      chunkType = 'year';
    }

    const startChunk = getChunk(startDate);
    const endChunk = getChunk(endDate);

    // TODO: If the number of days is more than, say 50, then show changes per week.
    // Loop over the days and build a chart
    let closedCount = 0;
    let openedCount = 0;
    const rows = [];
    for (let currentChunk = startChunk; currentChunk <= endChunk; currentChunk = incrementChunk(currentChunk)) {
      // loop through the cards to count how many have closed on this day
      let closedToday = 0;
      let openedToday = 0;
      for (let cardIndex = 0; cardIndex < closedCards.length; cardIndex++) {
        const cardClosedDay = getChunk(closedCards[cardIndex].issue.closedAt);
        if (cardClosedDay <= currentChunk) {
          closedToday++;
        } else {
          break;
        }
      }
      for (let cardIndex = 0; cardIndex < openedCards.length; cardIndex++) {
        const cardOpenedDay = getChunk(openedCards[cardIndex].issue.createdAt);
        if (cardOpenedDay <= currentChunk) {
          openedToday++;
        } else {
          break;
        }
      }
      // remove the cards since they are now accounted for
      if (closedToday) {
        closedCards.splice(0, closedToday);
        closedCount += closedToday;
      }
      if (openedToday) {
        openedCards.splice(0, openedToday);
        openedCount += openedToday;
      }
      // Only add an entry if it changed
      rows.push([
        currentChunk,
        // closedToday ? closedCount : null,
        // openedToday ? openedCount : null,
        closedCount,
        openedCount,
        openedToday || null
      ]);
    }

    // if (closedCards.length > 0) {
    //   throw new Error('BUG: Should have counted all the cards');
    // }

    // Add the row titles and the "Ideal" line
    rows[0].push(0); // ideal start
    rows[rows.length - 1].push(openedCount); // ideal end
    rows.unshift(['chunk', 'closed', 'total', 'new', 'ideal']);

    const chartData = {
      x: 'chunk',
      rows: rows,
      colors: {
        closed: '#ff0000',
        total: '#00ff00',
        'new': '#0000ff',
        ideal: '#999999'
      },
      types: {
        closed: 'area-spline',
        total: 'area-spline',
        'new': 'bar'
      },
      // groups: [['opened', 'closed']]
    };
    function formatChunkIndex(index) {
      return formatChunk(rows[index+1][0]);// +1 because 1st row is the headers
    }
    const options = {
      axis: {
        x: {
          type: 'category',
          tick: {
            format: formatChunkIndex,
            culling: {
              max: 20
            }
          }
        }
      },
      // tooltip: { // Doesn't work with the far-right item yet
      //   position: function(dataToShow, tWidth, tHeight, element) {
      //     // return {top: 10, left: element.x.baseVal.value};
      //     const $$ = this;
      //     const mouse = $$.d3.mouse(element);
      //     const svgLeft = $$.getSvgLeft(true);
      //     const tooltipLeft = svgLeft + $$.getCurrentPaddingLeft(true) + $$.x(dataToShow[0].x) + 20;
      //     const tooltipRight = tooltipLeft + tWidth;
      //     const chartRight = svgLeft + $$.currentWidth - $$.getCurrentPaddingRight();
      //     const tooltipTop = mouse[1] + 15;
      //     return {top: 10, left: tooltipLeft};
      //   }
      // }
    };
    return (
      <Chart className='burnup-chart' data={chartData} options={options} element='burnup'/>
    );
  },
  render() {
    // TODO: send the current filter as an arg to `Database.fetchCards()` so it can smartly (using Indexes) fetch the cards
    const promise = Database.fetchCards(getFilters());

    return (
      <div className='burnup'>
        <h2><GraphIcon size='mega'/>  Burnup Chart</h2>
        <p>Make sure you selected <strong>closed</strong> and <strong>Issues</strong> and optionally a Milestone from the filter dropdown at the top of this page</p>
        <p>Also, this chart only fills the area when something changed (useful for weekends/open-source projects that frequently have periods of no change)</p>
        <Loadable
          promise={promise}
          renderLoaded={this.renderLoaded}
        />
      </div>
    );
  }
});

export default BurnupShell;
