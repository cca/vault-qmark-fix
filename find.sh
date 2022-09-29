#!/usr/bin/env bash
# find files with question marks in their name
# runs in the background
# if I were to do this again I'd not include files in _THUMBS directories
cd /mnt/equelladata01/Institutions/cca2012/Attachments/
nohup find -name '*\?*' -type f > ~/qmark-files.txt &
