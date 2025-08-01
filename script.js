// SECTION 1: FIREBASE SETUP & AUTHENTICATION

// Import the functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

//  web app's Firebase configuration
 const firebaseConfig = {
    apiKey: "AIzaSyDc9rswaBpu-980og63L7v2-z8CCXj3-lE",
    authDomain: "moviepicks-project.firebaseapp.com",
    projectId: "moviepicks-project",
    storageBucket: "moviepicks-project.appspot.com",
    messagingSenderId: "941362009005",
    appId: "1:941362009005:web:d4c1997792838671b20724",
    measurementId: "G-JV4RCT5TZH"
  };

// Initialize Firebase 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables 
let userWatchlist = [];
let currentRating = 0;
let currentMovieReviews = [];
let currentPages = {};
let currentFilter = { endpoint: null, page: 1 };

// Custom Notification Function
const notification = document.getElementById('notification');
let notificationTimeout;
function showNotification(message, type = 'success') {
    if (!notification) return;
    clearTimeout(notificationTimeout);
    notification.textContent = message;
    notification.className = type;
    notification.classList.add('show');
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

//  Login & Signup Page Logic 
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                showNotification('Sign up successful!');
                setTimeout(() => window.location.href = 'index.html', 1000);
            })
            .catch(error => showNotification(`Error: ${error.message}`, 'error'));
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                showNotification('Login successful!');
                setTimeout(() => window.location.href = 'index.html', 1000);
            })
            .catch(error => showNotification(`Error: ${error.message}`, 'error'));
    });
}

const googleBtn = document.getElementById('google-signin-btn');
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(result => {
                showNotification('Google sign in successful!');
                setTimeout(() => window.location.href = 'index.html', 1000);
            })
            .catch(error => showNotification(`Error: ${error.message}`, 'error'));
    });
}

// --- Manage Login State Across All Pages ---
onAuthStateChanged(auth, async (user) => {
    const loginButtons = document.querySelectorAll('.login-btn');
    const recommendationSection = document.getElementById('recommendation-engine-section');

    if (user) {
      
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        userWatchlist = (docSnap.exists() && docSnap.data().watchlist) ? docSnap.data().watchlist : [];
        
        
        loadPersonalizedRecommendations();

        loginButtons.forEach(button => {
            button.textContent = 'Sign Out';
            button.onclick = () => signOut(auth).then(() => showNotification('Signed out.'));
        });
    } else {
     
        userWatchlist = [];
        if (recommendationSection) {
            recommendationSection.classList.add('hidden');
        }
        loginButtons.forEach(button => {
            button.textContent = 'Sign In';
            button.onclick = () => window.location.href = 'login.html';
        });
    }
});

// SECTION 2: MOVIE Browse & API LOGIC


// --- API Configuration ---
const API_KEY = '2fdc6fe64a5b4fe596a082980edf0487';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Element Selectors
const main = document.querySelector('main');
const searchInput = document.getElementById('search-input');
const detailsModal = document.getElementById('movie-modal');
const trailerModal = document.getElementById('trailer-modal');
const myListGrid = document.querySelector('#my-list-grid');
const recommendationsGrid = document.querySelector('#recommendations-grid');
const forYouGrid = document.querySelector('#for-you-grid');
const actionGrid = document.querySelector('#action-grid');
const comedyGrid = document.querySelector('#comedy-grid');
const romanceGrid = document.querySelector('#romance-grid');
const horrorGrid = document.querySelector('#horror-grid');
const thrillerGrid = document.querySelector('#thriller-grid');
const dramaGrid = document.querySelector('#drama-grid');
const searchResultsGrid = document.querySelector('#search-results-grid');
const searchResultsSection = document.querySelector('#search-results-section');
const genreSections = document.querySelector('#genre-sections');

