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

function toggleLoading(show = true) {
    $('.loading-wrapper').css({ visibility: show ? 'visible' : '' });
}

miro.onReady(() => {
    // loadTags().then(() => {
    // });
});

$('[data-tabbtn]').on('click', (e) => {
    tabId = $(e.currentTarget).attr('data-tabbtn');
    $('.tab-panel').removeClass('active');
    $(`#${tabId}`).addClass('active');
    $('[data-tabbtn]').removeClass('tab-active');
    $(e.currentTarget).addClass('tab-active');

    if (tabId == 'tab-count') {
        addTagSelectOptions();
    }
});

var wordCounts;
var defaultWidgetWidth = 199,
    defaultWidgetHeight = 228,
    defaultMargin = 30;
var NOTAG = '!-----!';
var defaultStopList;

$.getJSON('src/nltk_stoplist.json', (data) => {
    defaultStopList = data;
});

//////////////// Count Tab ///////////////////////

function analyzeStopList() {
    var list = $('#stopList').val().toLowerCase().replace(/\s/g, '').split(',');
    list.push('');
    list = defaultStopList.concat(list);
    return list;
}

function getSelectedTag() {
    return $('#tag-select').val();
}

function addTagSelectOptions() {
    toggleLoading();
    getTags().then((tags) => {
        $('#tag-select').html('<option value="all"> All </option>');
        tags.forEach((tag) => {
            $('#tag-select').append(`<option value='${tag.title}'>${tag.title}</option>`);
        });
        toggleLoading(false);
    });
}

function getWordTagTotalCount(words) {
    var sum = 0;

    for (index in words) {
        sum += words[index];
    }

    return sum;
}

function getWordTotalCount(wordTags) {
    var sum = 0;

    for (index in wordTags) {
        sum += getWordTagTotalCount(wordTags[index]);
    }

    return sum;
}

function getSortedWordsArrayIndex(wordCounts) {
    indexes = Object.keys(wordCounts);
    indexes.sort((a, b) => {
        return getWordTotalCount(wordCounts[a]) < getWordTotalCount(wordCounts[b]) ? 1 : -1;
    });
    return indexes;
}

function getSortedWordTagArrayIndex(wordTagCounts) {
    indexes = Object.keys(wordTagCounts);
    indexes.sort((a, b) => {
        return getWordTagTotalCount(wordTagCounts[a]) < getWordTagTotalCount(wordTagCounts[b]) ? 1 : -1;
    });
    return indexes;
}

function getSortedWordWidgetArrayIndex(wordWidgetCounts) {
    indexes = Object.keys(wordWidgetCounts);
    indexes.sort((a, b) => {
        return wordWidgetCounts[a] < wordWidgetCounts[b] ? 1 : -1;
    });
    return indexes;
}

function addToStopList(ele, word) {
    var wordMenu = $(ele).closest('.menu-item-word');

    wordMenu.remove();

    var stopList = analyzeStopList();
    stopList.push(word);
    stopList = stopList.filter((item) => item !== '');

    $('#stopList').val(stopList.join(', '));
}

