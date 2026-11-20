
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MzVmOTJlZTZhMjk2ZGM5MzU3ODZmMGUzYzBkOTFhMSIsIm5iZiI6MTc5MzQ4NTU5OS4yMDg5OTk5LCJzdWIiOiI2YWU2NmIxZjc4YjRlZDExMDI4YWFkNjkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.HS9eXjIBZgR3BWH3vznvPX2Ypi0mI1Odw2knCEgBd48";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

// Start Game button
const startButton = document.getElementById("startButton");

// Movie display section
const movieDisplay = document.getElementById("movieDisplay");

// Game title
const gameTitle = document.getElementById("gameTitle");

// Connection counter
const connectionCount = document.getElementById("connectionCount");

// Move counter
const moveCount = document.getElementById("moveCount");
/* ==========================================
    GAME STATE
========================================== */

// Stores the current game information
let currentMovie = null;
let selectedActor = null;

// Game counters
let moveCountValue = 0;
let connectionCountValue = 0;

// Stores the player's journey
let connectionHistory = [];

// Stores previously selected films and actors
let usedMovieIds = new Set();
let usedActorIds = new Set();

let deNiroMovieIds = new Set();
let gameOver = false;

/* ==========================================
    GAME STATISTICS
========================================== */

function updateGameStats() {

    moveCount.textContent = moveCountValue;
    connectionCount.textContent = connectionCountValue;

}
/* Start a new game and reset previous information */

function startGame(movie, cast, deNiroMovies) {

    // Store the starting movie
    currentMovie = movie;
    selectedActor = null;

    // Reset game counters
    moveCountValue = 0;
    connectionCountValue = 0;

    // Reset game history
    connectionHistory = [];

    // Reset previously used films and actors
    usedMovieIds = new Set();
    usedActorIds = new Set();

    // Store all films featuring Robert De Niro
    deNiroMovieIds = new Set(
        deNiroMovies.map(movie => movie.id)
    );

    // Reset the win condition
    gameOver = false;

    // Record the starting movie
    usedMovieIds.add(movie.id);

    connectionHistory.push({
        type: "movie",
        name: movie.title,
        year: movie.release_date
            ? movie.release_date.substring(0, 4)
            : "Unknown"
    });

    updateGameStats();

    displayStartingMovie(movie, cast);
}

/* ==========================================
   TMDB API CONNECTION
========================================== */

// Sends requests to the TMDB API
async function tmdbRequest(endpoint) {

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${TMDB_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`TMDB error: ${response.status}`);
    }

    return await response.json();
}


/* ==========================================
    MOVIE FUNCTIONS
========================================== */

// Search for a movie by its title
async function searchMovie(movieName) {

    const data = await tmdbRequest(
        `/search/movie?query=${encodeURIComponent(movieName)}&language=en-US&page=1`
    );

    return data.results[0];
}


// Retrieve the cast of a movie
async function getMovieCast(movieId) {

    const data = await tmdbRequest(
        `/movie/${movieId}/credits?language=en-US`
    );

    return data.cast;
}


// Get a random starting movie from TMDB
async function getRandomStartingMovie() {

    // Get Robert De Niro's TMDB information
    const deNiro = await getDeNiro();

    // Request suitable movies from TMDB
    const movieData = await tmdbRequest(
        "/discover/movie?language=en-US" +
        "&include_adult=false" +
        "&include_video=false" +
        "&vote_average.gte=6.5" +
        "&vote_count.gte=500" +
        "&sort_by=popularity.desc" +
        "&page=1"
    );

    // Copy the movie results
    const availableMovies = [...movieData.results];

    // Try up to 10 different movies
    for (let attempt = 0; attempt < 10; attempt++) {

        // Stop if there are no movies left
        if (availableMovies.length === 0) {
            break;
        }

        // Select a random movie
        const randomIndex = Math.floor(
            Math.random() * availableMovies.length
        );

        const movie = availableMovies.splice(randomIndex, 1)[0];

        // Retrieve the movie's cast
        const cast = await getMovieCast(movie.id);

        // Check if Robert De Niro appears in the cast
        const containsDeNiro = cast.some(actor =>
            actor.id === deNiro.id
        );

        // Return the movie if De Niro is not in it
        if (!containsDeNiro) {

            console.log("Starting movie:", movie);
            console.log("Movie cast:", cast);

            return {
                movie: movie,
                cast: cast
            };
        }
    }

    // No suitable movie was found
    throw new Error(
        "Could not find a suitable starting movie. Please try again."
    );
}
/* ==========================================
    DISPLAY MOVIE AND CAST
========================================== */

