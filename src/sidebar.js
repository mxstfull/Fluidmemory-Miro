var appId = '3074457365447061755';

function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
function randomId() {
    return Date.now().toString() + Math.floor(Math.random() * 10000);
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function getStickies() {
    return miro.board.widgets.get({
        type: 'STICKER',
    });
}
function getStickyById(stickies, id) {
    return stickies[stickies.findIndex((widget) => (widget.id = id))];
}
function getTags() {
    return miro.board.tags.get();
}
async function getBookmarks() {
    var data = await miro.board.metadata.get();
    if (data[appId]) {
        return data[appId].bookmarks ? data[appId].bookmarks : [];
    }
    return [];
}
async function formatMetadata() {
    await miro.board.metadata.update({
        [appId]: {}
    });
}

function toggleLoading(show = true) {
    $('.loading-wrapper').css({ visibility: show ? 'visible' : '' });
}

miro.onReady(() => {
    // loadTags().then(() => {
    // });
    formatMetadata();
});
