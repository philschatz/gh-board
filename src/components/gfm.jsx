import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'underscore';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';
// import mermaid, {mermaidAPI} from 'mermaid';
// import mermaidAPI from 'mermaid/dist/mermaidAPI';

// import Client from '../github-client';
// import Loadable from './loadable';
import CurrentUserStore from '../user-store';

const insertAfter = (newNode, node) => {
  if (node.nextElementSibling) {
    node.parentElement.insertBefore(newNode, node.nextElementSibling);
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

const InnerMarkdown = React.createClass({
  displayName: 'InnerMarkdown',
  updateLinks() {
    const {disableLinks} = this.props;

    if (!disableLinks) {
      // Wrap images with a link that opens them in a new tab
      const images = ReactDOM.findDOMNode(this).querySelectorAll('img:not(.emoji)');
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

      const links = ReactDOM.findDOMNode(this).querySelectorAll('a');
      _.each(links, (link) => {
        link.setAttribute('target', '_blank');
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
    const context = repoOwner + '/' + repoName;
    const textStripped = text.replace(/<!--[\s\S]*?-->/g, '');
    const textEmojis = this.replaceEmojis(textStripped);
    const html = ultramarked(linkify(textEmojis, context));

    if (html) {
      if (inline) {
        // Remove the wrapping `<p>` since this is supposed to be inline markdown
        // (ie for a title)
        const inlineHtml = html.replace(/^<p>/, '').replace(/<\/p>\n$/, '');
        const props = {
          className: 'rendered-markdown',
          dangerouslySetInnerHTML: {__html: inlineHtml}
        };
        return (<span {...props}/>);
      } else {
        const props = {
          className: 'rendered-markdown',
          dangerouslySetInnerHTML: {__html: html}
        };
        return (<div {...props}/>);
      }
    } else {
      return (
        <div className='rendered-markdown is-empty'></div>
      );
    }

  }

});

export default InnerMarkdown;
