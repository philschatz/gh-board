import _ from 'underscore';
import moment from 'moment';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';

const DIV = document.createElement('div');

function getElement(text, repoOwner, repoName) {
  DIV.innerHTML = '';
  if (!text) { return DIV; }
  let html = null;
  if (repoOwner) {
    const context = repoOwner + '/' + repoName;
    html = ultramarked(linkify(text, context));
  } else {
    html = ultramarked(linkify(text));
  }
  DIV.innerHTML = html;
  return DIV;
}

// Calculates the task list count by rendering the Markdown in the DOM and
// then counting the number of `<li>[x] ...</li>` elements
export function getTaskCounts(text) {
  const div = getElement(text);
  let taskFinishedCount = 0;
  let taskUnfinishedCount = 0;
  _.each(div.querySelectorAll('li'), (listItem) => {
    if (/^\[x\]\ /.test(listItem.textContent)) {
      taskFinishedCount++;
    } else if (/^\[\ \]\ /.test(listItem.textContent)) {
      taskUnfinishedCount++;
    }
  });
  const taskTotalCount = taskFinishedCount + taskUnfinishedCount;
  return {taskFinishedCount, taskTotalCount};
}

export function getIssueDueAt(text) {
  // TODO: Maybe parse using the local timezone
  const div = getElement(text);
  const el = div.querySelector('date.due');
  if (el) {
    // either use the datetime attribute, or the text
    const str = el.getAttribute('datetime') || el.textContent;
    if (str) {
      let date = moment(str, 'MM/DD');
      if (date.isValid()) {
        return date.toDate().getTime();
      } else {
        // fall back to parsing using the Date object
        return Date.parse(attr);
      }
    } else {
      console.error(`Invalid due date format for "${el.outerHTML}"`);
    }
  }
  return null;
}

// From https://help.github.com/articles/closing-issues-via-commit-messages/
export const PULL_REQUEST_ISSUE_RELATION = {
  'close': 'closed by',
  'closes': 'closed by',
  'closed': 'closed by',
  'fix': 'fixed by',
  'fixes': 'fixed by',
  'fixed': 'fixed by',
  'resolve': 'resolved by',
  'resolves': 'resolved by',
  'resolved': 'resolved by'
};

const CLOSE_STRINGS = Object.keys(PULL_REQUEST_ISSUE_RELATION);
const POSSIBLE_RELATED_ISSUE_SELECTOR = 'a[href^="https://github.com/"]';
const RELATED_ISSUE_RE = /^https\:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(pull|issues)\/(\d+)$/;

export function forEachRelatedIssue(div, fn) {
  _.each(div.querySelectorAll(POSSIBLE_RELATED_ISSUE_SELECTOR), (link) => {
    const href = link.getAttribute('href');
    // match `https://github.com/[repoOwner]/[repoName]/issues/[number]`
    const matches = href.match(RELATED_ISSUE_RE);
    if (matches) {
      const [, repoOwner, repoName, , number] = matches;
      fn({repoOwner, repoName, number}, link);
    }
  });
}

// Find all links in the Issue body to other issues or Pull Requests
export function getRelatedIssues(text, repoOwner1, repoName1) {
  const div = getElement(text, repoOwner1, repoName1);
  const relatedIssues = [];
  forEachRelatedIssue(div, ({repoOwner, repoName, number}, link) => {
    // Check if the previous node ends with "fixes" or "closes"
    let fixes = false;
    let prevWord = null;
    const prevNode = link.previousSibling;
    if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
      // pull out the last word
      const prevTexts = prevNode.textContent.trimRight().split(' ');
      prevWord = prevTexts[prevTexts.length - 1].toLowerCase();
      if (CLOSE_STRINGS.indexOf(prevWord) >= 0) {
        fixes = prevWord;
      }
    }
    relatedIssues.push({repoOwner, repoName, number, fixes, prevWord});
  });
  return relatedIssues;
}
