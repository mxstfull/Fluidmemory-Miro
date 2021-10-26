var appId = '3074457365447061755';
var defaultWidgetWidth = 199,
    defaultWidgetHeight = 228,
    defaultMargin = 30;
var duplicationColor = '#ff3333';

function randomColor() {
    const red = Math.floor((Math.random() * 256) / 2);
    const green = Math.floor((Math.random() * 256) / 2);
    const blue = Math.floor((Math.random() * 256) / 2);
    return '#' + red.toString(16) + green.toString(16) + blue.toString(16);
}
function randomBrightColor() {
    const red = Math.floor(((1 + Math.random()) * 256) / 2);
    const green = Math.floor(((1 + Math.random()) * 256) / 2);
    const blue = Math.floor(((1 + Math.random()) * 256) / 2);

    return '#' + red.toString(16) + green.toString(16) + blue.toString(16);
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
function getStickyById(widgets, id) {
    index = widgets.findIndex((widget) => widget.id == id);

    return index > -1 ? widgets[index] : null;
}
function getStickyById(stickies, id) {
    return stickies[stickies.findIndex((widget) => (widget.id = id))];
}
function getTags() {
    return miro.board.tags.get();
}
async function getSnapshots() {
    var data = await miro.board.metadata.get();
    if (data[appId]) {
        return data[appId].snapshots ? data[appId].snapshots : [];
    }
    return [];
}
async function formatMetadata() {
    await miro.board.metadata.update({
        [appId]: {},
    });
}

function toggleLoading(show = true) {
    $('.loading-wrapper').css({ visibility: show ? 'visible' : '' });
}

function getClusterDimensions(widgetCount, widgetWidth = defaultWidgetWidth, widgetHeight = defaultWidgetHeight, margin = defaultMargin) {
    const clusterDimension = Math.ceil(Math.sqrt(widgetCount)); // eg if length 22, 5*5
    const clusterWidth = widgetWidth * clusterDimension + margin * (clusterDimension + 1);
    const clusterHeight = widgetHeight * clusterDimension + margin * (clusterDimension + 1);
    return { clusterWidth, clusterHeight, clusterDimension };
}

function getWidgetLocation(widget) {
    return { startX: widget.bounds.left, startY: widget.bounds.top, endX: widget.bounds.right, endY: widget.bounds.bottom };
    // x: occupied from startX to endX
    // y: occupied from startY to endY
}

function getBoardWidgetLocations(widgets) {
    return widgets.map((widget) => getWidgetLocation(widget));
}

function getClusterLocation(currentWidgets, clusterDimensions) {
    const widgetLocations = getBoardWidgetLocations(currentWidgets);
    const candidateSeries = [
        [0, 0],
        [1, 0],
        [1, 0.5],
        [1, 1],
        [0.5, 1],
        [0, 1],
        [-0.5, 1],
        [-1, 1],
        [-1, 0.5],
        [-1, 0],
        [-1, -0.5],
        [-1, -1],
        [-0.5, -1],
        [0, -1],
        [0.5, -1],
        [1, -1],
    ];
    let multiplier = 100;
    const margin = defaultMargin;
    let locationOccupied;
    let clusterLocationCandidate;
    let i;
    do {
        for (i = 0; i < candidateSeries.length; i++) {
            clusterLocationCandidate = getClusterLocationCandidate(clusterDimensions, candidateSeries[i], multiplier);
            locationOccupied = isLocationOccupied(clusterLocationCandidate, widgetLocations, margin);
            if (!locationOccupied) break;
        }
        multiplier = multiplier + 100;
    } while (locationOccupied);
    return clusterLocationCandidate;
}

function getClusterLocationCandidate(clusterDimensions, candidateSeriesItem, multiplier = 100) {
    const { clusterWidth, clusterHeight } = clusterDimensions;
    const x = candidateSeriesItem[0] * multiplier;
    const y = candidateSeriesItem[1] * multiplier;
    const startX = x - clusterWidth / 2;
    const endX = x + clusterWidth / 2;
    const startY = y - clusterHeight / 2;
    const endY = y + clusterHeight / 2;
    return { x, y, startX, endX, startY, endY };
}

function isLocationOccupied(clusterLocationCandidate, widgetLocations, margin = defaultMargin) {
    const locationOccupied = widgetLocations.some((widgetLocation) => {
        return locationsIntersect(widgetLocation, clusterLocationCandidate, margin);
    });
    return locationOccupied;
}

function locationsIntersect(location1, location2, margin = defaultMargin) {
    const { startX: a_startX, startY: a_startY, endX: a_endX, endY: a_endY } = location1;
    const { startX: b_startX, startY: b_startY, endX: b_endX, endY: b_endY } = location2;
    const intersectX = a_startX <= b_endX && b_startX <= a_endX;
    const intersectY = a_startY <= b_endY && b_startY <= a_endY;
    const locationsIntersect = intersectX && intersectY;
    return locationsIntersect;
}

function getWidgetLocations(clusterLocation, clusterDimension, numNewWidgets, widgetWidth = defaultWidgetWidth, widgetHeight = defaultWidgetHeight, margin = defaultMargin) {
    let locations = [];
    const { startX: cluster_startX, endX: cluster_endX, startY: cluster_startY, endY: cluster_endY } = clusterLocation;
    let currentWidget = 0;

    for (let i = 0; i < clusterDimension; i++) {
        for (let j = 0; j < clusterDimension; j++) {
            const location = {
                x: cluster_startX + (0.5 + j) * widgetWidth + margin * (j + 1),
                y: cluster_startY + (0.5 + i) * widgetHeight + margin * (i + 1),
            };
            locations.push(location);
            currentWidget++;
            if (currentWidget >= numNewWidgets) {
                i = clusterDimension;
                break;
            }
        }
    }
    return locations;
}

async function getClusteringWidgetLocation(widgetIds) {
    var widgets = await getStickies();
    var widgetWidth = defaultWidgetWidth,
        widgetHeight = defaultWidgetHeight,
        margin = defaultMargin;
    var clusteringWidgets = widgets.filter((widget) => {
        widgetWidth = widget.bounds.width;
        widgetHeight = widget.bounds.height;
        return widgetIds.includes(widget.id);
    });
    var clusterDimensions = getClusterDimensions(clusteringWidgets.length, widgetWidth, widgetHeight, margin);
    var { clusterDimension } = clusterDimensions;
    var clusterLocation = getClusterLocation(widgets, clusterDimensions);
    let widgetLocations = getWidgetLocations(clusterLocation, clusterDimension, clusteringWidgets.length, widgetWidth, widgetHeight, margin);

    return { clusterLocation, clusteringWidgets, widgetLocations, widgetWidth, widgetHeight };
}

async function clusterWidgets(widgetIds, update = true) {
    if (widgetIds) {
        toggleLoading(true);

        var { widgetLocations, clusteringWidgets, widgetWidth, widgetHeight } = await getClusteringWidgetLocation(widgetIds);
        let newWidgets = [];
        let backgroundColor = randomBrightColor();

        if (update == true) {
            newWidgets = await miro.board.widgets.update(
                clusteringWidgets.map((widget, index) => {
                    var updatedData = {
                        ...widget,
                        bounds: {
                            ...widget.bounds,
                            width: widgetWidth,
                            height: widgetHeight,
                        },
                        metadata: {
                            [appId]: widget.metadata[appId]
                        },
                        x: widgetLocations[index].x,
                        y: widgetLocations[index].y,
                    };
                    return updatedData;
                })
            );
        } else {
            newWidgets = await miro.board.widgets.create(
                clusteringWidgets.map((widget, index) => {
                    newWidget = {
                        ...widget,
                        bounds: {
                            ...widget.bounds,
                            width: widgetWidth,
                            height: widgetHeight,
                        },
                        metadata: {
                            [appId]: widget.metadata[appId]
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
        }
        
        newWidgets = await miro.board.widgets.update(newWidgets.map(widget => {
            return {
                ...widget,
                metadata: update ? undefined : {
                    [appId]: {
                        duplicated: true
                    }
                },
                style: {
                    stickerBackgroundColor: ((!widget.metadata[appId]?.duplicated && update) ? backgroundColor : duplicationColor),
                }
            }
        }));

        await focusOnWidgets(newWidgets);

        toggleLoading(false);
        return newWidgets;
    }
}

function getDimensionOfWidget(widgets) {
    var left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;

    widgets.forEach((sticky) => {
        left = Math.min(left, sticky.bounds.left);
        top = Math.min(top, sticky.bounds.top);
        right = Math.max(right, sticky.bounds.right);
        bottom = Math.max(bottom, sticky.bounds.bottom);
    });

    return { left, top, right, bottom };
}

async function focusOnWidgets(widgets) {
    var { left, right, top, bottom } = getDimensionOfWidget(widgets);

    await miro.board.viewport.set({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });
}

// async function registerCluster(widgets, clusterName, clusterId) {
//     var widgetIds = widgets.map(widget => widget.id);
//     var metadata = await miro.board.metadata.get();

//     if (!metadata[appId]['clusters']) {
//         metadata[appId]['clusters'] = []
//     }

//     if (clusterId) {
//         var index = metadata[appId]['clusters'].findIndex(cluster => cluster.id == clusterId);
//         metadata[appId]['clusters'][index].widgetIds = widgetIds;
//     } else {
//         metadata[appId]['clusters'].push({
//             id: randomId(),
//             widgetIds,
//             name: clusterName
//         });
//     }

//     await miro.board.metadata.update(metadata);

//     console.log(metadata);
// }