// --- "Ratings & Reviews" Functions ---
function displayReviews(reviews = []) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    reviewsContainer.innerHTML = '';
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p>No reviews yet. Be the first!</p>';
        return;
    }

    const currentUser = auth.currentUser;
    currentMovieReviews = reviews.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());

    let reviewsHTML = '';
    currentMovieReviews.forEach((review, index) => {
        const deleteButtonHTML = (currentUser && review.userId === currentUser.uid) 
            ? `<button class="delete-review-btn" data-index="${index}">Delete</button>` 
            : '';

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<span>${i <= review.rating ? '★' : '☆'}</span>`;
        }

        reviewsHTML += `
            <div class="review-item">
                <div class="review-author">
                    <div>
                        <span class="author-name">${review.userName || 'Anonymous'}</span>
                        <span class="review-stars">${starsHTML}</span>
                    </div>
                    ${deleteButtonHTML}
                </div>
                <p class="review-text">${review.reviewText}</p>
            </div>
        `;
    });
    reviewsContainer.innerHTML = reviewsHTML;
}



async function loadPersonalizedRecommendations() {
    const recommendationSection = document.getElementById('recommendation-engine-section');
    const recommendationTitle = document.getElementById('recommendation-title');
    const recommendationGrid = document.getElementById('recommendation-engine-grid');
    const loadMoreBtn = document.getElementById('recs-load-more-btn'); // Find the new button

    if (!auth.currentUser || !recommendationSection) return;

    recommendationSection.classList.add('hidden');
    loadMoreBtn.classList.add('hidden');

    if (userWatchlist && userWatchlist.length > 0) {
        const seedMovieId = userWatchlist[Math.floor(Math.random() * userWatchlist.length)];
        
        const [seedMovieDetails, recommendationsData] = await Promise.all([
            fetchApi(`/movie/${seedMovieId}`),
            fetchApi(`/movie/${seedMovieId}/recommendations`)
        ]);

        if (seedMovieDetails && recommendationsData?.results?.length > 0) {
            const endpoint = `/movie/${seedMovieId}/recommendations`;
            loadMoreBtn.dataset.endpoint = endpoint;
            currentPages[endpoint] = 1;

            recommendationTitle.textContent = `Because you liked ${seedMovieDetails.title}`;
            displayMovies(recommendationsData.results, recommendationGrid);
            
            recommendationSection.classList.remove('hidden');
            loadMoreBtn.classList.remove('hidden');
}
    }
}


async function loadAndDisplayReviews(movieId) {
    try {
        const reviewDocRef = doc(db, "reviews", String(movieId));
        const docSnap = await getDoc(reviewDocRef);
        if (docSnap.exists() && docSnap.data().ratingsAndReviews) {
            displayReviews(docSnap.data().ratingsAndReviews);
        } else {
            displayReviews([]);
        }
    } catch (error) {
        console.error("Error loading reviews:", error);
        displayReviews([]);
    }
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) { showNotification("Please sign in to leave a review.", 'error'); return; }
    
    const movieDetailsContent = document.querySelector('.movie-details-content');
    const movieId = movieDetailsContent ? movieDetailsContent.dataset.id : null;
    if (!movieId) return;

    const reviewText = document.getElementById('review-text').value;
    if (currentRating === 0) { showNotification("Please select a star rating.", 'error'); return; }

    const reviewData = { userId: user.uid, userName: user.displayName || user.email.split('@')[0], rating: currentRating, reviewText: reviewText, timestamp: new Date() };
    
    try {
        const reviewDocRef = doc(db, "reviews", String(movieId));
        await setDoc(reviewDocRef, { ratingsAndReviews: arrayUnion(reviewData) }, { merge: true });
        showNotification("Review submitted successfully!");
        document.getElementById('review-form').reset();
        resetStars();
        loadAndDisplayReviews(movieId);
    } catch (error) {
        console.error("Error submitting review:", error);
        showNotification("Failed to submit review.", 'error');
    }
}

function resetStars() {
    currentRating = 0;
    const allStars = document.querySelectorAll('.star-rating .star');
    allStars.forEach(star => star.classList.remove('selected', 'hovered'));
}

async function handleDeleteReview(movieId, reviewToDelete) {
    if (!auth.currentUser) return;
    try {
        const reviewDocRef = doc(db, "reviews", String(movieId));
        await updateDoc(reviewDocRef, { ratingsAndReviews: arrayRemove(reviewToDelete) });
        showNotification("Review deleted successfully!");
        loadAndDisplayReviews(movieId);
    } catch (error) {
        console.error("Error deleting review: ", error);
        showNotification("Could not delete review.", 'error');
    }
}

function initializeStarRating() {
    const starsOnPage = document.querySelectorAll('.star-rating .star');
    starsOnPage.forEach(star => {
        star.addEventListener('mouseover', () => { const value = star.dataset.value; starsOnPage.forEach(s => s.classList.toggle('hovered', s.dataset.value <= value)); });
        star.addEventListener('mouseout', () => { starsOnPage.forEach(s => s.classList.remove('hovered')); });
        star.addEventListener('click', () => { currentRating = star.dataset.value; starsOnPage.forEach(s => s.classList.toggle('selected', s.dataset.value <= currentRating)); });
    });
}

// --- "My List" Database Functions ---
async function addToMyList(movieId) {
    const user = auth.currentUser;
    if (!user) { showNotification("Please sign in to add movies to your list.", 'error'); setTimeout(() => window.location.href = 'login.html', 1500); return; }
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { watchlist: arrayUnion(String(movieId)) });
        showNotification("Added to your list!");
        userWatchlist.push(String(movieId));
    } catch (error) {
        if (error.code === 'not-found') {
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, { watchlist: [String(movieId)] });
            showNotification("Added to your list!");
            userWatchlist.push(String(movieId));
        } else {
            showNotification("Could not add to your list.", 'error');
        }
    }
}

async function removeFromMyList(movieId) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { watchlist: arrayRemove(String(movieId)) });
        showNotification("Removed from your list!");
        userWatchlist = userWatchlist.filter(id => id !== String(movieId));
        if (myListGrid) { loadMyList(); }
    } catch (error) {
        console.error("Error removing from list: ", error);
        showNotification("Could not remove from your list.", 'error');
    }
}

async function loadMyList() {
    const user = auth.currentUser;
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().watchlist && docSnap.data().watchlist.length > 0) {
            const watchlistIds = docSnap.data().watchlist;
            const moviePromises = watchlistIds.map(id => fetchApi(`/movie/${id}`));
            const movies = await Promise.all(moviePromises);
            displayMovies(movies.filter(Boolean), myListGrid);
        } else {
            if(myListGrid) myListGrid.innerHTML = "<h3>Your list is empty. Add some movies!</h3>";
        }
    } else {
        if(myListGrid) myListGrid.innerHTML = "<h3>Please <a href='login.html'>Sign In</a> to view your list.</h3>";
    }
}

// --- General API & Display Functions ---
async function fetchApi(endpoint) { const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`; try { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json(); } catch (error) { console.error('API fetch error:', error); return null; } }
function displaySkeletons(container) { if (!container) return; container.innerHTML = ''; for (let i = 0; i < 10; i++) { container.innerHTML += `<div class="movie-card skeleton-card"></div>`; } }
function displayMovies(movies, container, append = false) { if (!container) return; if (!append) { container.innerHTML = ''; } movies.forEach(movie => { if (movie && movie.poster_path) { const isInWatchlist = userWatchlist.includes(String(movie.id)); const buttonIcon = isInWatchlist ? '✓' : '+'; const buttonClass = isInWatchlist ? 'quick-add-btn added' : 'quick-add-btn'; const movieCardHTML = `<div class="movie-card" data-id="${movie.id}"><button class="${buttonClass}" data-id="${movie.id}">${buttonIcon}</button><img src="${IMG_URL}${movie.poster_path}" alt="${movie.title}"></div>`; container.innerHTML += movieCardHTML; } }); }
async function loadMovies(endpoint, container, page = 1) { if (!container) return; if (page === 1) { displaySkeletons(container); await new Promise(resolve => setTimeout(resolve, 0)); } const endpointWithPage = `${endpoint}${endpoint.includes('?') ? '' : '?'}&page=${page}`; const data = await fetchApi(endpointWithPage); if (data && data.results) { displayMovies(data.results, container, page > 1); } }
function openTrailerModal(trailerId) { if (!trailerModal) return; const trailerIframe = trailerModal.querySelector('#trailer-iframe'); trailerIframe.src = `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0`; trailerModal.classList.remove('hidden'); }
function closeModal(modal) { if (modal) { modal.classList.add('hidden'); if (modal.id === 'trailer-modal') { modal.querySelector('#trailer-iframe').src = ''; } } }
async function handleSearch(query) { if (!searchResultsSection || !genreSections) return; if (!query) { searchResultsSection.classList.add('hidden'); genreSections.classList.remove('hidden'); return; } const searchData = await fetchApi(`/search/movie?query=${encodeURIComponent(query)}`); genreSections.classList.add('hidden'); searchResultsSection.classList.remove('hidden'); if (searchData?.results) { displayMovies(searchData.results, searchResultsGrid); } }
async function handleFilterClick(filter) { if (!searchResultsSection || !genreSections) return; const filterLoadMoreBtn = document.getElementById('filter-load-more-btn'); let endpoint = ''; switch (filter) { case 'hollywood': endpoint = '/discover/movie?with_origin_country=US&language=en-US'; break; case 'bollywood': endpoint = '/discover/movie?with_origin_country=IN&with_original_language=hi'; break; case 'anime': endpoint = '/discover/movie?with_genres=16&with_origin_country=JP'; break; case 'popular': default: searchResultsSection.classList.add('hidden'); genreSections.classList.remove('hidden'); filterLoadMoreBtn.classList.add('hidden'); currentFilter.endpoint = null; return; } currentFilter.endpoint = endpoint; currentFilter.page = 1; genreSections.classList.add('hidden'); searchResultsSection.classList.remove('hidden'); filterLoadMoreBtn.classList.remove('hidden'); await loadMovies(endpoint, searchResultsGrid, 1); }
function updateMyListButton(movieId) { const allMyListBtns = document.querySelectorAll('.my-list-btn'); allMyListBtns.forEach(myListBtn => { if (myListBtn) { if (userWatchlist.includes(String(movieId))) { myListBtn.textContent = '✓ Remove from My List'; } else { myListBtn.textContent = '+ Add to My List'; } } }); }
async function renderMoviePage(movieId) { const container = document.getElementById('movie-details-container'); if (!container) return; container.innerHTML = `<div class="skeleton-details"></div>`; const [details, videos, credits] = await Promise.all([ fetchApi(`/movie/${movieId}`), fetchApi(`/movie/${movieId}/videos`), fetchApi(`/movie/${movieId}/credits`) ]); if (!details) { container.innerHTML = `<h1>Movie not found</h1>`; return; } document.title = `${details.title} - MoviePicks`; const trailer = videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer'); const director = credits?.crew?.find(p => p.job === 'Director'); const mainCast = credits?.cast?.slice(0, 5) || []; container.innerHTML = `<div class="movie-backdrop" style="background-image: url(${IMG_URL}${details.backdrop_path})"></div> <div class="movie-details-content" data-id="${details.id}"> <div class="movie-details-header"> <img src="${details.poster_path ? IMG_URL + details.poster_path : 'placeholder.jpg'}" alt="${details.title}" class="movie-details-poster"> <div class="movie-details-info"> <h1>${details.title} <span>(${new Date(details.release_date).getFullYear()})</span></h1> <p><strong>Rating:</strong> ${details.vote_average.toFixed(1)} / 10</p> ${director ? `<p><strong>Director:</strong> ${director.name}</p>` : ''} <p><em>${details.tagline}</em></p> <div class="movie-actions"> ${trailer ? `<button class="play-btn" data-trailer-id="${trailer.key}">▶ Play Trailer</button>` : ''} <button class="my-list-btn">+ Add to My List</button> </div> </div> </div> <div class="movie-details-body"> <h2>Overview</h2> <p>${details.overview}</p> <h2>Cast</h2> <div class="cast-grid"> ${mainCast.map(actor => `<div class="cast-member"><img src="${actor.profile_path ? IMG_URL + actor.profile_path : 'placeholder.jpg'}" alt="${actor.name}"><p><strong>${actor.name}</strong></p><p>${actor.character}</p></div>`).join('')} </div> <div class="review-section"> <hr><h3>Rate & Review</h3> <form id="review-form"><div class="star-rating"><span class="star" data-value="5">★</span><span class="star" data-value="4">★</span><span class="star" data-value="3">★</span><span class="star" data-value="2">★</span><span class="star" data-value="1">★</span></div><textarea id="review-text" placeholder="Write your review here..."></textarea><button type="submit" class="submit-review-btn">Submit Review</button></form> <hr><h3>User Reviews</h3> <div id="reviews-container"></div> </div> </div> </div>`; updateMyListButton(details.id); loadAndDisplayReviews(details.id); initializeStarRating(); const reviewFormOnPage = document.getElementById('review-form'); if (reviewFormOnPage) { reviewFormOnPage.addEventListener('submit', handleReviewSubmit); } }

// --- Page Initialization ---
async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (movieId) {
        await renderMoviePage(movieId);
    } else {
        await Promise.all([
            loadMovies('/movie/popular', recommendationsGrid, 1),
            loadMovies('/movie/top_rated', forYouGrid, 1),
            loadMovies('/discover/movie?with_genres=28', actionGrid, 1),
            loadMovies('/discover/movie?with_genres=35', comedyGrid, 1),
            loadMovies('/discover/movie?with_genres=10749', romanceGrid, 1),
            loadMovies('/discover/movie?with_genres=27', horrorGrid, 1),
            loadMovies('/discover/movie?with_genres=53', thrillerGrid, 1),
            loadMovies('/discover/movie?with_genres=18', dramaGrid, 1)
        ]);
    }
    if (myListGrid) {
        onAuthStateChanged(auth, user => { loadMyList(); });
    }
}


document.addEventListener('click', async (event) => {
    const movieCard = event.target.closest('.movie-card');
    const playBtn = event.target.closest('.play-btn');
    const closeBtn = event.target.closest('.close-btn');
    const myListBtn = event.target.closest('.my-list-btn');
    const deleteBtn = event.target.closest('.delete-review-btn');
    const quickAddBtn = event.target.closest('.quick-add-btn');
    const filterBtn = event.target.closest('.filter-btn');
    const loadMoreBtn = event.target.closest('.load-more-btn');

    if (quickAddBtn) {
        event.stopPropagation();
        const movieId = quickAddBtn.dataset.id;
        if (userWatchlist.includes(movieId)) { await removeFromMyList(movieId); quickAddBtn.textContent = '+'; quickAddBtn.classList.remove('added'); }
        else { await addToMyList(movieId); quickAddBtn.textContent = '✓'; quickAddBtn.classList.add('added'); }
    } else if (movieCard) {
        window.location.href = `movie.html?id=${movieCard.dataset.id}`;
    } else if (filterBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');
        handleFilterClick(filterBtn.dataset.filter);
    } else if (loadMoreBtn) {
        if (loadMoreBtn.id === 'filter-load-more-btn' && currentFilter.endpoint) {
            currentFilter.page++;
            await loadMovies(currentFilter.endpoint, searchResultsGrid, currentFilter.page);
        } else {
            const endpoint = loadMoreBtn.dataset.endpoint;
            if (!endpoint) return;
            currentPages[endpoint] = (currentPages[endpoint] || 1) + 1;
            const nextPage = currentPages[endpoint];
            const grid = loadMoreBtn.previousElementSibling;
            await loadMovies(endpoint, grid, nextPage);
        }
    } else if (playBtn && playBtn.dataset.trailerId) {
        openTrailerModal(playBtn.dataset.trailerId);
    } else if (myListBtn) {
        const movieDetailsContent = event.target.closest('.movie-details-content');
        const movieId = movieDetailsContent ? movieDetailsContent.dataset.id : detailsModal.dataset.movieId;
        if (movieId) {
            if (userWatchlist.includes(String(movieId))) { await removeFromMyList(String(movieId)); }
            else { await addToMyList(String(movieId)); }
            updateMyListButton(movieId);
        }
    } else if (deleteBtn) {
        const movieDetailsContent = event.target.closest('.movie-details-content');
        const movieId = movieDetailsContent ? movieDetailsContent.dataset.id : detailsModal.dataset.movieId;
        const reviewIndex = deleteBtn.dataset.index;
        const reviewToDelete = currentMovieReviews[reviewIndex];
        if (movieId && reviewToDelete) {
            await handleDeleteReview(movieId, reviewToDelete);
        }
    } else if (closeBtn) {
        closeModal(closeBtn.closest('.modal'));
    }
});

if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        handleSearch(event.target.value);
    });
}
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal(detailsModal);
        closeModal(trailerModal);
    }
});

// Start the App
initializePage();