function addSnapshotList(snapshot) {
    $('#snapshotList').append(`
        <li class="menu-item" title="${snapshot.name}">
            <a href="#" onclick='moveToSnapshot(${snapshot.id})'>
                <div class="word-name">${snapshot.name}</div>
                &nbsp;
            </a>
            <div class="action">
                <button class="btn button-icon button-icon-small icon-photo" title="Update with current view" onclick='updateSnapshot(${snapshot.id})'></button>
                <button class="btn button-icon button-icon-small icon-trash" title="Remove" onclick='removeSnapshot(${snapshot.id})'></button>
            </div>
        </li>
    `);
}

function loadSnapshotsToList() {
    toggleLoading();
    getSnapshots().then((snapshots) => {
        $('#snapshotList').html('');
        if (snapshots && snapshots.length) {
            snapshots.forEach((snapshot) => {
                addSnapshotList(snapshot);
            });
        }        
        toggleLoading(false);
    });
}

async function getSnapshotById(snapshotId) {
    var snapshots = await getSnapshots();
    var snapshotIndex = snapshots.findIndex((item) => item.id == snapshotId);
    return snapshots[snapshotIndex];
}

async function moveToSnapshot(snapshotId) {
    toggleLoading(true);

    var snapshot = await getSnapshotById(snapshotId);
    var oldTags = await getTags();
    var oldStickies = await getStickies();

    await miro.board.tags.delete(oldTags.map((item) => item.id));
    await miro.board.widgets.deleteById(oldStickies.map((item) => item.id));

    var newWidgets = await miro.board.widgets.create(snapshot.stickies);
    var newTags = snapshot.tags.map(tag => {
        tag.widgetIds = [];
        return tag;
    });

    newWidgets.forEach((widget, index) => {
        oldWidget = snapshot.stickies[index];
        oldWidget.tags.forEach(widgetTag => {
            index = newTags.findIndex((item) => item.id == widgetTag.id)
            if (index > -1) {
                newTags[index].widgetIds.push(widget.id);
            }
        })
    })
    await miro.board.tags.create(newTags);

    toggleLoading(false);
}

async function updateSnapshot(snapshotId) {
    toggleLoading(true);

    var stickies = await getStickies();
    var tags = await getTags();
    var snapshot = await getSnapshotById(snapshotId);

    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].snapshots.findIndex((item) => item.id == snapshot.id);

        if (index > -1) {
            metadata[appId].snapshots[index].stickies = stickies;
            metadata[appId].snapshots[index].tags = tags;
        }

        await miro.board.metadata.update({
            [appId]: {
                ...metadata[appId],
            },
        });

        toggleLoading(false);
        loadSnapshotsToList();
    });
}

function removeSnapshot(snapshotId) {
    toggleLoading(true);

    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].snapshots.findIndex((item) => item.id == snapshotId);

        if (index > -1) {
            metadata[appId].snapshots.splice(index, 1);
        }

        await miro.board.metadata.update({
            [appId]: {
                ...metadata[appId],
            },
        });

        toggleLoading(false);
        loadSnapshotsToList();
    });
}

$('#addSnapshot').on('click', async () => {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedSnapshotName: 'Snapshot',
        },
    });

    var stickies = await getStickies();
    var tags = await getTags();

    miro.board.ui.openModal('setSnapshotNameModal.html', { width: 400, height: 300 }).then(() => {
        miro.board.metadata.get().then(async (metadata) => {
            if (metadata[appId].focusedSnapshotName) {
                if (!metadata[appId].snapshots || !metadata[appId].snapshots.length) metadata[appId].snapshots = [];

                metadata[appId].snapshots.push({
                    id: randomId(),
                    name: metadata[appId].focusedSnapshotName,
                    stickies,
                    tags,
                });

                await miro.board.metadata.update({
                    [appId]: {
                        ...metadata[appId],
                    },
                });

                loadSnapshotsToList();
            }
            toggleLoading(false);
        });
    });
});
