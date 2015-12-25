import React from 'react';
import _ from 'underscore';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';

// import Client from '../github-client';
// import Loadable from './loadable';
import CurrentUserStore from '../user-store';

const InnerMarkdown = React.createClass({
  displayName: 'InnerMarkdown',
  updateLinks() {
    const {disableLinks} = this.props;

    if (!disableLinks) {
      // Wrap images with a link that opens them in a new tab
      const images = this.getDOMNode().querySelectorAll('img:not(.emoji)');
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

      const links = this.getDOMNode().querySelectorAll('a');
      _.each(links, (link) => {
        link.setAttribute('target', '_blank');
      });
    }
  },
  updateCheckboxes() {
    const div = this.getDOMNode();
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
  updateDOM() {
    if (!this.getDOMNode()) { return; }
    this.updateLinks();
    this.updateCheckboxes();
  },
  componentDidMount() {
    this.updateDOM();
  },
  componentDidUpdate() {
    this.updateDOM();
  },
  replaceEmojis(text) {
    const emojisMap = CurrentUserStore.getEmojis() || {};
    for (const emojiName in emojisMap) {
      const emojiUrl = emojisMap[emojiName];
      text = text.replace(':' + emojiName + ':', '<img class="emoji" src="' + emojiUrl + '" title=":' + emojiName + ':"/>');
    }
    return text;
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