// Display the current movie and its cast
function displayStartingMovie(movie, cast) {

    // Clear the previous content
    movieDisplay.innerHTML = "";

    // Create the main movie information container
    const movieInfo = document.createElement("div");
    movieInfo.className = "current-movie";

    // Create the movie poster
    if (movie.poster_path) {

        const poster = document.createElement("img");

        poster.src = IMAGE_URL + movie.poster_path;
        poster.alt = movie.title + " poster";
        poster.className = "movie-poster";

        movieInfo.appendChild(poster);
    }

    // Create the movie title
    const title = document.createElement("h2");
    title.textContent = movie.title;

    // Get the release year
    const releaseYear = movie.release_date
        ? movie.release_date.substring(0, 4)
        : "Unknown";

    const year = document.createElement("p");
    year.className = "movie-year";
    year.textContent = "Released: " + releaseYear;

    // Create the movie rating
    const rating = document.createElement("p");
    rating.className = "movie-rating";
    rating.textContent = "★ " +
        (movie.vote_average ? movie.vote_average.toFixed(1) : "N/A") +
        " / 10";

    movieInfo.appendChild(title);
    movieInfo.appendChild(year);
    movieInfo.appendChild(rating);

    // Create the cast heading
    const castHeading = document.createElement("h3");
    castHeading.className = "section-heading";
    castHeading.textContent = "Choose an actor to continue";

    // Create a container for the actors
    const castContainer = document.createElement("div");
    castContainer.className = "cast-container";

    // Display the first 20 cast members
    cast.slice(0, 20).forEach(actor => {

        // Create an actor card
        const actorButton = document.createElement("button");
        actorButton.className = "actor-card";
        actorButton.type = "button";

        // Create actor image
        if (actor.profile_path) {

            const actorImage = document.createElement("img");

            actorImage.src = IMAGE_URL + actor.profile_path;
            actorImage.alt = actor.name;
            actorImage.className = "actor-image";

            actorButton.appendChild(actorImage);

        } else {

            const placeholder = document.createElement("div");
            placeholder.className = "actor-placeholder";
            placeholder.textContent = "?";

            actorButton.appendChild(placeholder);
        }

        // Create actor name
        const actorName = document.createElement("span");
        actorName.className = "actor-name";
        actorName.textContent = actor.name;

        actorButton.appendChild(actorName);

        // Prevent selecting an actor more than once
        if (usedActorIds.has(actor.id)) {

            actorButton.disabled = true;
            actorButton.classList.add("used-card");
            actorName.textContent += " (Used)";
        }

        // Actor selection event
        actorButton.addEventListener("click", async function() {

            if (gameOver || usedActorIds.has(actor.id)) {
                return;
            }

            try {

                gameTitle.textContent = "LOADING ACTOR FILMS...";

                const actorMovies = await getActorMovies(actor.id);

                // Record the selected actor
                selectedActor = actor;
                usedActorIds.add(actor.id);

                connectionCountValue++;

                connectionHistory.push({
                    type: "actor",
                    name: actor.name
                });

                updateGameStats();

                // Display the actor's films
                displayActorMovies(actor, actorMovies);

            } catch (error) {

                console.error(error);
                gameTitle.textContent = "ERROR LOADING FILMS";

            }

        });

        castContainer.appendChild(actorButton);

    });

    // Add everything to the page
    movieDisplay.appendChild(movieInfo);
    movieDisplay.appendChild(castHeading);
    movieDisplay.appendChild(castContainer);

    gameTitle.textContent = "CURRENT FILM";

    displayConnectionHistory();
}


