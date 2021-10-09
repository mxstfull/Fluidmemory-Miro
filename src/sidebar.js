function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
function getStickies() {
    return miro.board.widgets.get({
        type: 'STICKER',
    });
}
function getTags() {
    return miro.board.tags.get();
}
function analyzeStopList() {
    var list = $('#stopList').val().replace(/\s/g, '').split(',');
    list.push('');
    return list;
}
function getSelectedTag() {
    return $('#tag-select').val();
}

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

function addTagSelectOptions() {
    getTags().then((tags) => {
        $('#tag-select').html('<option value="all"> All </option>');
        tags.forEach((tag) => {
            $('#tag-select').append(`<option value='${tag.title}'>${tag.title}</option>`);
        });
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

async function listWords() {
    var stopList = analyzeStopList();
    var selectedTag = getSelectedTag();
    var stickies = await getStickies();
    var tags = await getTags();
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
        var text = widget.plainText.replace(/[^A-Za-z0-9]/g, ' ').replace(/\s\s+/g, ' '); // Replace special characters into space and replace multiple spaces into single space
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
        var wordEle = $(`
			<li>
				<a href="#" class="has-arrow" aria-expanded="false">
					${word}
					<span class="item-badge">(${totalCount})</span>
				</a>
				<div class="action">
					<button class="btn button-icon button-icon-small icon-tile"></button>
					<button class="btn button-icon button-icon-small icon-pin"></button>
					<button class="btn button-icon button-icon-small icon-duplicate"></button>
					<button class="btn button-icon button-icon-small icon-more"></button>
				</div>
			</li>`);
        var tagWrapper = $('<ul></ul>');

        for (tag of tagIndexes) {
            var wordTagWords = wordTags[tag];
            var totalTagCount = getWordTagTotalCount(wordTagWords);
            var widgetIndexes = getSortedWordWidgetArrayIndex(wordTagWords);
            var tagEle = $(`
				<li>
					<a href="#" class="has-arrow" aria-expanded="false">
						${tag}
						<span class="item-badge">(${totalTagCount})</span>
					</a>
					<div class="action">
						<button class="btn button-icon button-icon-small icon-tile"></button>
						<button class="btn button-icon button-icon-small icon-duplicate"></button>
						<button class="btn button-icon button-icon-small icon-pin"></button>
						<button class="btn button-icon button-icon-small icon-more"></button>
					</div>
				</li>`);
            var widgetWrapper = $('<ul></ul>');
            var count = 1;

            for (widgetId of widgetIndexes) {
                var wordCount = wordTagWords[widgetId];
                var widgetEle = $(`
					<li>
						<a href="#">
							Sticky ${count}
							<span class="item-badge">(${wordCount})</span>
						</a>
						<div class="action">
							<button class="btn button-icon button-icon-small icon-tile"></button>
							<button class="btn button-icon button-icon-small icon-duplicate"></button>
							<button class="btn button-icon button-icon-small icon-pin"></button>
							<button class="btn button-icon button-icon-small icon-more"></button>
						</div>
					</li>`);
                widgetWrapper.append(widgetEle);
                count++;
            }

            tagEle.append(widgetWrapper);
            tagWrapper.append(tagEle);
        }
        wordEle.append(tagWrapper);
        $('#metismenu').append(wordEle);
    }
    $('#metismenu').metisMenu();
}

miro.onReady(() => {
    // miro.addListener('SELECTION_UPDATED', (e) => {
    //     showStatistics(e.data);
    // });
    // miro.board.selection.get().then(showStatistics);

    loadTags().then(() => {
        addTagSelectOptions();
    });
});

$('[data-tabbtn]').on('click', (e) => {
    tabId = $(e.currentTarget).attr('data-tabbtn');
    $('.tab-panel').removeClass('active');
    $(`#${tabId}`).addClass('active');
    $('[data-tabbtn]').removeClass('tab-active');
    $(e.currentTarget).addClass('tab-active');
});

$('#countWordApply').on('click', (e) => {
    listWords();
});
