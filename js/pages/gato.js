// --- JAVASCRIPT LOGIC ---
const initialSearchArea = document.getElementById('initial-search-area');
const searchFormCentral = document.getElementById('search-form-central');
const searchInputCentral = document.getElementById('search-input-central');
const searchHistoryCentral = document.getElementById('search-history-central');
const autocompleteSuggestionsCentral = document.getElementById('autocomplete-suggestions-central');

const mainHeader = document.getElementById('main-header');
const searchFormHeader = document.getElementById('search-form-header');
const searchInputHeader = document.getElementById('search-input-header');
const searchHistoryHeader = document.getElementById('search-history-header');
const autocompleteSuggestionsHeader = document.getElementById('autocomplete-suggestions-header');

const aiDjForm = document.getElementById('ai-dj-form');
const aiDjInput = document.getElementById('ai-dj-input');

const mainContent = document.getElementById('main-content');
const resultsContainer = document.getElementById('results-container');
const playerContainer = document.getElementById('player-container');
const videoDetailsContainer = document.getElementById('video-details-container');
const videoTitleDisplay = document.getElementById('video-title-display');
const videoChannelDisplay = document.getElementById('video-channel-display');
const videoStatsDisplay = document.getElementById('video-stats-display');
const videoPublishedDisplay = document.getElementById('video-published-display');

// Constants for localStorage
const SEARCH_HISTORY_KEY = 'gatoSearchHistory';
const MAX_SEARCH_HISTORY = 5; // Limit the number of stored searches

// ⚠️ WARNING: THIS KEY IS PUBLICLY EXPOSED. ONLY USE FOR LOCAL TESTING.
const API_KEY = "AIzaSyC4F_RXjIYigh5aN-crA5cq75GFweNbjNA";
const BASE_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_BASE_URL = "https://www.googleapis.com/youtube/v3/videos";

// --- ANIMATION / MODERN JAVASCRIPT ---
// Add focus class to search form for visual effect
searchInputCentral.addEventListener('focus', () => {
    searchFormCentral.classList.add('focused');
    renderSearchHistory(loadSearchHistory(), searchHistoryCentral, searchInputCentral);
    searchHistoryCentral.classList.remove('hidden');
});
searchInputCentral.addEventListener('blur', () => {
    searchFormCentral.classList.remove('focused');
    // Delay hiding to allow click on history items
    setTimeout(() => {
        searchHistoryCentral.classList.add('hidden');
        autocompleteSuggestionsCentral.classList.add('hidden');
    }, 100);
});
searchInputCentral.addEventListener('input', () => {
    const query = searchInputCentral.value.trim();
    if (query.length > 0) {
        const suggestions = loadSearchHistory().filter(item => item.toLowerCase().includes(query.toLowerCase()));
        renderAutocompleteSuggestions(suggestions, autocompleteSuggestionsCentral, searchInputCentral, true);
        searchHistoryCentral.classList.add('hidden'); // Hide history when typing for autocomplete
    } else {
        autocompleteSuggestionsCentral.classList.add('hidden');
        renderSearchHistory(loadSearchHistory(), searchHistoryCentral, searchInputCentral); // Show history again if input is cleared
    }
});

searchInputHeader.addEventListener('focus', () => {
    searchFormHeader.classList.add('focused');
    renderSearchHistory(loadSearchHistory(), searchHistoryHeader, searchInputHeader);
    searchHistoryHeader.classList.remove('hidden');
});
searchInputHeader.addEventListener('blur', () => {
    searchFormHeader.classList.remove('focused');
    // Delay hiding to allow click on history items
    setTimeout(() => {
        searchHistoryHeader.classList.add('hidden');
        autocompleteSuggestionsHeader.classList.add('hidden');
    }, 100);
});
searchInputHeader.addEventListener('input', () => {
    const query = searchInputHeader.value.trim();
    if (query.length > 0) {
        const suggestions = loadSearchHistory().filter(item => item.toLowerCase().includes(query.toLowerCase()));
        renderAutocompleteSuggestions(suggestions, autocompleteSuggestionsHeader, searchInputHeader, false);
        searchHistoryHeader.classList.add('hidden'); // Hide history when typing for autocomplete
    } else {
        autocompleteSuggestionsHeader.classList.add('hidden');
        renderSearchHistory(loadSearchHistory(), searchHistoryHeader, searchInputHeader); // Show history again if input is cleared
    }
});

/**
 * Saves a search query to localStorage.
 * @param {string} query - The search query to save.
 */