// Display an actor's filmography
function displayActorMovies(actor, movies) {

    movieDisplay.innerHTML = "";

    // Create the heading
    const heading = document.createElement("h2");
    heading.textContent = actor.name + "'s Films";

    const description = document.createElement("p");
    description.className = "film-description";
    description.textContent = "Select a film to continue your journey.";

    movieDisplay.appendChild(heading);
    movieDisplay.appendChild(description);

    // Remove duplicate films and sort by popularity
    const uniqueMovies = movies
        .filter((movie, index, self) =>
            self.findIndex(item => item.id === movie.id) === index
        )
        .filter(movie => movie.title && movie.release_date)
        .sort((a, b) =>
            (b.popularity || 0) - (a.popularity || 0)
        );

    // Only display films that haven't been selected before
    const availableMovies = uniqueMovies.filter(movie =>
        !usedMovieIds.has(movie.id)
    );

    // Get the 25 most popular films
    const moviesToDisplay = availableMovies.slice(0, 25);

    // Ensure a valid De Niro connecting film is available
    const connectingMovie = availableMovies.find(movie =>
        deNiroMovieIds.has(movie.id)
    );

    if (
        connectingMovie &&
        !moviesToDisplay.some(movie => movie.id === connectingMovie.id)
    ) {

        if (moviesToDisplay.length >= 25) {
            moviesToDisplay[moviesToDisplay.length - 1] = connectingMovie;
        } else {
            moviesToDisplay.push(connectingMovie);
        }

    }

    // Create the movie grid
    const movieGrid = document.createElement("div");
    movieGrid.className = "movie-grid";

    // Create a card for each available film
    moviesToDisplay.forEach(movie => {

        const filmButton = document.createElement("button");

        filmButton.className = "movie-card";
        filmButton.type = "button";

        // Create the movie poster
        if (movie.poster_path) {

            const poster = document.createElement("img");

            poster.src = IMAGE_URL + movie.poster_path;
            poster.alt = movie.title + " poster";
            poster.className = "film-poster";

            filmButton.appendChild(poster);

        } else {

            const placeholder = document.createElement("div");

            placeholder.className = "film-placeholder";
            placeholder.textContent = "No poster available";

            filmButton.appendChild(placeholder);
        }

        // Create movie information container
        const movieDetails = document.createElement("div");
        movieDetails.className = "film-details";

        // Movie title
        const filmTitle = document.createElement("h3");
        filmTitle.textContent = movie.title;

        // Release year
        const releaseYear = document.createElement("p");
        releaseYear.className = "film-year";
        releaseYear.textContent = movie.release_date.substring(0, 4);

        // Movie rating
        const filmRating = document.createElement("p");
        filmRating.className = "film-rating";

        filmRating.textContent = "★ " +
            (movie.vote_average ? movie.vote_average.toFixed(1) : "N/A");

        movieDetails.appendChild(filmTitle);
        movieDetails.appendChild(releaseYear);
        movieDetails.appendChild(filmRating);

        filmButton.appendChild(movieDetails);

        // Film selection event
        filmButton.addEventListener("click", async function() {

            if (gameOver || usedMovieIds.has(movie.id)) {
                return;
            }

            try {

                gameTitle.textContent = "LOADING FILM...";
                movieDisplay.textContent = "Retrieving cast...";

                // Record the selected film
                usedMovieIds.add(movie.id);

                moveCountValue++;

                connectionHistory.push({
                    type: "movie",
                    name: movie.title,
                    year: movie.release_date.substring(0, 4)
                });

                updateGameStats();

                // Check whether Robert De Niro appears in this film
                if (deNiroMovieIds.has(movie.id)) {

                    displayWinScreen(selectedActor, movie);
                    return;

                }

                // Retrieve the selected film's cast
                const cast = await getMovieCast(movie.id);

                // Update the current movie
                currentMovie = movie;

                // Display the new film and its cast
                displayStartingMovie(movie, cast);

                console.log("Current movie:", currentMovie);
                console.log("Selected actor:", selectedActor);

            } catch (error) {

                console.error(error);
                gameTitle.textContent = "ERROR LOADING FILM";

            }

        });

        movieGrid.appendChild(filmButton);

    });

    movieDisplay.appendChild(movieGrid);

    gameTitle.textContent = "SELECTED ACTOR: " + actor.name;

    displayConnectionHistory();
}
/* ==========================================
   DISPLAY CONNECTION HISTORY
========================================== */

function displayConnectionHistory() {

    const historyContainer = document.createElement("div");

    historyContainer.className = "history-container";

    const heading = document.createElement("h3");

    heading.textContent = "YOUR CONNECTION HISTORY";

    historyContainer.appendChild(heading);

    // Display each selection in order
    connectionHistory.forEach((item, index) => {

        const historyItem = document.createElement("p");

        if (item.type === "movie") {

            historyItem.textContent =
                `${index + 1}. Film: ${item.name} (${item.year})`;

        } else {

            historyItem.textContent =
                `${index + 1}. Actor: ${item.name}`;

        }

        historyContainer.appendChild(historyItem);

    });

    movieDisplay.appendChild(historyContainer);

}

