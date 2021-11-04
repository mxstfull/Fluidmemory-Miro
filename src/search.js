function loadTagList() {
    toggleLoading();
    getTags().then((tags) => {
        $('#tagList').html('');
        tags.forEach((tag) => {
            $('#tagList').append(
                ` <li title="${tag.title}" id="${tag.id}">
                    <a href="#">
                        <div class="word-name">${tag.title}</div> &nbsp;
                    </a>
                    <div class="action">
                        <button class="btn button-icon button-icon-small icon-tile" title="Cluster stickies of this tag" onClick='clusterStickiesOfTag("${tag.id}")'></button>
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

    var selectedWidgets = filterCopies(stickies);
    var selectedWidgets = selectedWidgets.filter((sticky) => {
        return keywords.some((word) => sticky.plainText.toLowerCase().indexOf(word.toLowerCase()) > -1);
    });
    var selectedIds = selectedWidgets.map((sticky) => sticky.id);

    if (selectedIds.length) {
        await miro.board.selection.selectWidgets(selectedIds);
        await focusOnWidgets(selectedWidgets);
    }

    toggleLoading(false);
});

$('#clusterSearchedResultButton').on('click', async function () {
    toggleLoading(true);

    var newTagName = $('#newTagNameForSearch').val();

    if (await checkValidatationOfTagName(newTagName)) {
        var selectedStickies = await miro.board.selection.get();
        selectedStickies = filterCopies(selectedStickies)

        await miro.board.tags.create({
            color: randomColor(),
            title: newTagName,
            widgetIds: selectedStickies.map((widget) => widget.id),
        });
        await clusterWidgets(selectedStickies);
    }

    loadTagList();
    toggleLoading(false);
});

$('#duplicateSearchedResultButton').on('click', async function () {
    toggleLoading(true);

    var newTagName = $('#newTagNameForSearch').val();

    if (await checkValidatationOfTagName(newTagName)) {
        var selectedStickies = await miro.board.selection.get();
        selectedStickies = filterCopies(selectedStickies)
        var newWidgets = await clusterWidgets(
            selectedStickies.map((widget) => widget.id),
            false
        );
        await miro.board.tags.create({
            color: randomColor(),
            title: newTagName,
            widgetIds: newWidgets.map((widget) => widget.id),
        });
    }

    loadTagList();
    toggleLoading(false);
});

async function checkValidatationOfTagName(name) {
    name = name.toLowerCase();
    if (name != '') {
        var tags = await getTags();
        if (tags.findIndex((tag) => tag.title.toLowerCase() == name) == -1 && name != 'tag') {
            return true;
        } else {
            miro.showErrorNotification('Your new tag name is existed already.');
        }
    } else {
        miro.showErrorNotification('Please enter your new tag name.');
    }
    return false;
}

async function addTagToSelectedStickies(tagId) {
    toggleLoading(true);

    var tags = await getTags();
    var index = tags.findIndex((tag) => tag.id == tagId);

    if (index > -1) {
        var selectedStickies = await miro.board.selection.get();
        selectedStickies = filterCopies(selectedStickies);

        tags[index].widgetIds = tags[index].widgetIds.concat(selectedStickies.map((widget) => widget.id));
        await miro.board.tags.update(tags[index]);
    }

    toggleLoading(false);
}

async function clusterStickiesOfTag(tagId) {
    toggleLoading(true);

    stickies = await getStickies();
    stickies = filterCopies(stickies);
    await clusterWidgets(stickies.filter((widget) => widget.tags.some((tag) => tag.id == tagId)).map((widget) => widget.id));

    toggleLoading(false);
}
