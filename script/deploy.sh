#!/bin/bash

# check if the current branch is `gh-pages`
currentBranch=$(git rev-parse --abbrev-ref HEAD)
if [[ ${currentBranch} -eq gh-pages ]]
then
  git push origin gh-pages
else
  # delete gh-pages branch and start a clean one
  git branch -d gh-pages
  git checkout -b gh-pages

  # build
  npm run build

  # force push to gh-pages
  git push -f origin gh-pages

  # go back to previous branch
  git checkout ${currentBranch}
fi

echo "Successfully deployed"
exit 0
