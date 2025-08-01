// SECTION 1: FIREBASE SETUP & AUTHENTICATION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDc9rswaBpu-980og63L7v2-z8CCXj3-lE",
    authDomain: "moviepicks-project.firebaseapp.com",
    projectId: "moviepicks-project",
    storageBucket: "moviepicks-project.appspot.com",
    messagingSenderId: "941362009005",
    appId: "1:941362009005:web:d4c1997792838671b20724",
    measurementId: "G-JV4RCT5TZH"
  };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userWatchlist = [], currentRating = 0, currentMovieReviews = [];

// SECTION 2: MOVIE Browse & API LOGIC
const API_KEY = '2fdc6fe64a5b4fe596a082980edf0487';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// --- ELEMENT SELECTORS ---
const main = document.querySelector('main');
const searchInput = document.getElementById('search-input');
const detailsModal = document.getElementById('movie-modal');
const trailerModal = document.getElementById('trailer-modal');
const notification = document.getElementById('notification');
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
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const googleBtn = document.getElementById('google-signin-btn');

// --- NOTIFICATION FUNCTION ---
let notificationTimeout;
function showNotification(message, type = 'success') {
    if (!notification) return;
    clearTimeout(notificationTimeout);
    notification.textContent = message;
    notification.className = type;
    notification.classList.add('show');
    notificationTimeout = setTimeout(() => { notification.classList.remove('show'); }, 3000);
}

// --- AUTHENTICATION LOGIC ---
if (signupForm) { signupForm.addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('signup-email').value; const password = document.getElementById('signup-password').value; createUserWithEmailAndPassword(auth, email, password).then(cred => { showNotification('Sign up successful!'); setTimeout(() => window.location.href = 'index.html', 1000); }).catch(err => showNotification(`Error: ${err.message}`, 'error')); }); }
if (loginForm) { loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; signInWithEmailAndPassword(auth, email, password).then(cred => { showNotification('Login successful!'); setTimeout(() => window.location.href = 'index.html', 1000); }).catch(err => showNotification(`Error: ${err.message}`, 'error')); }); }
if (googleBtn) { googleBtn.addEventListener('click', () => { const provider = new GoogleAuthProvider(); signInWithPopup(auth, provider).then(res => { showNotification('Google sign in successful!'); setTimeout(() => window.location.href = 'index.html', 1000); }).catch(err => showNotification(`Error: ${err.message}`, 'error')); }); }
onAuthStateChanged(auth, async (user) => { const loginButtons = document.querySelectorAll('.login-btn'); if (user) { const userDoc = await getDoc(doc(db, "users", user.uid)); if (userDoc.exists() && userDoc.data().watchlist) { userWatchlist = userDoc.data().watchlist; } else { userWatchlist = []; } loginButtons.forEach(btn => { btn.textContent = 'Sign Out'; btn.onclick = () => signOut(auth).then(() => showNotification('Signed out.')); }); } else { userWatchlist = []; loginButtons.forEach(btn => { btn.textContent = 'Sign In'; btn.onclick = () => window.location.href = 'login.html'; }); } });

