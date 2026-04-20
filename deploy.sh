#!/bin/bash

find . -name ".DS_Store" -delete

git add .
git commit -m "sync"
git push origin main

neocities push . 