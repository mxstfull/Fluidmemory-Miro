function addBookmarkList(bookmark) {
    $('#bookmarkList').append(`
        <li class="menu-item" title="${bookmark.name}">
            <a href="#">
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

function loadBooksmarksToList() {
    toggleLoading();
    getBookmarks().then((bookmarks) => {
        $('#bookmarkList').html('');
        bookmarks.forEach((bookmark) => {
            addBookmarkList(bookmark);
        });
        toggleLoading(false);
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
                    name: metadata[appId].focusedBookmarkName,
                    viewport: viewport
                })

                await miro.board.metadata.update({
                    [appId]: {
                        ...metadata[appId]
                    }
                })

                toggleLoading(false);
                loadBooksmarksToList();
            }
        });
    });
});
