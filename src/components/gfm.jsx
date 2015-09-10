import React from 'react';
import _ from 'underscore';
import ultramarked from 'ultramarked';
import linkify from 'gfm-linkify';

// import Client from '../github-client';
// import Loadable from './loadable.jsx';
import {CurrentUserStore} from '../user-store';

const InnerMarkdown = React.createClass({
  displayName: 'InnerMarkdown',
  updateLinks() {
    const {disableLinks} = this.props;

    if (!disableLinks) {
      const links = this.getDOMNode().querySelectorAll('a');
      _.each(links, (link) => {
        link.setAttribute('target', '_blank');
      });
      // Wrap images with a link that opens them in a new tab
      const images = this.getDOMNode().querySelectorAll('img:not(.emoji)');
      _.each(images, (img) => {
        const parent = img.parentNode;
        const href = img.getAttribute('src');
        const link = document.createElement('a');
        parent.replaceChild(link, img);
        link.appendChild(img);
        link.setAttribute('href', href);
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
      return checkbox;
    }

    _.each(div.querySelectorAll('li'), (listItem) => {
      if (/^\[x\]\ /.test(listItem.textContent)) {
        const textChild = listItem.firstChild;
        const checkbox = buildCheckbox(true);

        if (textChild.nodeType === Node.TEXT_NODE) {
          // remove the `[x] ` and replace it with a disabled input box
          textChild.textContent = textChild.textContent.substring(3);
          listItem.insertBefore(checkbox, textChild);
        }
      } else if (/^\[\ \]\ /.test(listItem.textContent)) {
        const textChild = listItem.firstChild;
        const checkbox = buildCheckbox(false);

        if (textChild.nodeType === Node.TEXT_NODE) {
          // remove the `[x] ` and replace it with a disabled input box
          textChild.textContent = textChild.textContent.substring(3);
          listItem.insertBefore(checkbox, textChild);
        }
      }
    });
  },
  updateDOM() {
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
    const {text, repoOwner, repoName} = this.props;
    if (!text) { return null; }
    const context = repoOwner + '/' + repoName;
    const textStripped = text.replace(/<!--[\s\S]*?-->/g, '');
    const textEmojis = this.replaceEmojis(textStripped);
    const html = ultramarked(linkify(textEmojis, context));

    if (html) {
      return (
        <div className='rendered-markdown' dangerouslySetInnerHTML={{__html: html}} />
      );
    } else {
      return (
        <div className='rendered-markdown is-empty'></div>
      );
    }

  }

});

export default InnerMarkdown;
