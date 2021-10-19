function loadTagList() {
    toggleLoading();
    getTags().then((tags) => {
        $('#tagList').html('');
        tags.forEach((tag) => {
            $('#tag-select').append(
                ` <li title="${tag.title}" id="${tag.id}">
                    <a href="#">
                        <span class="word-name">${tag.title}</span>
                    </a>
                    <div class="action">
                        <button class="btn button-icon button-icon-small icon-pin" title="Add a Tag to selection" onClick='addTagToSelectedStickies("${tag.id}")'></button>
                    </div>
                </li>`
            );
        });
        toggleLoading(false);
    });
}

$('#searchApply').on('click', async function () {
    toggleLoading(true);

    var text = $('#searchKeywords').val();
    var keywords = text.split(',').filter((word) => word !== '');

    var stickies = await getStickies();

    var selectedIds = stickies
        .filter((sticky) => {
            return keywords.some((word) => sticky.plainText.indexOf(word) > -1);
        })
        .map((sticky) => sticky.id);

    await miro.board.selection.selectWidgets(selectedIds);

    toggleLoading(false);
});

$('#createTagApply').on('click', async function () {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedTagName: 'Tag',
        },
    });

    miro.board.ui.openModal('setTagNameModal.html', { width: 400, height: 300 }).then(() => {
        miro.board.metadata.get().then(async (metadata) => {
            if (metadata[appId].focusedTagName) {
                await miro.board.tags.create({
                    color: randomColor(),
                    title: metadata[appId].focusedTagName,
                    widgetIds: [],
                });

                toggleLoading(false);
                loadTagList();
            }
        });
    });
});

async function addTagToSelectedStickies(tagId) {
    toggleLoading(true);

    var tags = await getTags();
    var index = tags.findIndex((tag) => tag.id == tagId);

    if (index > -1) {
        selectedStickies = await miro.board.selection.get();

        tags[index].widgetIds.concat(selectedStickies.map((widget) => widget.id));
        await miro.board.tags.update(tags[index]);
    }

    toggleLoading(false);
}