// --- CORE APP FUNCTIONS (API, Display, Modals, etc.) ---
async function fetchApi(endpoint) { const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`; try { const res = await fetch(url); if (!res.ok) throw new Error(res.statusText); return await res.json(); } catch (err) { console.error('API fetch error:', err); return null; } }
function displayMovies(movies, container) { if (!container) return; container.innerHTML = ''; movies.forEach(movie => { if (movie && movie.poster_path) { container.innerHTML += `<div class="movie-card" data-id="${movie.id}"><img src="${IMG_URL}${movie.poster_path}" alt="${movie.title}"></div>`; } }); }
function displaySkeletons(container) { if (!container) return; container.innerHTML = ''; for (let i = 0; i < 10; i++) { container.innerHTML += `<div class="movie-card skeleton-card"></div>`; } }
async function loadMovies(endpoint, container) { if (!container) return; displaySkeletons(container); await new Promise(res => setTimeout(res, 0)); const data = await fetchApi(endpoint); if (data && data.results) { displayMovies(data.results, container); } }
function closeModal(modal) { if (modal) { modal.classList.add('hidden'); if (modal.id === 'trailer-modal') modal.querySelector('#trailer-iframe').src = ''; } }
function openTrailerModal(trailerId) { if (!trailerModal) return; const iframe = trailerModal.querySelector('#trailer-iframe'); iframe.src = `https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0`; trailerModal.classList.remove('hidden'); }
async function handleSearch(query) { if (!searchResultsSection || !genreSections) return; if (!query) { searchResultsSection.classList.add('hidden'); genreSections.classList.remove('hidden'); return; } const data = await fetchApi(`/search/movie?query=${encodeURIComponent(query)}`); genreSections.classList.add('hidden'); searchResultsSection.classList.remove('hidden'); if (data && data.results) displayMovies(data.results, searchResultsGrid); }

// --- DEDICATED MOVIE PAGE & REVIEWS ---
function updateMyListButton(movieId) { const btn = document.querySelector('.movie-details-content .my-list-btn'); if (btn) btn.textContent = userWatchlist.includes(String(movieId)) ? '✓ Remove from My List' : '+ Add to My List'; }
async function renderMoviePage(movieId) { const container = document.getElementById('movie-details-container'); if (!container) return; container.innerHTML = `<div class="skeleton-details"></div>`; const [details, videos, credits] = await Promise.all([fetchApi(`/movie/${movieId}`), fetchApi(`/movie/${movieId}/videos`), fetchApi(`/movie/${movieId}/credits`)]); if (!details) { container.innerHTML = `<h1>Movie not found</h1>`; return; } document.title = `${details.title} - MoviePicks`; const trailer = videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer'); const director = credits?.crew?.find(p => p.job === 'Director'); const cast = credits?.cast?.slice(0, 5) || []; container.innerHTML = `<div class="movie-backdrop" style="background-image: url(${IMG_URL}${details.backdrop_path})"></div> <div class="movie-details-content" data-id="${details.id}"> <div class="movie-details-header"> <img src="${IMG_URL}${details.poster_path}" alt="${details.title}" class="movie-details-poster"> <div class="movie-details-info"> <h1>${details.title} <span>(${new Date(details.release_date).getFullYear()})</span></h1> <p><strong>Rating:</strong> ${details.vote_average.toFixed(1)} / 10</p> ${director ? `<p><strong>Director:</strong> ${director.name}</p>` : ''} <div class="movie-actions"> ${trailer ? `<button class="play-btn" data-trailer-id="${trailer.key}">▶ Play Trailer</button>` : ''} <button class="my-list-btn">+ Add to My List</button> </div> </div> </div> <div class="movie-details-body"> <h2>Overview</h2><p>${details.overview}</p> <h2>Cast</h2> <div class="cast-grid"> ${cast.map(actor => `<div class="cast-member"><img src="${actor.profile_path ? IMG_URL + actor.profile_path : 'placeholder.jpg'}" alt="${actor.name}"><p><strong>${actor.name}</strong></p><p>${actor.character}</p></div>`).join('')} </div> <div class="review-section"> <hr><h3>Rate & Review</h3> <form id="review-form"><div class="star-rating"><span class="star" data-value="5">★</span><span class="star" data-value="4">★</span><span class="star" data-value="3">★</span><span class="star" data-value="2">★</span><span class="star" data-value="1">★</span></div><textarea id="review-text" placeholder="Write your review..."></textarea><button type="submit" class="submit-review-btn">Submit</button></form> <hr><h3>User Reviews</h3><div id="reviews-container"></div> </div> </div> </div>`; updateMyListButton(details.id); loadAndDisplayReviews(details.id); initializeStarRating(); const form = document.getElementById('review-form'); if (form) form.addEventListener('submit', handleReviewSubmit); }
function displayReviews(reviews = []) { const container = document.getElementById('reviews-container'); if (!container) return; container.innerHTML = ''; if (!reviews.length) { container.innerHTML = '<p>No reviews yet. Be the first!</p>'; return; } const user = auth.currentUser; reviews.sort((a,b) => b.timestamp.toDate() - a.timestamp.toDate()); currentMovieReviews = reviews; reviews.forEach((review, i) => { const el = document.createElement('div'); el.className = 'review-item'; let delBtn = (user && review.userId === user.uid) ? `<button class="delete-review-btn" data-index="${i}">Delete</button>` : ''; el.innerHTML = `<div class="review-author"><span><strong class="author-name">${review.userName || 'User'}</strong> rated it <span class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></span> ${delBtn}</div><p class="review-text">${review.reviewText}</p>`; container.appendChild(el); }); }
async function loadAndDisplayReviews(movieId) { try { const ref = doc(db, "reviews", String(movieId)); const snap = await getDoc(ref); if (snap.exists() && snap.data().ratingsAndReviews) { displayReviews(snap.data().ratingsAndReviews); } else { displayReviews([]); } } catch (err) { console.error(err); displayReviews([]); } }
async function handleReviewSubmit(e) { e.preventDefault(); const user = auth.currentUser; if (!user) { showNotification("Please sign in to review.", 'error'); return; } const el = document.querySelector('.movie-details-content'); const movieId = el ? el.dataset.id : null; if (!movieId) return; if (currentRating === 0) { showNotification("Please select a star rating.", 'error'); return; } const data = { userId: user.uid, userName: user.displayName || user.email.split('@')[0], rating: currentRating, reviewText: document.getElementById('review-text').value, timestamp: new Date() }; try { await setDoc(doc(db, "reviews", String(movieId)), { ratingsAndReviews: arrayUnion(data) }, { merge: true }); showNotification("Review submitted!"); e.target.reset(); resetStars(); loadAndDisplayReviews(movieId); } catch (err) { showNotification("Failed to submit review.", 'error'); } }
function resetStars() { currentRating = 0; document.querySelectorAll('.star-rating .star').forEach(s => s.classList.remove('selected', 'hovered')); }
function initializeStarRating() { const stars = document.querySelectorAll('.star-rating .star'); stars.forEach(star => { star.addEventListener('mouseover', () => { stars.forEach(s => s.classList.toggle('hovered', s.dataset.value <= star.dataset.value)); }); star.addEventListener('mouseout', () => stars.forEach(s => s.classList.remove('hovered'))); star.addEventListener('click', () => { currentRating = star.dataset.value; stars.forEach(s => s.classList.toggle('selected', s.dataset.value <= currentRating)); }); }); }
async function handleDeleteReview(movieId, review) { if (!auth.currentUser) return; try { await updateDoc(doc(db, "reviews", String(movieId)), { ratingsAndReviews: arrayRemove(review) }); showNotification("Review deleted!"); loadAndDisplayReviews(movieId); } catch (err) { showNotification("Could not delete review.", 'error'); } }

// --- MY LIST LOGIC ---
async function addToMyList(movieId) { const user = auth.currentUser; if (!user) { showNotification("Please sign in to save movies.", 'error'); return; } try { const ref = doc(db, "users", user.uid); await setDoc(ref, { watchlist: arrayUnion(String(movieId)) }, { merge: true }); showNotification("Added to your list!"); userWatchlist.push(String(movieId)); } catch (err) { showNotification("Could not add to your list.", 'error'); } }
async function removeFromMyList(movieId) { const user = auth.currentUser; if (!user) return; try { const ref = doc(db, "users", user.uid); await updateDoc(ref, { watchlist: arrayRemove(String(movieId)) }); showNotification("Removed from your list!"); userWatchlist = userWatchlist.filter(id => id !== String(movieId)); if (myListGrid) loadMyList(); } catch (err) { showNotification("Could not remove from list.", 'error'); } }
async function loadMyList() { const user = auth.currentUser; if (user) { const ref = doc(db, "users", user.uid); const snap = await getDoc(ref); if (snap.exists() && snap.data().watchlist?.length > 0) { const promises = snap.data().watchlist.map(id => fetchApi(`/movie/${id}`)); const movies = await Promise.all(promises); displayMovies(movies.filter(m => m), myListGrid); } else if (myListGrid) { myListGrid.innerHTML = "<h3>Your list is empty. Add some movies!</h3>"; } } else if (myListGrid) { myListGrid.innerHTML = "<h3>Please <a href='login.html'>Sign In</a> to view your list.</h3>"; } }

// --- PAGE INITIALIZATION & EVENT LISTENERS ---
async function initializePage() { const params = new URLSearchParams(window.location.search); const movieId = params.get('id'); if (movieId) { await renderMoviePage(movieId); } else { Promise.all([ loadMovies('/movie/popular', recommendationsGrid), loadMovies('/movie/top_rated', forYouGrid), loadMovies('/discover/movie?with_genres=28', actionGrid), loadMovies('/discover/movie?with_genres=35', comedyGrid), loadMovies('/discover/movie?with_genres=10749', romanceGrid), loadMovies('/discover/movie?with_genres=27', horrorGrid), loadMovies('/discover/movie?with_genres=53', thrillerGrid), loadMovies('/discover/movie?with_genres=18', dramaGrid) ]); } if (myListGrid) { onAuthStateChanged(auth, user => loadMyList()); } }
document.addEventListener('click', async (e) => { const card = e.target.closest('.movie-card'); if (card) { window.location.href = `movie.html?id=${card.dataset.id}`; return; } const myListBtn = e.target.closest('.my-list-btn'); if (myListBtn) { const el = e.target.closest('.movie-details-content'); const movieId = el ? el.dataset.id : null; if (movieId) { if (userWatchlist.includes(String(movieId))) { await removeFromMyList(movieId); } else { await addToMyList(movieId); } updateMyListButton(movieId); } return; } const playBtn = e.target.closest('.play-btn'); if (playBtn && playBtn.dataset.trailerId) { openTrailerModal(playBtn.dataset.trailerId); return; } const delBtn = e.target.closest('.delete-review-btn'); if (delBtn) { const el = e.target.closest('.movie-details-content'); const movieId = el ? el.dataset.id : null; const review = currentMovieReviews[delBtn.dataset.index]; if (movieId && review) await handleDeleteReview(movieId, review); return; } const closeBtn = e.target.closest('.close-btn'); if (closeBtn) closeModal(closeBtn.closest('.modal')); });
if (searchInput) { searchInput.addEventListener('input', (e) => handleSearch(e.target.value)); }
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(detailsModal); closeModal(trailerModal); } });

initializePage();