function menuItem(data, shorten = false, expandable = true) {
    var id = randomId();

    return $(`
    <li class="menu-item-${data.type}" title="${capitalizeFirstLetter(data.showName) + ' (' + data.count + ')'}" id="${id}">
        <a href="#" ${expandable ? 'class="has-arrow" aria-expanded="false"' : ''}>
            <span class="word-name">${data.showName}</span> &nbsp;
            <span class="item-badge">(${data.count})</span>
        </a>
        <div class="action">
            ${
                !shorten
                    ? `<button class="btn button-icon button-icon-small icon-tile" title="Cluster" onClick='clusterItemsFromData(${JSON.stringify(data)})'></button>
                        <button class="btn button-icon button-icon-small icon-pin" title="Add a Tag" onClick='addTagSelectedItem(${JSON.stringify(data)})'></button>
                        <button class="btn button-icon button-icon-small icon-duplicate" title="Duplicate" onClick='duplicateSelection(${JSON.stringify(data)})'></button>
                        <button class="btn button-icon button-icon-small icon-more" onClick="moreButtonClicked(this)" title="More"></button>`
                    : `<button class="btn button-icon button-icon-small icon-tile" title="Cluster" onClick='clusterItemsFromData(${JSON.stringify(data)})'></button>
                        <button class="btn button-icon button-icon-small icon-pin" title="Add a Tag" onClick='addTagSelectedItem(${JSON.stringify(data)})'></button>
                        <button class="btn button-icon button-icon-small icon-more" onClick="moreButtonClicked(this)" title="More"></button>`
            }
            ${
                !shorten
                    ? `<ul class="more-dropmenu"> <li> <button class="btn button-icon button-icon-small icon-deactivated" title="Add to stop list" onClick='addToStopList(this, "${data.word}")'> Add to stop list</button> </li> </ul>`
                    : `<ul class="more-dropmenu"> 
                        <li><button class="btn button-icon button-icon-small icon-duplicate" title="Duplicate" onClick='duplicateSelection(${JSON.stringify(data)})'>Duplicate</button></li>
                        <li> <button class="btn button-icon button-icon-small icon-deactivated" title="Add to stop list" onClick='addToStopList(this, "${data.word}")'>Add to stop list</button> </li> </ul>`
            }
        </div>
    </li>`);
}

async function listWords() {
    toggleLoading();

    var stopList = analyzeStopList();
    var selectedTag = getSelectedTag();
    var stickies = await getStickies();
    wordCounts = [];
    /*
		wordCounts = [
			'word1': [
				tag1: [
					widgetId1: count1,
					widgetId2: count2,
					widgetId3: count3,
					...
				],
				...
			],
			...
		]
	*/

    if (selectedTag !== 'all') {
        // filter stickied by selectedTag
        stickies = stickies.filter((widget) => widget.tags.findIndex((tag) => tag.title == selectedTag) != -1);
    }

    for (widget of stickies) {
        var text = widget.plainText
            .replace(/[^A-Za-z0-9]/g, ' ')
            .toLowerCase()
            .replace(/\s\s+/g, ' '); // Replace special characters into space and replace multiple spaces into single space
        var words = text.split(' ');
        var tagNames = widget.tags.map((tag) => tag.title);

        for (word of words) {
            // Get word count in this widget
            if (stopList.indexOf(word) == -1) {
                // Check if the word in the stoplist
                if (!wordCounts[word]) {
                    wordCounts[word] = [];
                }
                if (!tagNames.length) {
                    tagNames = [NOTAG];
                }
                for (tag of tagNames) {
                    if (!wordCounts[word][tag]) {
                        wordCounts[word][tag] = [];
                    }

                    if (!wordCounts[word][tag][widget.id]) {
                        wordCounts[word][tag][widget.id] = 0;
                    }
                    wordCounts[word][tag][widget.id]++;
                }
            }
        }
    }

    $('#metismenu').html('');

    wordIndexes = getSortedWordsArrayIndex(wordCounts);

    for (word of wordIndexes) {
        var wordTags = wordCounts[word];
        var totalCount = getWordTotalCount(wordTags);
        var tagIndexes = getSortedWordTagArrayIndex(wordTags);
        var wordEle = menuItem({
            showName: word,
            word: word,
            tagName: null,
            stickyId: null,
            count: totalCount,
            type: 'word',
        });
        var tagWrapper = $('<ul></ul>');

        for (tag of tagIndexes) {
            var wordTagWords = wordTags[tag];
            var totalTagCount = getWordTagTotalCount(wordTagWords);
            var widgetIndexes = getSortedWordWidgetArrayIndex(wordTagWords);
            var tagEle = menuItem(
                {
                    showName: tag == NOTAG ? 'No Tag' : tag,
                    word: word,
                    tagName: tag,
                    stickyId: null,
                    count: totalTagCount,
                    type: 'tag',
                },
                true
            );
            var widgetWrapper = $('<ul></ul>');
            var count = 1;

            for (widgetId of widgetIndexes) {
                var wordCount = wordTagWords[widgetId];
                var widgetEle = menuItem(
                    {
                        showName: 'Sticky ' + count,
                        word: word,
                        tagName: tag,
                        stickyId: widgetId,
                        count: wordCount,
                        type: 'sticky',
                    },
                    true,
                    false
                );

                widgetWrapper.append(widgetEle);
                count++;
            }

            tagEle.append(widgetWrapper);
            tagWrapper.append(tagEle);
        }
        wordEle.append(tagWrapper);
        $('#metismenu').append(wordEle);
    }
    $('#metismenu').metisMenu('dispose');
    $('#metismenu').metisMenu();
    toggleLoading(false);
}