function saveSearchQuery(query) {
    let history = loadSearchHistory();
    // Remove duplicate if exists
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    // Add new query to the beginning
    history.unshift(query);
    // Trim history to max size
    history = history.slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Loads search history from localStorage.
 * @returns {Array<string>} An array of search queries.
 */
function loadSearchHistory() {
    const historyJson = localStorage.getItem(SEARCH_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
}

/**
 * Renders the search history into a given element.
 * @param {Array<string>} history - The array of search queries.
 * @param {HTMLElement} targetElement - The DOM element to render the history into.
 * @param {HTMLElement} inputElement - The associated search input element.
 */
function renderSearchHistory(history, targetElement, inputElement) {
    targetElement.innerHTML = '';
    if (history.length === 0) {
        targetElement.classList.add('hidden');
        return;
    }

    const ul = document.createElement('ul');
    history.forEach(query => {
        const li = document.createElement('li');
        li.textContent = query;
        li.addEventListener('mousedown', (event) => { // Use mousedown to prevent blur event from firing first
            event.preventDefault(); // Prevent input from losing focus immediately
            inputElement.value = query;
            handleSearch(query, targetElement === searchHistoryCentral);
            targetElement.classList.add('hidden');
        });
        ul.appendChild(li);
    });
    targetElement.appendChild(ul);
    targetElement.classList.remove('hidden');
}

/**
 * Renders autocomplete suggestions into a given element.
 * @param {Array<string>} suggestions - The array of autocomplete suggestions.
 * @param {HTMLElement} targetElement - The DOM element to render suggestions into.
 * @param {HTMLElement} inputElement - The associated search input element.
 * @param {boolean} isCentral - True if the suggestions are for the central form.
 */
function renderAutocompleteSuggestions(suggestions, targetElement, inputElement, isCentral) {
    targetElement.innerHTML = '';
    if (suggestions.length === 0) {
        targetElement.classList.add('hidden');
        return;
    }

    const ul = document.createElement('ul');
    suggestions.forEach(query => {
        const li = document.createElement('li');
        li.textContent = query;
        li.addEventListener('mousedown', (event) => {
            event.preventDefault();
            inputElement.value = query;
            handleSearch(query, isCentral);
            targetElement.classList.add('hidden');
        });
        ul.appendChild(li);
    });
    targetElement.appendChild(ul);
    targetElement.classList.remove('hidden');
}

/**
 * Clears the player and sets the new video.
 * @param {Object} video - The video object containing id, title, channelTitle, viewCount, likeCount, publishedAt.
 */
function embedVideo(video) {
    const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', embedUrl);
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'true');

    playerContainer.innerHTML = '';
    playerContainer.appendChild(iframe);

    // Update video details display
    videoTitleDisplay.textContent = video.title;
    videoChannelDisplay.textContent = `Channel: ${video.channelTitle}`;
    videoStatsDisplay.textContent = `Views: ${parseInt(video.viewCount).toLocaleString()} | Likes: ${parseInt(video.likeCount).toLocaleString()}`;
    videoPublishedDisplay.textContent = `Published: ${new Date(video.publishedAt).toLocaleDateString()}`;
    videoDetailsContainer.classList.remove('hidden');
}

/**
 * Renders the search results from the live YouTube API data.
 * @param {Array<Object>} results - An array of video objects.
 */
function renderResults(results) {
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="message">No results found. Please try a different query.</p>';
        videoDetailsContainer.classList.add('hidden'); // Hide details if no results
        playerContainer.innerHTML = '<p>INITIATE SEARCH PROTOCOL.<br>LOCATING VISUAL DATA STREAM...</p>';
        return;
    }

    results.forEach(video => {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('video-result');

        // YouTube thumbnail URL
        const thumbnailUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

        resultDiv.onclick = () => embedVideo(video); // Pass the full video object

        resultDiv.innerHTML = `
            <div class="video-thumbnail-wrapper">
                <img src="${thumbnailUrl}" alt="${video.title} thumbnail" class="video-thumbnail">
            </div>
            <div class="video-info">
                <p class="video-title">${video.title}</p>
                <p class="video-description">${video.description}</p>
            </div>
        `;
        resultsContainer.appendChild(resultDiv);
    });
}

/**
 * Handles the search form submission, fetching data from the live YouTube API.
 * @param {string} query - The search query.
 * @param {boolean} isInitialSearch - True if the search is from the central form.
 */