function displayWinScreen(actor, sharedMovie) {

    // End the game
    gameOver = true;

    // Clear the previous screen
    movieDisplay.innerHTML = "";

    // Create the main win screen container
    const winContainer = document.createElement("div");
    winContainer.className = "win-container";

    // Create the victory heading
    const trophy = document.createElement("div");
    trophy.className = "win-trophy";
    trophy.textContent = "🏆";

    const heading = document.createElement("h2");
    heading.className = "win-heading";
    heading.textContent = "CONNECTION COMPLETE!";

    const message = document.createElement("p");
    message.className = "win-message";
    message.textContent =
        "Congratulations! You've successfully connected to Robert De Niro.";

    // Create the final movie section
    const finalMovie = document.createElement("div");
    finalMovie.className = "final-movie";

    // Display the final movie poster
    if (sharedMovie.poster_path) {

        const poster = document.createElement("img");

        poster.src = IMAGE_URL + sharedMovie.poster_path;
        poster.alt = sharedMovie.title + " poster";
        poster.className = "win-poster";

        finalMovie.appendChild(poster);
    }

    // Display the final movie title
    const filmTitle = document.createElement("h3");
    filmTitle.textContent = sharedMovie.title;

    const releaseYear = sharedMovie.release_date
        ? sharedMovie.release_date.substring(0, 4)
        : "Unknown";

    const filmYear = document.createElement("p");
    filmYear.className = "win-film-year";
    filmYear.textContent = releaseYear;

    finalMovie.appendChild(filmTitle);
    finalMovie.appendChild(filmYear);

    // Display the actor who completed the connection
    const actorSection = document.createElement("div");
    actorSection.className = "win-actor";

    if (actor.profile_path) {

        const actorImage = document.createElement("img");

        actorImage.src = IMAGE_URL + actor.profile_path;
        actorImage.alt = actor.name;
        actorImage.className = "win-actor-image";

        actorSection.appendChild(actorImage);
    }

    const actorLabel = document.createElement("p");
    actorLabel.textContent = "Your final connection";

    const actorName = document.createElement("h3");
    actorName.textContent = actor.name;

    actorSection.appendChild(actorLabel);
    actorSection.appendChild(actorName);

    // Create the game statistics section
    const statsContainer = document.createElement("div");
    statsContainer.className = "win-stats";

    // Total moves
    const movesCard = document.createElement("div");
    movesCard.className = "win-stat-card";

    const movesNumber = document.createElement("h3");
    movesNumber.textContent = moveCountValue;

    const movesLabel = document.createElement("p");
    movesLabel.textContent = "TOTAL MOVES";

    movesCard.appendChild(movesNumber);
    movesCard.appendChild(movesLabel);

    // Actor connections
    const connectionsCard = document.createElement("div");
    connectionsCard.className = "win-stat-card";

    const connectionsNumber = document.createElement("h3");
    connectionsNumber.textContent = connectionCountValue;

    const connectionsLabel = document.createElement("p");
    connectionsLabel.textContent = "ACTOR CONNECTIONS";

    connectionsCard.appendChild(connectionsNumber);
    connectionsCard.appendChild(connectionsLabel);

    statsContainer.appendChild(movesCard);
    statsContainer.appendChild(connectionsCard);

    // Create Play Again button
    const playAgainButton = document.createElement("button");

    playAgainButton.className = "play-again-button";
    playAgainButton.textContent = "PLAY AGAIN";

    playAgainButton.addEventListener("click", function() {

        // Trigger the existing start-game event
        startButton.click();

    });

    // Add all elements to the win container
    winContainer.appendChild(trophy);
    winContainer.appendChild(heading);
    winContainer.appendChild(message);
    winContainer.appendChild(finalMovie);
    winContainer.appendChild(actorSection);
    winContainer.appendChild(statsContainer);
    winContainer.appendChild(playAgainButton);

    // Add the completed screen to the page
    movieDisplay.appendChild(winContainer);

    gameTitle.textContent = "ROBERT DE NIRO FOUND!";

    // Display the completed journey underneath
    displayConnectionHistory();

    console.log("Game won!");
    console.log("Final actor:", actor);
    console.log("Connecting film:", sharedMovie);
}

/* ==========================================
    ACTOR FUNCTIONS
========================================== */

// Retrieve Robert De Niro's TMDB information
async function getDeNiro() {

    const data = await tmdbRequest(
        "/search/person?query=Robert%20De%20Niro&language=en-US&page=1"
    );

    const actor = data.results.find(person =>
        person.name === "Robert De Niro"
    );

    if (!actor) {
        throw new Error("Robert De Niro not found.");
    }

    console.log("Actor:", actor.name);
    console.log("Actor ID:", actor.id);

    return actor;
}


// Retrieve all movies an actor has appeared in
async function getActorMovies(actorId) {

    const data = await tmdbRequest(
        `/person/${actorId}/movie_credits?language=en-US`
    );

    return data.cast;
}


/* ==========================================
    EVENT LISTENERS
========================================== */

startButton.addEventListener("click", async function() {

    try {

        gameTitle.textContent = "STARTING NEW GAME...";
        movieDisplay.textContent = "Searching TMDB...";

        startButton.disabled = true;

        // Get a random starting movie
        const startingData = await getRandomStartingMovie();

        const movie = startingData.movie;
        const cast = startingData.cast;

        // Retrieve Robert De Niro's filmography
        const deNiro = await getDeNiro();

        const deNiroMovies = await getActorMovies(deNiro.id);

        // Initialise the game
        startGame(movie, cast, deNiroMovies);

        startButton.textContent = "NEW GAME";

    } catch (error) {

        console.error("Error:", error);

        gameTitle.textContent = "ERROR";
        movieDisplay.textContent = error.message;

        startButton.textContent = "TRY AGAIN";

    } finally {

        startButton.disabled = false;

    }

});