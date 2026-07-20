git checkout alfa

git branch | grep -E -v "(\*|alfa|beta|release)" | xargs git branch -D

git fetch origin --prune

git reset --hard origin/alfa

git checkout beta && git reset --hard origin/beta
git checkout release && git reset --hard origin/release

git checkout alfa
