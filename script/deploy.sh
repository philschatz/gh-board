#!/bin/bash
set -e
set -o pipefail

if [ -n "$(git status --porcelain)" ]; then
  echo "The working directory is not clean. Please commit or stash your changes first."
  exit 1
fi

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

  # reset .gitignore
  git checkout -- .gitignore
fi

echo "Successfully deployed"
exit 0
