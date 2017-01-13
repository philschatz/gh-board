#!/bin/bash

# check if the current branch is `gh-pages`
currentBranch=$(git rev-parse --abbrev-ref HEAD)
if [[ ${currentBranch} == "gh-pages" ]]
then
  git push origin gh-pages
else
  # delete gh-pages branch and start a clean one
  git branch -d gh-pages
  git checkout -b gh-pages

  # remove .gitignore
  rm .gitignore

  # build
  npm run build

  # commmit the new dist folder
  git add dist
  git commit -m ':rocket: deploy new version'

  # force push to gh-pages
  git push -f origin gh-pages

  # go back to previous branch
  git checkout ${currentBranch}
fi

echo "Successfully deployed"
exit 0
