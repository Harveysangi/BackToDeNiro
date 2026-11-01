
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

// Display the starting movie and its cast
function displayStartingMovie(movie, cast) {

    // Clear the previous content
    movieDisplay.innerHTML = "";

    // Create the movie poster
    const poster = document.createElement("img");

    if (movie.poster_path) {
        poster.src = IMAGE_URL + movie.poster_path;
        poster.alt = movie.title + " poster";
        poster.className = "movie-poster";
    }

    // Create the movie title
    const title = document.createElement("h2");
    title.textContent = movie.title;

    // Get the release year
    const releaseYear = movie.release_date
        ? movie.release_date.substring(0, 4)
        : "Unknown";

    const year = document.createElement("p");
    year.textContent = "Released: " + releaseYear;

    // Create the movie rating
    const rating = document.createElement("p");
    rating.textContent = "TMDB Rating: " + movie.vote_average + "/10";

    // Create the cast heading
    const castHeading = document.createElement("h3");
    castHeading.textContent = "Select an actor";

    // Create a container for the actors
    const castContainer = document.createElement("div");
    castContainer.className = "cast-container";

      // Display the first 20 cast members
    cast.slice(0, 20).forEach(actor => {

        const actorButton = document.createElement("button");

        actorButton.textContent = actor.name;
        actorButton.className = "actor-button";

        // Prevent selecting an actor more than once
        if (usedActorIds.has(actor.id)) {

            actorButton.disabled = true;
            actorButton.textContent += " (Used)";

        }

        actorButton.addEventListener("click", async function() {
            if (gameOver) {
                return;
            }
            // Stop if this actor has already been selected
            if (usedActorIds.has(actor.id)) {
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


// Otherwise, continue the game
displayActorMovies(actor, actorMovies);
            } catch (error) {

                console.error(error);
                gameTitle.textContent = "ERROR LOADING FILMS";

            }

        });

        castContainer.appendChild(actorButton);
        
    });

    // Add everything to the page
    if (movie.poster_path) {
        movieDisplay.appendChild(poster);
    }

    movieDisplay.appendChild(title);
    movieDisplay.appendChild(year);
    movieDisplay.appendChild(rating);
    movieDisplay.appendChild(castHeading);
    movieDisplay.appendChild(castContainer);

    gameTitle.textContent = "YOUR STARTING MOVIE";
    displayConnectionHistory();
}


// Display an actor's filmography
function displayActorMovies(actor, movies) {

    movieDisplay.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = actor.name + "'s Films";

    movieDisplay.appendChild(heading);

    // Remove duplicate films and sort by release date
    const uniqueMovies = movies
        .filter((movie, index, self) =>
            self.findIndex(item => item.id === movie.id) === index
        )
        .filter(movie => movie.title && movie.release_date)
        .sort((a, b) =>
            (b.popularity || 0) - (a.popularity || 0)
        );

    // Create a button for each film
  // Only display films that haven't been selected before
    const availableMovies = uniqueMovies.filter(movie =>
        !usedMovieIds.has(movie.id)
    );

    // Create a button for each available film
    availableMovies.slice(0, 25).forEach(movie => {

        const filmButton = document.createElement("button");

        const releaseYear = movie.release_date.substring(0, 4);

        filmButton.textContent =
            movie.title + " (" + releaseYear + ")";

        filmButton.className = "actor-button";

        filmButton.addEventListener("click", async function() {
            if (gameOver) {
                return;
}
            // Prevent selecting a film more than once
            if (usedMovieIds.has(movie.id)) {
                return;
            }

            try {

                gameTitle.textContent = "LOADING FILM...";
                movieDisplay.textContent = "Retrieving cast...";

                // Retrieve the selected film's cast
                const cast = await getMovieCast(movie.id);
                // Check whether Robert De Niro appears in this film
                if (deNiroMovieIds.has(movie.id)) {

              // Record the selected film
                usedMovieIds.add(movie.id);

              moveCountValue++;

               connectionHistory.push({
               type: "movie",
             name: movie.title,
               year: movie.release_date.substring(0, 4)
    });

    updateGameStats();

    // Display the winning screen
    displayWinScreen(selectedActor, movie);

    return;
}
                // Update the current movie
                currentMovie = movie;

                // Record the selected film
                usedMovieIds.add(movie.id);

                moveCountValue++;

                connectionHistory.push({
                    type: "movie",
                    name: movie.title,
                    year: movie.release_date.substring(0, 4)
                });

                updateGameStats();

                // Display the new film and its cast
                displayStartingMovie(movie, cast);

                console.log("Current movie:", currentMovie);
                console.log("Selected actor:", selectedActor);

            } catch (error) {

                console.error(error);
                gameTitle.textContent = "ERROR LOADING FILM";

            }
            
        });

        movieDisplay.appendChild(filmButton);

    });
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

    // Display winning message
    const heading = document.createElement("h2");
    heading.textContent = "YOU WIN!";

    const message = document.createElement("p");
    message.textContent =
        "Congratulations! You have connected to Robert De Niro.";

    // Display the actor who completed the connection
    const actorName = document.createElement("h3");
    actorName.textContent = "Your final connection: " + actor.name;

    // Display the shared film
    const filmMessage = document.createElement("p");

    const releaseYear = sharedMovie.release_date
        ? sharedMovie.release_date.substring(0, 4)
        : "Unknown";

    filmMessage.textContent =
        "You connected through " +
        sharedMovie.title + " (" + releaseYear + ")";

    movieDisplay.appendChild(heading);
    movieDisplay.appendChild(message);
    movieDisplay.appendChild(actorName);
    movieDisplay.appendChild(filmMessage);

    gameTitle.textContent = "ROBERT DE NIRO FOUND!";

    // Display the completed journey
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