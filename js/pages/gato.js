// --- JAVASCRIPT LOGIC ---
const initialSearchArea = document.getElementById('initial-search-area');
const searchFormCentral = document.getElementById('search-form-central');
const searchInputCentral = document.getElementById('search-input-central');

const mainHeader = document.getElementById('main-header');
const searchFormHeader = document.getElementById('search-form-header');
const searchInputHeader = document.getElementById('search-input-header');

const mainContent = document.getElementById('main-content');
const resultsContainer = document.getElementById('results-container');
const playerContainer = document.getElementById('player-container');

// ⚠️ WARNING: THIS KEY IS PUBLICLY EXPOSED. ONLY USE FOR LOCAL TESTING.
const API_KEY = "AIzaSyC4F_RXjIYigh5aN-crA5cq75GFweNbjNA";
const BASE_URL = "https://www.googleapis.com/youtube/v3/search";

// --- ANIMATION / MODERN JAVASCRIPT ---
// Add focus class to search form for visual effect
searchInputCentral.addEventListener('focus', () => {
    searchFormCentral.classList.add('focused');
});
searchInputCentral.addEventListener('blur', () => {
    searchFormCentral.classList.remove('focused');
});

searchInputHeader.addEventListener('focus', () => {
    searchFormHeader.classList.add('focused');
});
searchInputHeader.addEventListener('blur', () => {
    searchFormHeader.classList.remove('focused');
});

/**
 * Clears the player and sets the new video ID.
 * @param {string} videoId - The YouTube video ID.
 */
function embedVideo(videoId) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', embedUrl);
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'true');

    playerContainer.innerHTML = '';
    playerContainer.appendChild(iframe);
}

/**
 * Renders the search results from the live YouTube API data.
 * @param {Array<Object>} results - An array of video objects.
 */
function renderResults(results) {
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="message">No results found. Please try a different query.</p>';
        playerContainer.innerHTML = '<p>No video selected.</p>';
        return;
    }

    results.forEach(video => {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('video-result');

        // YouTube thumbnail URL
        const thumbnailUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

        resultDiv.onclick = () => embedVideo(video.id);

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

    // Automatically embed the first result
    if (results.length > 0) {
        embedVideo(results[0].id);
    }
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

    resultsContainer.innerHTML = '<p class="message">Loading search results...</p>';

    // Encode the query for URL safety
    const encodedQuery = encodeURIComponent(query);

    const API_URL = `${BASE_URL}?part=snippet&q=${encodedQuery}&key=${API_KEY}&type=video&maxResults=10&videoEmbeddable=true`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("API Forbidden (403). Check your API Key usage limits and restrictions.");
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const results = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description
        }));
        renderResults(results);
    } catch (error) {
        console.error("Error fetching data:", error);
        resultsContainer.innerHTML = `<p class="message" style="color: var(--youtube-red);">Error: ${error.message || 'Could not fetch results. Check console for details.'}</p>`;
        playerContainer.innerHTML = `<p>Search Failed</p>`;
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