// Cluster in Count

function getWidgetIdsFromData(data) {
    widgetIds = [];

    toggleLoading(true);

    if (data.type == 'word') {
        tags = wordCounts[data.word];
        for (tagName in tags) {
            widgets = tags[tagName];
            newIds = Object.keys(widgets).filter((item) => {
                return widgetIds.indexOf(item) == -1;
            });
            widgetIds = widgetIds.concat(newIds);
        }
    } else if (data.type == 'tag') {
        widgets = wordCounts[data.word][data.tagName];

        widgetIds = Object.keys(widgets);
    } else {
        toggleLoading(false);
        return false;
    }
    toggleLoading(false);
    return widgetIds;
}

function getClusterDimensions(widgetCount, widgetWidth = defaultWidgetWidth, widgetHeight = defaultWidgetHeight, margin = defaultMargin) {
    const clusterDimension = Math.ceil(Math.sqrt(widgetCount)); // eg if length 22, 5*5
    const clusterWidth = widgetWidth * clusterDimension + margin * (clusterDimension - 1);
    const clusterHeight = widgetHeight * clusterDimension + margin * (clusterDimension - 1);
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
    let multiplier = 200;
    const margin = 30;
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

function isLocationOccupied(clusterLocationCandidate, widgetLocations, margin = 30) {
    const locationOccupied = widgetLocations.some((widgetLocation) => {
        return locationsIntersect(widgetLocation, clusterLocationCandidate, margin);
    });
    return locationOccupied;
}

function locationsIntersect(location1, location2, margin = 30) {
    const { startX: a_startX, startY: a_startY, endX: a_endX, endY: a_endY } = location1;
    const { startX: b_startX, startY: b_startY, endX: b_endX, endY: b_endY } = location2;
    const intersectX = a_startX + margin <= b_endX && b_startX + margin <= a_endX;
    const intersectY = a_startY + margin <= b_endY && b_startY + margin <= a_endY;
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
                x: cluster_startX + ((0.5 + j) * widgetWidth) + margin * j,
                y: cluster_startY + ((0.5 + i) * widgetHeight) + margin * i,
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

async function clusterWidgets(widgetIds, update = true) {
    if (widgetIds) {
        toggleLoading(true);

        var widgets = await getStickies();
        var widgetWidth = defaultWidgetWidth,
            widgetHeight = defaultWidgetHeight,
            margin = defaultMargin;
        var clusteringWidgets = widgets.filter((widget) => {
            widgetWidth = widget.bounds.width
            widgetHeight = widget.bounds.height
            return widgetIds.includes(widget.id);
        });
        var clusterDimensions = getClusterDimensions(clusteringWidgets.length, widgetWidth, widgetHeight, margin);
        var { clusterDimension } = clusterDimensions;
        var clusterLocation = getClusterLocation(widgets, clusterDimensions);
        let widgetLocations = getWidgetLocations(clusterLocation, clusterDimension, clusteringWidgets.length, widgetWidth, widgetHeight, margin);
        let newWidgets = [];

        if (update == true) {
            newWidgets = await miro.board.widgets.update(
                clusteringWidgets.map((widget, index) => {
                    return {
                        ...widget,
                        bounds: {
                            ...widget.bounds,
                            width: widgetWidth,
                            height: widgetHeight
                        },
                        x: widgetLocations[index].x,
                        y: widgetLocations[index].y,
                    };
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
                            height: widgetHeight
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

        toggleLoading(false);
        return newWidgets;
    }
}

function clusterItemsFromData(data) {
    clusterWidgets(getWidgetIdsFromData(data));
}

// Add a tag based on words
async function addTagSelectedItem(data) {
    toggleLoading(true);

    var widgetIds = getWidgetIdsFromData(data);

    if (widgetIds.length) {
        await miro.board.tags.create({
            color: randomColor(),
            title: data.word + (!data.tagName || data.tagName == NOTAG ? '' : data.word + '-' + data.tagName),
            widgetIds: widgetIds,
        });
    }

    toggleLoading(false);
    addTagSelectOptions();
    listWords();
}

// Add a tag based on words
async function duplicateSelection(data) {
    toggleLoading(true);
    var oldWidgetIds = getWidgetIdsFromData(data);
    var tags = await getTags();

    if (oldWidgetIds.length) {
        var newWidgets = await clusterWidgets(oldWidgetIds, false);

        tags.forEach((tag) => {
            oldWidgetIds.forEach((id, index) => {
                if (tag.widgetIds.indexOf(id) > -1) {
                    tag.widgetIds.push(newWidgets[index].id);
                }
            });
        });
        await miro.board.tags.update(tags);
    }
    toggleLoading(false);
    addTagSelectOptions();
    listWords();
}

function moreButtonClicked(e) {
    show = false;

    if ($(e).parent().children('.more-dropmenu').css('display') == 'none') {
        show = true;
    } else {
        show = false;
    }

    $('.more-dropmenu').hide();

    if (show) $(e).parent().children('.more-dropmenu').show();
    else $(e).parent().children('.more-dropmenu').hide();
}

$('#countWordApply').on('click', (e) => {
    listWords();
});
// Arrage tags exported from google sheet

async function loadTags() {
    widgets = await getStickies();

    for (widget of widgets) {
        var text = widget.text;
        var tags = widget.tags.map((tag) => tag.title);

        if (widget.metadata) {
            var metaIds = Object.keys(widget.metadata);

            if (metaIds.length) {
                // Check metaData to know tags are existed
                tags = [];
                metaIds.map((index) => {
                    if (widget.metadata[index].tag && widget.metadata[index].tag.tagName) {
                        tags.push(widget.metadata[index].tag.tagName);
                    }
                });

                splitArray = widget.text.split('Tag: ');
                if (splitArray.length > 1) {
                    splitArray.pop();
                    text = splitArray.join('Tag: '); // Split Tag: part from the text
                }
            }
        }

        registeredTags = await getTags(); // get existed tags in board

        for (tag of tags) {
            index = registeredTags.findIndex((item) => item.title == tag);

            if (index !== -1) {
                // If the tag is registered, update it. Unless, create a new tag.
                if (registeredTags[index].widgetIds.indexOf(widget.id) == -1) {
                    registeredTags[index].widgetIds.push(widget.id.toString());
                    await miro.board.tags.update(registeredTags[index]);
                }
            } else {
                await miro.board.tags.create({
                    color: randomColor(),
                    title: tag,
                    widgetIds: [widget.id],
                });
            }
        }

        widget.text = text;
        widget.tags = tags;
        delete widget.createdUserId;
        delete widget.lastModifiedUserId;
        delete widget.metadata;

        miro.board.widgets.update(widget);
    }
}
