import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';
// import mermaid, {mermaidAPI} from 'mermaid';
// import mermaidAPI from 'mermaid/dist/mermaidAPI';

// import Client from '../github-client';
// import Loadable from './loadable';
import IssueStore from '../issue-store';
import CurrentUserStore from '../user-store';
import {forEachRelatedIssue} from '../gfm-dom';
import {getFilters} from '../route-utils';
import {isLight} from '../helpers';

const insertAfter = (newNode, node) => {
  if (node.nextSibling) {
    node.parentElement.insertBefore(newNode, node.nextSibling);
  } else {
    node.parentElement.appendChild(newNode);
  }
};

const EMOJI_RE = /(:\+?\-?[\+a-z0-9_\-]+:)/g;

// HACK: Octokat converts underscores to camelCase so for now we do too
const camelize = (string) => {
  if (string) {
    return string.replace(/[_-]+(\w)/g, function(m) {
      return m[1].toUpperCase();
    });
  } else {
    return '';
  }
};


// Construct the little [Open], [Closed], [Merged] badge next to a PR/Issue number
// Done in the DOM instead of React because it is injected into arbitrary HTML.
const buildStatusBadge = (card) => {
  const wrapNode = document.createElement('span');
  wrapNode.classList.add('issue-status-badges');
  const newNode = document.createElement('span');
  newNode.classList.add('issue-status-badge');
  if (card.issue) {
    const isPullRequest = card.isPullRequest();
    const state = card.issue.state; // open, closed, reopened

    const {columnRegExp} = getFilters().getState();
    const kanbanLabel = card.issue.labels.filter((label) => {
      return columnRegExp.test(label.name);
    })[0];

    if (kanbanLabel) {
      const octicon = document.createElement('i');
      octicon.classList.add('octicon');
      octicon.classList.add('octicon-list-unordered');
      const columnIcon = document.createElement('span');
      columnIcon.classList.add('colored-icon');
      if (isLight(kanbanLabel.color)) {
        columnIcon.classList.add('is-light');
      }
      columnIcon.appendChild(octicon);
      // TODO: add is-light class
      columnIcon.style.backgroundColor = `#${kanbanLabel.color}`;
      columnIcon.setAttribute('title', kanbanLabel.name.replace(columnRegExp, ''));
      columnIcon.appendChild(octicon);
      wrapNode.appendChild(columnIcon);
    }

    const iconNode = document.createElement('i');
    iconNode.classList.add('octicon');
    let iconClassName;
    let msg;
    if (isPullRequest) {
      iconClassName = 'octicon-git-pull-request';
      if (state === 'open') {
        msg = 'Open';
      } else {
        msg = 'Closed';
      }
    } else {
      if (state === 'open') {
        iconClassName = 'octicon-issue-opened';
        msg = 'Open';
      } else if (state === 'closed') {
        iconClassName = 'octicon-issue-closed';
        msg = 'Closed';
      } else if (state === 'reopened') {
        iconClassName = 'octicon-issue-reopened';
        msg = 'Reopened';
      } else {
        throw new Error('BUG! Invalid Issue state');
      }
    }
    const textNode = document.createTextNode(` ${msg}`);
    iconNode.classList.add(iconClassName);

    newNode.setAttribute('data-state', state);
    newNode.appendChild(iconNode);
    newNode.appendChild(textNode);
  } else {
    newNode.textContent = 'Closed?';
  }
  wrapNode.appendChild(newNode);
  return wrapNode;
};

