#!/bin/bash

echo "Pushing to GitHub..."
git add .
git commit -m "add oldweb buttons"
git push origin main

echo "Pushing to Neocities"
neocities push .

echo "Deployment complete."