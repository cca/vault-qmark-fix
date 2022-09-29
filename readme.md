# VAULT Question Mark Fix

Problem: VAULT was mangling the filenames of uploaded files, replacing some unicode characters with question marks. This typically happened with accented letters, smart quotes, and Chinese characters.

With Edalex's help, we tracked the problem down to the `-Dfile.encoding=UTF8` setting in the `JAVA_OPTS` being passed to the app's JVM; removing that from the variable in {equella root}/manager/equellaserver-config.sh fixed the issue. That change prevents the problem in future uploads, but unfortunately we still have over a thousand files where this mangling might have happened.

Solution:

1. find files with question marks in them in the data directory
1. identify the actual names of these files (note: some question marks will be literals and the file does not need to be renamed)
1. generate a shell script to rename the affected files
1. run the script on the server & spot check several affected items
1. (optional) under [Manual Data Fixes](https://vault.cca.edu/access/manualdatafixes.do) run the **Generate thumbnails and previews** task to generate thumbnails for all the affected items

## Setup

Copy a VAULT OAuth token with the necessary permissions to a file named ".token" in the root of this project.

Run the "find.sh" script on the server and download its output text file.

Run `pnpm install` (or `npm install` if that's your jam) to get node dependencies.

## Execution

Once we have the list of filenames with question marks in them, we can look up their item's attachment data with VAULT's REST API and attempt to figure out what the filename is supposed to be. The index.js script atempts this procedure with a few caveats:

- some filenames have literal question marks in them & don't need to be changed
- sometimes multiple attachments on the same item have question marks in the same positions of their name such that it's impossible to tell them apart from filenames alone, e.g., both "布1.jpg" and "无1.jpg" are mangled to "?1.jpg"
- there are extraneous files in some item directories which are not listed in their attachments (example: the .psd files of [this item](https://vault.cca.edu/items/a056ebf2-9d3e-483a-9fce-6fd840647e0e/2/))
- it seems to be possible to have multiple attachments with the same name, at least in the metadata ([example](https://vault.cca.edu/items/8dce28dd-667b-4c4f-af93-625c6b5e4d16/1/))
- unpacked zip archives may have mangled filenames but only the .zip itself is present in metadata
- there are vagaries with unicode and regular expressions that I probably do not understand

In the end, we should generate both a list of `mv` commands to rename affected attachments and a list of complications that'll require manual intervention. The whole process is merely `node index qmark-files.txt > rename.sh 2> errors.txt` where qmark-files.txt is the text output mentioned under Setup, rename.sh is the renaming script to run on the serer, and errors.txt is the list of complications. You may want to sort the rename.sh script so it operates on each item in sequence; since a lot of processing happens in parallel, the output of index.js is not gauranteed to be in any particular order.

## LICENSE

[ECL Version 2.0](https://opensource.org/licenses/ECL-2.0)