const InnerMarkdown = React.createClass({
  displayName: 'InnerMarkdown',
  updateLinks() {
    const {disableLinks} = this.props;

    if (!disableLinks) {
      const root = ReactDOM.findDOMNode(this);
      // Wrap images with a link that opens them in a new tab
      const images = root.querySelectorAll('img:not(.emoji)');
      _.each(images, (img) => {
        const parent = img.parentNode;
        // Do not re-wrap if the image already has a link around it
        if (parent.tagName.toLowerCase() === 'a') {
          return;
        }
        const href = img.getAttribute('src');
        const link = document.createElement('a');
        parent.replaceChild(link, img);
        link.appendChild(img);
        link.setAttribute('href', href);
      });

      const links = root.querySelectorAll('a');
      _.each(links, (link) => {
        link.setAttribute('target', '_blank');
      });

      // Find links to Issues/PR's and add the title, open/closed state, and kanban column
      // First, remove all badges from the DOM
      _.each(root.querySelectorAll('.issue-status-badges'), (node) => node.remove());

      forEachRelatedIssue(root, ({repoOwner, repoName, number}, link) => {
        const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);
        const newNode = buildStatusBadge(card);
        insertAfter(newNode, link);
      });
    }
  },
  updateCheckboxes() {
    const div = ReactDOM.findDOMNode(this);
    function buildCheckbox(checked) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.disabled = true;
      checkbox.checked = checked;
      checkbox.classList.add('task-list-item-checkbox');
      return checkbox;
    }

    _.each(div.querySelectorAll('li'), (listItem) => {
      if (/^\[x\]\ /.test(listItem.textContent)) {
        const textChild = listItem.firstChild;
        const checkbox = buildCheckbox(true);

        listItem.classList.add('task-list-item');
        listItem.parentNode.classList.add('task-list');
        if (textChild.nodeType === Node.TEXT_NODE) {
          // remove the `[x] ` and replace it with a disabled input box
          textChild.textContent = textChild.textContent.substring(3);
          listItem.insertBefore(checkbox, textChild);
        }
      } else if (/^\[\ \]\ /.test(listItem.textContent)) {
        const textChild = listItem.firstChild;
        const checkbox = buildCheckbox(false);

        listItem.classList.add('task-list-item');
        listItem.parentNode.classList.add('task-list');
        if (textChild.nodeType === Node.TEXT_NODE) {
          // remove the `[x] ` and replace it with a disabled input box
          textChild.textContent = textChild.textContent.substring(3);
          listItem.insertBefore(checkbox, textChild);
        }
      }
    });
  },
  updateMermaid() {
    this._mermaidCount = this._mermaidCount || 0;
    const root = ReactDOM.findDOMNode(this);
    _.each(root.querySelectorAll('pre > code.lang-mermaid'), (code) => {

      // Only import the mermaid chunk if actually used
      /*eslint-disable no-undef */
      require.ensure([], (require) => {
        const mermaidAPI = require('mermaid/dist/mermaidAPI');
        /*eslint-enable no-undef */

        this._mermaidCount += 1;
        const text = code.textContent;
        const div = document.createElement('div');
        insertAfter(div, code.parentElement);
        // Create a new element just beloe the code with the diagram
        mermaidAPI.render(`mermaid-diagram-${this._mermaidCount}`, text, (html) => {
          // hide the code when successful
          code.parentElement.remove();
          div.innerHTML = html;
        }, div);
      });
    });
  },
  updateDOM() {
    if (!ReactDOM.findDOMNode(this)) { return; }
    this.updateLinks();
    this.updateCheckboxes();
    this.updateMermaid();
  },
  componentDidMount() {
    this.updateDOM();
  },
  componentDidUpdate() {
    this.updateDOM();
  },
  replaceEmojis(text) {
    const emojisMap = CurrentUserStore.getEmojis() || {};
    return text.replace(EMOJI_RE, (m, p1) => {
      const emojiName = p1.substring(1, p1.length-1); // Strip off the leading and trailing `:`
      const emojiUrl = emojisMap[camelize(emojiName)];
      if (emojiUrl) {
        return `<img class="emoji" src="${emojiUrl}" title="${p1}"/>`;
      } else {
        return p1;
      }
    });
  },
  render() {
    const {text, repoOwner, repoName, inline} = this.props;
    if (!text) { return null; }
    const hasHtmlTags = /</.test(text);
    const context = repoOwner + '/' + repoName;
    const textStripped = text.replace(/<!--[\s\S]*?-->/g, '');
    const textEmojis = this.replaceEmojis(textStripped);
    const html = ultramarked(linkify(textEmojis, context));
    if (hasHtmlTags && inline) {
      // Issue titles and labels sometimes unintentionally have HTML tags in them.
      // but non-inline stuff (like Issue body) should not try to be smart.
      return (<span className='markdown-body is-text'>{text}</span>);
    } else {
      if (html) {
        if (inline) {
          // Remove the wrapping `<p>` since this is supposed to be inline markdown
          // (ie for a title)
          const inlineHtml = html.replace(/^<p>/, '').replace(/<\/p>\n$/, '');
          const props = {
            className: 'markdown-body',
            dangerouslySetInnerHTML: {__html: inlineHtml}
          };
          return (<span {...props}/>);
        } else {
          const props = {
            className: 'markdown-body',
            dangerouslySetInnerHTML: {__html: html}
          };
          return (<div {...props}/>);
        }
      } else {
        return (
          <div className='markdown-body is-empty'></div>
        );
      }
    }
  }

});

export default InnerMarkdown;
