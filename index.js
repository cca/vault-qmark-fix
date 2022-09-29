import * as fs from 'fs'
import * as readline from 'readline'

import fetch from 'node-fetch'

/**
 * this script takes a list of paths to attachments with question marks in
 * their name and prints out a list of shell commands for renaming the files to
 * the correct name
 */

const token = fs.readFileSync('.token', { encoding: 'utf-8' }).trim()
const file = process.argv[2] || 'qmark-files.txt'
const filestream = fs.createReadStream(file)
const rl = readline.createInterface(filestream)

// lines are structured like
// {HASH}/{ITEM UUID}/{ITEM VERSION}/{FILENAME}
// we want to parse this out into a hash of item objects like
//      uuid|v: [ ...lines in the item's dir ]
// where the key is the item UUID & version together since neither alone
// uniquely identifies an item
let items = {}
rl.on('line', line => {
    let id = line.split('/').slice(2, 4).join('|')
    if (items[id]) {
        items[id].push(line)
    } else {
        items[id] = [line]
    }
})

function escapeRegExp(string) {
    // escape every regex special character _except_ question marks
    return string.replace(/[.*+^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

// check if a line matches a filename in the item data
// if it does, print out the shell `mv` command to rename the file
// it it doesn't, print a diagnostic message to stderr
function checkLine(line, item) {
    // attachment name is the end of the line, possibly includes slashes itself
    let line_parts = line.split('/')
    let path = line_parts.slice(0, 4).join('/')
    let filename = line_parts.slice(4).join()

    // there's no literal match in item's attachments so ? is a substitute
    if (item.attachments.some(a => a.filename === filename)) {
        return console.error(`Exact match for filename "${filename}" on item ${item.links.view} so the question mark was literal`)
    }
    // escape all _other_ regex special chars but convert ?s to . (regex wildcards)
    let re = new RegExp(`^${escapeRegExp(filename).replace(/\?/g, '.')}$`)
    // we use a Set for free deduplication because some items have multiple attachments with the same filename
    let matches = new Set()
    item.attachments.forEach(ia => {
        if (ia.filename && ia.filename.match(re)) matches.add(ia.filename)
    })
    matches = Array.from(matches)
    switch (matches.length) {
        case 0:
            console.error(`No matches for mangled filename "${filename}" on item ${item.links.view}`)
            break

        case 1:
            // print the actual move command to stdout with nothing on stderr
            console.log(`mv -v "${line}" "${path}/${matches[0]}"`)
            break

        default:
            // fallthrough, means length >1
            console.error(`Multiple matches for mangled filename "${filename}" on item ${item.links.view}:\n  -\t${matches.join('\n  -\t')}`)
            break
    }
}

const options = {
    headers: {
        'Accept': 'application/json',
        'X-Authorization': `access_token=${token}`
    }
}
rl.on('close', () => {
    // print hashbang header
    console.log('#!/usr/bin/env bash')
    for (let item of Object.keys(items)) {
        let uuid = item.split('|')[0]
        let version = item.split('|')[1]
        fetch(`https://vault.cca.edu/api/item/${uuid}/${version}?info=attachment,detail`, options)
            .then(r => r.json())
            .then(data => {
                // we only care about published items
                if (data.status === 'live') {
                    // iterate over all the qmark attachments
                    items[item].forEach(l => checkLine(l, data))
                }
            })
            .catch(e => console.error(e))
    }
})
