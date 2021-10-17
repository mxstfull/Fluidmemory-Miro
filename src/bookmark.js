function addBookmarkList(bookmark) {
    $('#bookmarkList').append(`
        <li class="menu-item" title="${bookmark.name}">
            <a href="#" onclick="moveToBookmark(${JSON.stringify(bookmark)})">
                <div class="word-name">${bookmark.name}</div>
                &nbsp;
            </a>
            <div class="action">
                <button class="btn button-icon button-icon-small icon-photo" title="Update with current view" onclick="updateBookmark(${JSON.stringify(bookmark)})"></button>
                <button class="btn button-icon button-icon-small icon-trash" title="Remove" onclick="removeBookmark(${JSON.stringify(bookmark)})"></button>
            </div>
        </li>
    `);
}

function loadBookmarksToList() {
    toggleLoading();
    getBookmarks().then((bookmarks) => {
        $('#bookmarkList').html('');
        bookmarks.forEach((bookmark) => {
            addBookmarkList(bookmark);
        });
        toggleLoading(false);
    });
}

function moveToBookmark(bookmark) {
    miro.board.viewport.update(bookmark.viewport);
}

function updateBookmark(bookmark) {
    var viewport = await miro.board.viewport.get();
    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].bookmarks.findIndex((item) => item.id == bookmark.id);

        if (index > -1) {
            metadata[appId].bookmarks[index].viewport = viewport;
        }

        await miro.board.metadata.update({
            [appId]: {
                ...metadata[appId]
            }
        })

        toggleLoading(false);
        loadBookmarksToList();
    });
}

function removeBookmark(bookmark) {
    var viewport = await miro.board.viewport.get();
    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].bookmarks.findIndex((item) => item.id == bookmark.id);

        if (index > -1) {
            metadata[appId].bookmarks.splice(index, 1);
        }

        await miro.board.metadata.update({
            [appId]: {
                ...metadata[appId]
            }
        })

        toggleLoading(false);
        loadBookmarksToList();
    });
}

$('#addBookmark').on('click', async () => {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedBookmarkName: 'Bookmark',
        },
    });
    var viewport = await miro.board.viewport.get();

    miro.board.ui.openModal('setBookmarkNameModal.html', { width: 400, height: 300 }).then(() => {
        miro.board.metadata.get().then(async (metadata) => {
            if (metadata[appId].focusedBookmarkName) {
                
                if (!metadata[appId].bookmarks)
                    metadata[appId].bookmarks = [];

                metadata[appId].bookmarks.push({
                    id: randomId(),
                    name: metadata[appId].focusedBookmarkName,
                    viewport: viewport
                })

                await miro.board.metadata.update({
                    [appId]: {
                        ...metadata[appId]
                    }
                })

                toggleLoading(false);
                loadBookmarksToList();
            }
        });
    });
});
