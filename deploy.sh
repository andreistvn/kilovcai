#!/bin/bash

find . -name ".DS_Store" -delete

git add .

echo "--- Describe this manifestation (Commit Message) ---"
read -p "> " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="automated sync"
fi

git commit -m "$commit_msg"
git push origin main

neocities push . 