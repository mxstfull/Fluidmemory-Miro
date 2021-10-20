function addClusterList(cluster) {
    $('#clusterList').append(`
        <li class="menu-item" title="${cluster.name}">
            <a href="#" onclick='moveToCluster(${cluster.id})'>
                <div class="word-name">${cluster.name}</div>
                &nbsp;
            </a>
            <div class="action">
                <button class="btn button-icon button-icon-small icon-tile" title="Update with current view" onclick='updateCluster(${cluster.id})'></button>
                <button class="btn button-icon button-icon-small icon-trash" title="Remove" onclick='removeCluster(${cluster.id})'></button>
            </div>
        </li>
    `);
}

function loadClustersToList() {
    toggleLoading();
    getClusters().then((clusters) => {
        $('#clusterList').html('');
        if (clusters && clusters.length) {
            clusters.forEach((cluster) => {
                addClusterList(cluster);
            });
        }        
        toggleLoading(false);
    });
}

async function getClusterById(clusterId) {
    var clusters = await getClusters();
    var clusterIndex = clusters.findIndex((item) => item.id == clusterId);
    return clusters[clusterIndex];
}

async function moveToCluster(clusterId) {
    toggleLoading(true);

    var cluster = await getClusterById(clusterId);
    var widgets = await getStickies();

    var clusteredWidgets = cluster.widgetIds.map((id) => getStickyById(widgets, id))
    
    await focusOnWidgets(clusteredWidgets);

    toggleLoading(false);
}

async function updateCluster(clusterId) {
    toggleLoading(true);

    var cluster = await getClusterById(clusterId);

    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].clusters.findIndex((item) => item.id == cluster.id);
        var selectedStickies = await miro.board.selection.get();

        clusterWidgets(selectedStickies.map(widget => widget.id), metadata[appId].focusedClusterName, metadata[appId].clusters[index].id);

        toggleLoading(false);
        loadClustersToList();
    });
}

function removeCluster(clusterId) {
    toggleLoading(true);

    miro.board.metadata.get().then(async (metadata) => {
        var index = metadata[appId].clusters.findIndex((item) => item.id == clusterId);

        if (index > -1) {
            metadata[appId].clusters.splice(index, 1);
        }

        await miro.board.metadata.update({
            [appId]: {
                ...metadata[appId],
            },
        });

        toggleLoading(false);
        loadClustersToList();
    });
}

$('#createClusterApply').on('click', async () => {
    toggleLoading(true);

    await miro.board.metadata.update({
        [appId]: {
            focusedClusterName: 'Cluster',
        },
    });

    var selectedStickies = await miro.board.selection.get();

    miro.board.ui.openModal('setClusterNameModal.html', { width: 400, height: 300 }).then(() => {
        miro.board.metadata.get().then(async (metadata) => {
            if (metadata[appId].focusedClusterName) {
                await clusterWidgets(selectedStickies.map(widget => widget.id), metadata[appId].focusedClusterName);

                loadClustersToList();
            }
            toggleLoading(false);
        });
    });
});
