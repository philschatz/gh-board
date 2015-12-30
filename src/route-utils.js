import {getReposFromStr, convertRepoInfosToStr, KANBAN_LABEL} from './helpers';


// Generate a URL based on various filters and whatnot
// `/r/:repoStr(/m/:milestonesStr)(/t/:tagsStr)(/u/:user)(/x/:columnRegExp)/:name(/:startShas)(/:endShas)
export function buildRoute(name, {repoInfos, milestoneTitles, tagNames, userName, columnRegExp}={}, ...otherFields) {
  repoInfos = repoInfos || [];
  milestoneTitles = milestoneTitles || [];
  tagNames = tagNames || [];

  const repoStr = convertRepoInfosToStr(repoInfos);
  const milestonesStr = milestoneTitles.join('|');
  const tagsStr = tagNames.join('|');
  const parts = [];
  if (repoStr) { parts.push(`/r/${repoStr}`); }
  if (milestonesStr) { parts.push(`/m/${milestonesStr}`); }
  if (tagsStr) { parts.push(`/t/${tagsStr}`); }
  if (userName) { parts.push(`/u/${userName}`); }
  if (columnRegExp) { parts.push(`/x/${columnRegExp}`); }

  if (name) { parts.push(`/${name}`); }
  otherFields.forEach((field) => {
    parts.push(`/${field}`);
  })
  return encodeURI(parts.join(''));
}

export function parseRoute({repoStr, milestonesStr, tagsStr, userName, columnRegExpStr}={}) {
  let repoInfos = [];
  let milestoneTitles = [];
  let tagNames = [];
  let columnRegExp;
  if (repoStr) { repoInfos = getReposFromStr(repoStr); }
  if (milestonesStr) { milestoneTitles = milestonesStr.split('|'); }
  if (tagsStr) { tagNames = tagsStr.split('|'); }
  if (columnRegExpStr) { columnRegExp = new RegExp(columnRegExpStr); }
  else { columnRegExp = KANBAN_LABEL; }

  return {repoInfos, milestoneTitles, tagNames, userName, columnRegExp};
}
