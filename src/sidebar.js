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
function getTags() {
    return miro.board.tags.get();
}

function toggleLoading(show = true) {
    $('.loading-wrapper').css({ visibility: show ? 'visible' : '' });
}

//////////////// Count Tab ///////////////////////

function analyzeStopList() {
    var list = $('#stopList').val().toLowerCase().replace(/\s/g, '').split(',');
    list.push('');
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
            <span class="word-name">${data.showName}</span>
            <span class="item-badge">(${data.count})</span>
        </a>
        <div class="action">
            ${
                !shorten
                    ? `<button class="btn button-icon button-icon-small icon-tile" title="Cluster"></button><button class="btn button-icon button-icon-small icon-pin" title="Add a Tag"></button><button class="btn button-icon button-icon-small icon-duplicate" title="Duplicate"></button><button class="btn button-icon button-icon-small icon-more" onClick="moreButtonClicked(this)" title="More"></button>`
                    : `<button class="btn button-icon button-icon-small icon-tile" title="Cluster"></button><button class="btn button-icon button-icon-small icon-pin" title="Add a Tag"></button><button class="btn button-icon button-icon-small icon-more" onClick="moreButtonClicked(this)" title="More"></button>`
            }
            ${
                !shorten
                    ? `<ul class="more-dropmenu"> <li> <button class="btn button-icon button-icon-small icon-deactivated" title="Add to stop list" onClick='addToStopList(this, "${data.word}")'> Add to stop list</button> </li> </ul>`
                    : `<ul class="more-dropmenu"> <li><button class="btn button-icon button-icon-small icon-duplicate" title="Duplicate">Duplicate</li> <li> <button class="btn button-icon button-icon-small icon-deactivated" title="Add to stop list" onClick='addToStopList(this, "${data.word}")'>Add to stop list</button> </li> </ul>`
            }
        </div>
    </li>`);
}

async function listWords() {
    toggleLoading();

    var stopList = analyzeStopList();
    var selectedTag = getSelectedTag();
    var stickies = await getStickies();
    var wordCounts = [];
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
                    showName: tag,
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

function moreButtonClicked(e) {
    show = false;
    
    if ($(e).parent().children('.more-dropmenu').css('display') == 'none') {
        show = true;
    } else {
        show = false;
    }

    $('.more-dropmenu').hide();

    if (show)
        $(e).parent().children('.more-dropmenu').hide();
    else
        $(e).parent().children('.more-dropmenu').show();
}

$('#countWordApply').on('click', (e) => {
    listWords();
});
