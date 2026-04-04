# M365 Files

Full file management via the `files` module of the M365 agent layer (OneDrive + SharePoint).

## Table of Contents
- [Operations Overview](#operations-overview)
- [Workflow: Browse and Find Files](#workflow-browse-and-find-files)
- [Workflow: Search for Files](#workflow-search-for-files)
- [Workflow: Recent and Shared Files](#workflow-recent-and-shared-files)
- [Workflow: Upload a File](#workflow-upload-a-file)
- [Workflow: Share a File](#workflow-share-a-file)
- [Workflow: Manage Files and Folders](#workflow-manage-files-and-folders)
- [Workflow: Version History](#workflow-version-history)
- [Workflow: SharePoint Drive Files](#workflow-sharepoint-drive-files)
- [Operation Routing](#operation-routing)
- [Error Handling](#error-handling)

## Operations Overview (18 total)

| Category     | Operations                                                                        |
|--------------|-----------------------------------------------------------------------------------|
| Browse       | listRootFiles, listFolderFiles, listSharePointDriveFiles, getFileById, getFileByPath |
| Recent       | getRecentFiles, getSharedWithMe                                                   |
| Download     | downloadFile                                                                      |
| Upload       | uploadSmallFile, createUploadSession, uploadLargeFileChunk                        |
| Manage       | createFolder, deleteItem, moveItem, copyItem                                      |
| Search       | searchFiles                                                                       |
| Share        | createSharingLink                                                                 |
| Versioning   | listFileVersions, restoreFileVersion                                              |

## Workflow: Browse and Find Files

```bash
# List files at OneDrive root
m365 agent execute --module files --operation listRootFiles \
  --params '{"select":["id","name","size","lastModifiedDateTime"]}'

# List files in a specific folder
m365 agent execute --module files --operation listFolderFiles \
  --params '{"folderId":"<folderId>","top":50}'

# Get file details by ID
m365 agent execute --module files --operation getFileById \
  --params '{"itemId":"<itemId>"}'

# Get file details by path (relative to OneDrive root)
m365 agent execute --module files --operation getFileByPath \
  --params '{"path":"Documents/Reports/Q1-2026.xlsx"}'
```

## Workflow: Search for Files

```bash
# Search by name or content
m365 agent execute --module files --operation searchFiles \
  --params '{"query":"quarterly report","top":10}'

# Search with specific fields returned
m365 agent execute --module files --operation searchFiles \
  --params '{
    "query": "budget",
    "select": ["id","name","parentReference","lastModifiedDateTime","size"]
  }'
```

## Workflow: Recent and Shared Files

```bash
# Files recently opened by the user
m365 agent execute --module files --operation getRecentFiles

# Files shared with the user
m365 agent execute --module files --operation getSharedWithMe
```

## Workflow: Upload a File

### Small files (under 4 MB)

```bash
m365 agent execute --module files --operation uploadSmallFile \
  --params '{
    "parentFolderId": "<folderId>",
    "fileName": "report.pdf",
    "content": "<Buffer or base64 content>"
  }'
```

### Large files (4 MB and above) — resumable upload

```bash
# Step 1: Create an upload session
m365 agent execute --module files --operation createUploadSession \
  --params '{"parentFolderId":"<folderId>","fileName":"large-video.mp4"}'

# Step 2: Upload chunks using the uploadUrl from step 1
m365 agent execute --module files --operation uploadLargeFileChunk \
  --params '{
    "uploadUrl": "<uploadUrl>",
    "chunk": "<chunk buffer>",
    "rangeStart": 0,
    "rangeEnd": 4194303,
    "totalSize": 52428800
  }'
```

Repeat step 2 for each chunk until `rangeEnd + 1 === totalSize`.

## Workflow: Share a File

```bash
# Create an "anyone with the link can view" link
m365 agent execute --module files --operation createSharingLink \
  --params '{"itemId":"<itemId>","type":"view","scope":"anonymous"}'

# Create an org-internal edit link
m365 agent execute --module files --operation createSharingLink \
  --params '{"itemId":"<itemId>","type":"edit","scope":"organization"}'
```

`type` values: `view` | `edit`
`scope` values: `anonymous` | `organization`

The response contains `link.webUrl` — the shareable URL.

## Workflow: Manage Files and Folders

```bash
# Create a folder
m365 agent execute --module files --operation createFolder \
  --params '{"parentFolderId":"<parentId>","name":"Archive 2026"}'

# Move a file to another folder
m365 agent execute --module files --operation moveItem \
  --params '{"itemId":"<itemId>","newParentId":"<targetFolderId>"}'

# Copy a file
m365 agent execute --module files --operation copyItem \
  --params '{"itemId":"<itemId>","newParentId":"<targetFolderId>"}'

# Delete a file or folder
m365 agent execute --module files --operation deleteItem \
  --params '{"itemId":"<itemId>"}'
```

## Workflow: Version History

```bash
# List versions
m365 agent execute --module files --operation listFileVersions \
  --params '{"itemId":"<itemId>"}'

# Restore a previous version
m365 agent execute --module files --operation restoreFileVersion \
  --params '{"itemId":"<itemId>","versionId":"2.0"}'
```

## Workflow: SharePoint Drive Files

```bash
m365 agent execute --module files --operation listSharePointDriveFiles \
  --params '{
    "siteId": "<siteId>",
    "driveId": "<driveId>",
    "folderId": "<folderId>"
  }'
```

To find `siteId` and `driveId`, use the `search` module: `search.searchAll` with entityType `site`.

## Operation Routing

| User intent                          | Operation                                  |
|--------------------------------------|--------------------------------------------|
| "Show my files"                      | listRootFiles                              |
| "What's in that folder?"             | listFolderFiles                            |
| "Find the Q1 report"                 | searchFiles                                |
| "What have I worked on recently?"    | getRecentFiles                             |
| "What's been shared with me?"        | getSharedWithMe                            |
| "Upload this file"                   | uploadSmallFile (or resumable for large)   |
| "Share this with a link"             | createSharingLink                          |
| "Move it to the archive folder"      | moveItem                                   |
| "Create a folder called..."          | createFolder                               |
| "What versions does this file have?" | listFileVersions                           |
| "Restore the previous version"       | restoreFileVersion                         |
| "Download this file"                 | downloadFile (returns download URL)        |

## Error Handling

| Situation                     | Likely cause                          | Fix                                           |
|-------------------------------|---------------------------------------|-----------------------------------------------|
| `Authorization_RequestDenied` | Missing `Files.ReadWrite`             | Re-authenticate with Files scope              |
| `Request_ResourceNotFound`    | Stale item/folder ID                  | Re-browse to get current IDs                  |
| Upload fails (>4 MB)          | Used uploadSmallFile for large file   | Use createUploadSession + uploadLargeFileChunk |
| `nameAlreadyExists`           | File/folder name conflict             | Rename the item or delete the existing one    |
| Sharing link returns 403      | Tenant disables anonymous sharing     | Use `scope: "organization"` instead           |
