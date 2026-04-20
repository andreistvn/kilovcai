#!/bin/bash

echo "Pushing to GitHub..."
git add .
git commit -m "update: museum sync"
git push origin main

echo "Pushing to Neocities (excluding .git)..."
neocities push . --exclude .git --exclude .DS_Store

echo "Deployment complete."