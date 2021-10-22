function addGroupList(group) {
    $('#clusterList').append(`
        <li class="menu-item" title="${group.title}">
            <a href="#" onclick='moveToGroup("${group.id}")'>
                <div class="word-name">${group.title}</div>
                &nbsp;
            </a>
            <div class="action">
                <button class="btn button-icon button-icon-small icon-tile" title="Update with current view" onclick='updateGroup("${group.id}")'></button>
                <button class="btn button-icon button-icon-small icon-trash" title="Remove" onclick='removeGroup("${group.id}")'></button>
            </div>
        </li>
    `);
}

async function getGroups() {
    return await miro.board.widgets.get({
        type: 'FRAME',
    });
}
function loadGroupsToList() {
    toggleLoading();
    getGroups().then((groups) => {
        $('#clusterList').html('');
        groups.forEach((cluster) => {
            addGroupList(cluster);
        });
        toggleLoading(false);
    });
}

async function getGroupById(clusterId) {
    var groups = await miro.board.widgets.get({
        type: 'FRAME',
        id: clusterId,
    });
    return groups.length ? groups[0] : null;
}

async function moveToGroup(groupId) {
    toggleLoading(true);

    var group = await getGroupById(groupId);
    var { left, right, top, bottom } = group.bounds;

    await miro.board.viewport.set({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });

    await miro.board.selection.selectWidgets([groupId]);

    toggleLoading(false);
}

async function updateGroup(groupId) {
    toggleLoading(true);

    var cluster = await getGroupById(groupId);
    var selectedStickies = await miro.board.selection.get();
    var selectedStickyIds = selectedStickies.map((widget) => widget.id);
    
    await locateOnFrame(selectedStickyIds, cluster.title, cluster);

    loadGroupsToList();
    toggleLoading(false);
}

async function removeGroup(groupId) {
    toggleLoading(true);

    await miro.board.widgets.deleteById(groupId);

    loadGroupsToList();
    toggleLoading(false);
}

$('#createGroupApply').on('click', async () => {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedGroupName: 'Group',
        },
    });

    var selectedStickies = await miro.board.selection.get();
    var selectedStickyIds = selectedStickies.map((widget) => widget.id);

    if (selectedStickies.length) {
        miro.board.ui.openModal('setGroupNameModal.html', { width: 400, height: 300 }).then(() => {
            miro.board.metadata.get().then(async (metadata) => {
                if (metadata[appId].focusedGroupName) {
                    await locateOnFrame(selectedStickyIds, metadata[appId].focusedGroupName);

                    loadGroupsToList();
                }
                toggleLoading(false);
            });
        });
    } else {
        toggleLoading(false);
    }
});

async function locateOnFrame(stickyIds, groupName, group = null) {
    var { clusterLocation, widgetLocations, clusteringWidgets, widgetWidth, widgetHeight } = await getClusteringWidgetLocation(stickyIds);
    let backgroundColor = randomBrightColor();
    var tags = await getTags();

    if (group) {
        await miro.board.widgets.update({
            ...group,
            width: clusterLocation.endX - clusterLocation.startX,
            height: clusterLocation.endY - clusterLocation.startY,
            x: (clusterLocation.endX + clusterLocation.startX) / 2,
            y: (clusterLocation.endY + clusterLocation.startY) / 2,
        });    
    } else {
        await miro.board.widgets.create({
            type: 'FRAME',
            title: groupName,
            clientVisible: true,
            width: clusterLocation.endX - clusterLocation.startX,
            height: clusterLocation.endY - clusterLocation.startY,
            x: (clusterLocation.endX + clusterLocation.startX) / 2,
            y: (clusterLocation.endY + clusterLocation.startY) / 2,
        });
    }

    var newWidgets = await miro.board.widgets.create(
        clusteringWidgets.map((widget, index) => {
            newWidget = {
                ...widget,
                bounds: {
                    ...widget.bounds,
                    width: widgetWidth,
                    height: widgetHeight,
                },
                style: {
                    stickerBackgroundColor: backgroundColor,
                },
                x: widgetLocations[index].x,
                y: widgetLocations[index].y,
            };
            delete newWidget.id;
            delete newWidget.createdUserId;
            delete newWidget.lastModifiedUserId;
            return newWidget;
        })
    );
    newWidgets = await miro.board.widgets.update(newWidgets.map(widget => {
        return {
            ...widget,
            style: {
                stickerBackgroundColor: backgroundColor,
            }
        }
    }));

    tags.forEach((tag) => {
        stickyIds.forEach((id, index) => {
            if (tag.widgetIds.indexOf(id) > -1) {
                tag.widgetIds.push(newWidgets[index].id);
            }
        });
    });
    await miro.board.tags.update(tags);
    await miro.board.widgets.deleteById(stickyIds);
}