async function handleSearch(query, isInitialSearch = false) {
    if (!query) return;

    if (isInitialSearch) {
        initialSearchArea.classList.add('hidden');
        mainHeader.classList.remove('hidden');
        searchFormHeader.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        searchInputHeader.value = query;
    }

    resultsContainer.innerHTML = '<div class="loading-spinner"></div><p class="message">Loading search results...</p>';
    videoDetailsContainer.classList.add('hidden'); // Hide details while loading

    const encodedQuery = encodeURIComponent(query);
    const searchApiUrl = `${BASE_URL}?part=snippet&q=${encodedQuery}&key=${API_KEY}&type=video&maxResults=10&videoEmbeddable=true`;

    try {
        const searchResponse = await fetch(searchApiUrl);
        if (!searchResponse.ok) {
            if (searchResponse.status === 403) {
                throw new Error("API Forbidden (403). Check your API Key usage limits and restrictions.");
            }
            throw new Error(`HTTP error! Status: ${searchResponse.status}`);
        }
        const searchData = await searchResponse.json();

        const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean);

        let detailedResults = [];
        if (videoIds.length > 0) {
            const videoApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
            const videoResponse = await fetch(videoApiUrl);
            if (!videoResponse.ok) {
                throw new Error(`HTTP error fetching video details! Status: ${videoResponse.status}`);
            }
            const videoData = await videoResponse.json();

            detailedResults = searchData.items.map(searchItem => {
                const videoDetail = videoData.items.find(detailItem => detailItem.id === searchItem.id.videoId);
                return {
                    id: searchItem.id.videoId,
                    title: searchItem.snippet.title,
                    description: searchItem.snippet.description,
                    channelTitle: searchItem.snippet.channelTitle,
                    publishedAt: searchItem.snippet.publishedAt,
                    viewCount: videoDetail?.statistics?.viewCount || 'N/A',
                    likeCount: videoDetail?.statistics?.likeCount || 'N/A',
                    duration: videoDetail?.contentDetails?.duration || 'N/A'
                };
            });
        }

        renderResults(detailedResults);
        saveSearchQuery(query); // Save query after successful search
        // Update history display after a new search
        renderSearchHistory(loadSearchHistory(), searchHistoryCentral, searchInputCentral);
        renderSearchHistory(loadSearchHistory(), searchHistoryHeader, searchInputHeader);

        // Hide search history and autocomplete suggestions after a search
        searchHistoryCentral.classList.add('hidden');
        searchHistoryHeader.classList.add('hidden');
        autocompleteSuggestionsCentral.classList.add('hidden');
        autocompleteSuggestionsHeader.classList.add('hidden');
    } catch (error) {
        console.error("Error fetching data:", error);
        resultsContainer.innerHTML = `<p class="message" style="color: var(--youtube-red);">Error: ${error.message || 'Could not fetch results. Check console for details.'}</p>`;
        playerContainer.innerHTML = `<p>Search Failed</p>`;
        videoDetailsContainer.classList.add('hidden'); // Hide details on error
    }
}

searchFormCentral.addEventListener('submit', function(event) {
    event.preventDefault();
    const query = searchInputCentral.value.trim();
    handleSearch(query, true);
});

searchFormHeader.addEventListener('submit', function(event) {
    event.preventDefault();
    const query = searchInputHeader.value.trim();
    handleSearch(query, false);
});

// --- AI DJ Logic ---
aiDjForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const prompt = aiDjInput.value.trim();
    if (!prompt) return;

    // Transition to main content view
    initialSearchArea.classList.add('hidden');
    mainHeader.classList.remove('hidden');
    searchFormHeader.classList.remove('hidden');
    mainContent.classList.remove('hidden');

    resultsContainer.innerHTML = '<div class="loading-spinner"></div><p class="message" style="color: #ff007f;">AI DJ is curating your playlist...</p>';
    videoDetailsContainer.classList.add('hidden');

    try {
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'dj',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) throw new Error("AI DJ request failed");

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Ensure we parse ONLY the JSON array (in case AI adds text despite instructions)
        const jsonMatch = content.match(/\[.*\]/s);
        if (!jsonMatch) throw new Error("Invalid response from AI DJ");
        
        const videoIds = JSON.parse(jsonMatch[0]);

        if (videoIds.length === 0) {
            throw new Error("AI found no videos.");
        }

        let detailedResults = [];

        try {
            // Attempt to fetch video details
            const videoApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
            const videoResponse = await fetch(videoApiUrl);
            
            if (!videoResponse.ok) {
                throw new Error(`YouTube API Error: ${videoResponse.status}`);
            }
            
            const videoData = await videoResponse.json();
            detailedResults = videoData.items.map(video => ({
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                viewCount: video.statistics?.viewCount || 'N/A',
                likeCount: video.statistics?.likeCount || 'N/A',
                duration: video.contentDetails?.duration || 'N/A'
            }));

        } catch (apiError) {
            console.warn("YouTube Metadata Fetch Failed (likely quota exceeded), using fallback:", apiError);
            
            // Fallback: Create playable objects using just the IDs
            detailedResults = videoIds.map(id => ({
                id: id,
                title: "AI Suggested Track",
                description: "Video metadata unavailable due to API limits. Click to play.",
                channelTitle: "AI DJ",
                publishedAt: new Date().toISOString(),
                viewCount: '-',
                likeCount: '-',
                duration: '-'
            }));

            // Optional: Notify user visually about the limited mode
            const warningMsg = document.createElement('div');
            warningMsg.style.color = '#ffcc00';
            warningMsg.style.textAlign = 'center';
            warningMsg.style.marginBottom = '10px';
            warningMsg.innerHTML = '<small>⚠ metadata limit reached - playing in fallback mode</small>';
            resultsContainer.appendChild(warningMsg);
        }

        renderResults(detailedResults);
        
        // Automatically play the first one
        if (detailedResults.length > 0) {
            embedVideo(detailedResults[0]);
        }

    } catch (error) {
        console.error("AI DJ Error:", error);
        resultsContainer.innerHTML = `<p class="message" style="color: #ff007f;">AI DJ Malfunction: ${error.message}</p>`;
    }
});