
var wordCounts;
var NOTAG = '!-----!';
var defaultStopList;

$.getJSON('src/nltk_stoplist.json', (data) => {
    defaultStopList = data;
    $('#stopList').val(defaultStopList.join(', '));
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

function loadTagSelectOptions() {
    toggleLoading();
    getTags().then((tags) => {
        $('#tag-select').html('<option value="all"> All </option>');
        tags.forEach((tag) => {
            if (tag.title.toLowerCase() != 'copy')
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
    var duplicated = [];

    for (tagName in wordTags) {
        for (widgetId in wordTags[tagName]) {
            if (!duplicated[widgetId]) {
                sum += wordTags[tagName][widgetId];
                duplicated[widgetId] = true;
            }
        }
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
        <a href="#" ${expandable ? 'class="has-arrow" aria-expanded="false"' : ''} onClick='selectWidgets(${JSON.stringify(data)})'>
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

    stickies = filterCopies(stickies);

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

function clusterItemsFromData(data) {
    clusterWidgets(getWidgetIdsFromData(data));
}

async function selectWidgets(data) {
    var widgetIds = getWidgetIdsFromData(data);
    var stickies = await getStickies();

    if (widgetIds.length) {
        await miro.board.selection.selectWidgets(widgetIds);
    }
    
    await focusOnWidgets(stickies.filter(sticky => widgetIds.includes(sticky.id)));
}

// Add a tag based on words
async function addTagSelectedItem(data) {
    toggleLoading(true);

    var widgetIds = getWidgetIdsFromData(data);

    if (widgetIds.length) {
        await miro.board.metadata.update({
            [appId]: {
                focusedTagName: data.word + (!data.tagName || data.tagName == NOTAG ? '' : data.word + '-' + data.tagName),
            },
        });
        miro.board.ui.openModal('setTagNameModal.html', { width: 400, height: 300 }).then(() => {
            miro.board.metadata.get().then(async (metadata) => {
                if (metadata[appId].focusedTagName) {
                    await miro.board.tags.create({
                        color: randomColor(),
                        title: metadata[appId].focusedTagName,
                        widgetIds: widgetIds,
                    });

                    loadTagSelectOptions();
                    listWords();
                }
                toggleLoading(false);
            });
        });
    }
}

// Add a tag based on words
async function duplicateSelection(data) {
    toggleLoading(true);
    var oldWidgetIds = getWidgetIdsFromData(data);

    if (oldWidgetIds.length) {
        await clusterWidgets(oldWidgetIds, false);
    }
    toggleLoading(false);
    loadTagSelectOptions();
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

async function createStickyNote() {
    debugger
    await miro.board.widgets.create({
          type: 'sticker',
          text: "asefiasfi osaenfoiasen fiosenfoi",
          x: 200,
          y: 200,
          width: 300,
          height: 300,
        },
      )
}

$("#paste-extension").on('click', (e) => {
    createStickyNote()
})
// Arrage tags exported from google sheet
