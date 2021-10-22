function addClusterList(cluster) {
    $('#clusterList').append(`
        <li class="menu-item" title="${cluster.title}">
            <a href="#" onclick='moveToCluster("${cluster.id}")'>
                <div class="word-name">${cluster.title}</div>
                &nbsp;
            </a>
            <div class="action">
                <button class="btn button-icon button-icon-small icon-tile" title="Update with current view" onclick='updateCluster("${cluster.id}")'></button>
                <button class="btn button-icon button-icon-small icon-trash" title="Remove" onclick='removeCluster("${cluster.id}")'></button>
            </div>
        </li>
    `);
}

async function getClusters() {
    return await miro.board.widgets.get({
        type: 'FRAME',
    });
}
function loadClustersToList() {
    toggleLoading();
    getClusters().then((clusters) => {
        $('#clusterList').html('');
        clusters.forEach((cluster) => {
            addClusterList(cluster);
        });
        toggleLoading(false);
    });
}

async function getClusterById(clusterId) {
    clusters = await miro.board.widgets.get({
        type: 'FRAME',
        id: clusterId,
    });
    return clusters.length ? clusters[0] : null;
}

async function moveToCluster(clusterId) {
    toggleLoading(true);

    var cluster = await getClusterById(clusterId);
    var { left, right, top, bottom } = cluster.bounds;

    await miro.board.viewport.set({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });

    toggleLoading(false);
}

async function updateCluster(clusterId) {
    toggleLoading(true);

    var cluster = await getClusterById(clusterId);
    var selectedStickies = await miro.board.selection.get();
    var selectedStickyIds = selectedStickies.map((widget) => widget.id);
    
    await locateOnFrame(selectedStickyIds, cluster.title, cluster);

    loadClustersToList();
    toggleLoading(false);
}

async function removeCluster(clusterId) {
    toggleLoading(true);

    await miro.board.widgets.deleteById(clusterId);

    loadClustersToList();
    toggleLoading(false);
}

$('#createClusterApply').on('click', async () => {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedClusterName: 'Cluster',
        },
    });

    var selectedStickies = await miro.board.selection.get();
    var selectedStickyIds = selectedStickies.map((widget) => widget.id);

    if (selectedStickies.length) {
        miro.board.ui.openModal('setClusterNameModal.html', { width: 400, height: 300 }).then(() => {
            miro.board.metadata.get().then(async (metadata) => {
                if (metadata[appId].focusedClusterName) {
                    await locateOnFrame(selectedStickyIds, metadata[appId].focusedClusterName);

                    loadClustersToList();
                }
                toggleLoading(false);
            });
        });
    } else {
        toggleLoading(false);
    }
});

async function locateOnFrame(stickyIds, clusterName, cluster = null) {
    var { clusterLocation, widgetLocations, clusteringWidgets, widgetWidth, widgetHeight } = await getClusteringWidgetLocation(stickyIds);
    let backgroundColor = randomBrightColor();
    var tags = await getTags();

    if (cluster) {
        await miro.board.widgets.update({
            ...cluster,
            width: clusterLocation.endX - clusterLocation.startX,
            height: clusterLocation.endY - clusterLocation.startY,
            x: (clusterLocation.endX + clusterLocation.startX) / 2,
            y: (clusterLocation.endY + clusterLocation.startY) / 2,
        });    
    } else {
        await miro.board.widgets.create({
            type: 'FRAME',
            title: clusterName,
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
                    ...widget.style,
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
