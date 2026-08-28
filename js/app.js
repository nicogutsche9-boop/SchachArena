/* =========================================================
   SCHACHARENA – APP.JS
   KOMPLETT BEREINIGTE VERSION
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://ocqdfvfshbudnsssxdxi.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcWRmdmZzaGJ1ZG5zc3N4ZHhpIiwicm9sZSI6MTc4NzkxMTA1MDksImV4cCI6MjEwMzQ4NjUwOX0.TktaxxzGeChjr8B9xrl9wWbcq6A-mEBJlqKBT5EJufE";

const sb =
  window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


/* =========================================================
   SCHACHFIGUREN
========================================================= */

const PIECES = {
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  p: "♟",

  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
  P: "♙"
};


/* =========================================================
   SPIELSTATUS
========================================================= */

let board = [];
let turn = "w";

let selected = null;
let lastMove = null;

let peer = null;
let conn = null;

let myColor = null;
let room = "";

let gameOver = false;
let localResultDone = false;


/* =========================================================
   RANKING
========================================================= */

let rating =
  Number(localStorage.getItem("sa_rating")) || 1000;

let wins =
  Number(localStorage.getItem("sa_wins")) || 0;

let losses =
  Number(localStorage.getItem("sa_losses")) || 0;

let draws =
  Number(localStorage.getItem("sa_draws")) || 0;


/* =========================================================
   MÜNZEN
========================================================= */

let coins =
  Number(localStorage.getItem("sa_coins")) || 0;


/* =========================================================
   TÄGLICHE AUFGABEN
========================================================= */

let dailyTasks = null;


/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

function getToday() {

  return new Date()
    .toISOString()
    .slice(0, 10);
}


function getName() {

  const stored =
    localStorage.getItem("sa_username");

  if (stored) {

    return stored
      .trim()
      .slice(0, 18) || "Gast";
  }

  return "Gast";
}


function setName(name) {

  name =
    String(name || "")
      .trim()
      .slice(0, 18);

  if (!name) {
    name = "Gast";
  }

  localStorage.setItem(
    "sa_username",
    name
  );

  return name;
}


function rank(v = rating) {

  if (v >= 1400) {
    return "Gold";
  }

  if (v >= 1200) {
    return "Silber";
  }

  if (v >= 1000) {
    return "Bronze";
  }

  return "Anfänger";
}


function escapeHtml(value) {

  return String(value)
    .replace(/[&<>"']/g, char => {

      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return map[char];
    });
}


function escapeJs(value) {

  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}


/* =========================================================
   MÜNZEN SPEICHERN
========================================================= */

function loadCoins() {

  coins =
    Number(
      localStorage.getItem(
        "sa_coins"
      )
    ) || 0;

  return coins;
}


function saveCoins() {

  localStorage.setItem(
    "sa_coins",
    String(coins)
  );

  updateCoinDisplays();
}


function addCoins(amount) {

  amount =
    Number(amount) || 0;

  coins += amount;

  saveCoins();
}


function spendCoins(amount) {

  amount =
    Number(amount) || 0;

  if (coins < amount) {
    return false;
  }

  coins -= amount;

  saveCoins();

  return true;
}


function updateCoinDisplays() {

  const value =
    Number(
      localStorage.getItem(
        "sa_coins"
      )
    ) || 0;

  document
    .querySelectorAll(
      "[data-coins], .coin-count"
    )
    .forEach(
      element => {

        element.textContent =
          value;
      }
    );
}


/* =========================================================
   TÄGLICHE AUFGABEN LADEN
========================================================= */

function loadDailyTasks() {

  const today =
    getToday();

  let stored = null;

  try {

    stored =
      JSON.parse(
        localStorage.getItem(
          "sa_daily_tasks"
        ) || "null"
      );

  } catch (error) {

    stored = null;
  }


  if (
    !stored ||
    stored.date !== today
  ) {

    stored = {

      date: today,

      wins: 0,
      games: 0,

      winsRewarded: false,
      gamesRewarded: false

    };

    localStorage.setItem(
      "sa_daily_tasks",
      JSON.stringify(stored)
    );
  }


  dailyTasks =
    stored;

  return dailyTasks;
}


function saveDailyTasks() {

  if (!dailyTasks) {
    return;
  }

  localStorage.setItem(
    "sa_daily_tasks",
    JSON.stringify(
      dailyTasks
    )
  );
}


/* =========================================================
   TÄGLICHE AUFGABEN AKTUALISIEREN
========================================================= */

function updateDailyTasks(result) {

  loadDailyTasks();


  /* Jede Partie zählt */

  dailyTasks.games =
    Number(
      dailyTasks.games
    ) || 0;

  dailyTasks.wins =
    Number(
      dailyTasks.wins
    ) || 0;


  dailyTasks.games++;


  /* Sieg zählt zusätzlich */

  if (
    result === "win"
  ) {

    dailyTasks.wins++;
  }


  /* ================================================
     3 SIEGE
  ================================================= */

  if (
    dailyTasks.wins >= 3 &&
    !dailyTasks.winsRewarded
  ) {

    dailyTasks.winsRewarded =
      true;

    addCoins(100);

    showMessage(
      "🏆 Aufgabe geschafft! +100 Münzen"
    );
  }


  /* ================================================
     5 PARTIEN
  ================================================= */

  if (
    dailyTasks.games >= 5 &&
    !dailyTasks.gamesRewarded
  ) {

    dailyTasks.gamesRewarded =
      true;

    addCoins(75);

    showMessage(
      "⚔️ Aufgabe geschafft! +75 Münzen"
    );
  }


  saveDailyTasks();

  updateRewardsDisplays();
}


/* =========================================================
   BELOHNUNGSANZEIGEN AKTUALISIEREN
========================================================= */

function updateRewardsDisplays() {

  loadDailyTasks();
  loadCoins();


  const wins =
    Math.min(
      Number(dailyTasks.wins) || 0,
      3
    );


  const games =
    Math.min(
      Number(dailyTasks.games) || 0,
      5
    );


  const winsPercent =
    Math.min(
      100,
      Math.round(
        wins / 3 * 100
      )
    );


  const gamesPercent =
    Math.min(
      100,
      Math.round(
        games / 5 * 100
      )
    );


  document
    .querySelectorAll(
      "[data-reward-wins]"
    )
    .forEach(
      element => {

        element.textContent =
          wins + " / 3";

      }
    );


  document
    .querySelectorAll(
      "[data-reward-games]"
    )
    .forEach(
      element => {

        element.textContent =
          games + " / 5";

      }
    );


  document
    .querySelectorAll(
      "[data-reward-wins-progress]"
    )
    .forEach(
      element => {

        element.style.width =
          winsPercent + "%";

      }
    );


  document
    .querySelectorAll(
      "[data-reward-games-progress]"
    )
    .forEach(
      element => {

        element.style.width =
          gamesPercent + "%";

      }
    );


  updateCoinDisplays();
}


/* =========================================================
   BELOHNUNGEN POPUP
========================================================= */

function openRewards() {

  const oldPopup =
    document.getElementById(
      "rewardsPopup"
    );


  if (oldPopup) {

    oldPopup.remove();

    return;
  }


  loadDailyTasks();
  loadCoins();


  const wins =
    Math.min(
      Number(dailyTasks.wins) || 0,
      3
    );


  const games =
    Math.min(
      Number(dailyTasks.games) || 0,
      5
    );


  const winsPercent =
    Math.min(
      100,
      Math.round(
        wins / 3 * 100
      )
    );


  const gamesPercent =
    Math.min(
      100,
      Math.round(
        games / 5 * 100
      )
    );


  const popup =
    document.createElement(
      "div"
    );


  popup.id =
    "rewardsPopup";


  popup.className =
    "rewards-popup-overlay";


  popup.innerHTML = `

    <div class="rewards-popup">

      <button
        type="button"
        class="rewards-popup-close"
        id="closeRewardsPopup"
        aria-label="Schließen"
      >
        ×
      </button>


      <div class="rewards-popup-icon">
        🏆
      </div>


      <h2>
        Deine täglichen Aufgaben
      </h2>


      <p class="rewards-subtitle">
        Erfülle Aufgaben und verdiene Münzen.
      </p>


      <div class="reward-task">

        <div class="task-icon">
          ♟
        </div>


        <div class="task-content">

          <strong>
            Gewinne 3 Partien
          </strong>

          <span>
            ${wins} / 3 geschafft
          </span>


          <div class="task-progress">

            <div
              style="width:${winsPercent}%"
            ></div>

          </div>

        </div>


        <div class="task-reward">
          🪙 100
        </div>

      </div>


      <div class="reward-task">

        <div class="task-icon">
          ⚔️
        </div>


        <div class="task-content">

          <strong>
            Spiele 5 Partien
          </strong>

          <span>
            ${games} / 5 geschafft
          </span>


          <div class="task-progress">

            <div
              style="width:${gamesPercent}%"
            ></div>

          </div>

        </div>


        <div class="task-reward">
          🪙 75
        </div>

      </div>


      <div class="rewards-total">

        <span>
          Deine Münzen
        </span>

        <strong>
          🪙 ${coins}
        </strong>

      </div>

    </div>
  `;


  document.body.appendChild(
    popup
  );


  const closeButton =
    document.getElementById(
      "closeRewardsPopup"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        popup.remove();

      }
    );
  }


  popup.addEventListener(
    "click",
    event => {

      if (
        event.target === popup
      ) {

        popup.remove();
      }

    }
  );
}


/* =========================================================
   RATING ANZEIGEN
========================================================= */

function updateRanking() {

  const ratingElement =
    document.getElementById(
      "rating"
    );


  const statsElement =
    document.getElementById(
      "stats"
    );


  if (ratingElement) {

    ratingElement.textContent =
      rating +
      " Punkte · " +
      rank();
  }


  if (statsElement) {

    statsElement.textContent =
      wins +
      " Siege · " +
      losses +
      " Niederlagen · " +
      draws +
      " Remis";
  }


  document
    .querySelectorAll(
      "[data-rating]"
    )
    .forEach(
      element => {

        element.textContent =
          rating;

      }
    );
}


function saveRanking() {

  localStorage.setItem(
    "sa_rating",
    String(rating)
  );

  localStorage.setItem(
    "sa_wins",
    String(wins)
  );

  localStorage.setItem(
    "sa_losses",
    String(losses)
  );

  localStorage.setItem(
    "sa_draws",
    String(draws)
  );

  updateRanking();
}


/* =========================================================
   SPIELERGEBNIS
========================================================= */

async function score(result) {

  if (localResultDone) {
    return;
  }


  localResultDone = true;


  if (
    result === "win"
  ) {

    rating += 25;

    wins++;


    updateDailyTasks(
      "win"
    );


    showMessage(
      "🎉 Gewonnen! +25 Punkte"
    );

  } else if (
    result === "loss"
  ) {

    rating =
      Math.max(
        0,
        rating - 15
      );

    losses++;


    updateDailyTasks(
      "loss"
    );


    showMessage(
      "😕 Verloren. -15 Punkte"
    );

  } else {

    draws++;


    updateDailyTasks(
      "draw"
    );


    showMessage(
      "🤝 Remis"
    );
  }


  saveRanking();

  await syncPlayer();
}


/* =========================================================
   SUPABASE SPIELER
========================================================= */

async function syncPlayer() {

  if (!sb) {
    return;
  }


  const username =
    getName();


  if (
    username.toLowerCase() ===
    "gast"
  ) {
    return;
  }


  try {

    const result =
      await sb
        .from("players")
        .upsert(
          {
            username,
            rating,
            games_played:
              wins +
              losses +
              draws,
            wins,
            losses,
            draws,
            updated_at:
              new Date().toISOString()
          },
          {
            onConflict:
              "username"
          }
        );


    if (result.error) {
      throw result.error;
    }


    await loadLeaderboard();

  } catch (error) {

    console.warn(
      "Spieler konnte nicht synchronisiert werden:",
      error
    );
  }
}


/* =========================================================
   RANGLISTE
========================================================= */

async function loadLeaderboard() {

  const box =
    document.getElementById(
      "leaderboard"
    );


  if (
    !box ||
    !sb
  ) {
    return;
  }


  box.innerHTML =
    '<div class="empty">⏳ Rangliste wird geladen …</div>';


  try {

    const result =
      await sb
        .from("players")
        .select(
          "username,rating,wins,losses,draws"
        )
        .order(
          "rating",
          {
            ascending: false
          }
        )
        .limit(100);


    if (result.error) {
      throw result.error;
    }


    const players =
      result.data || [];


    if (!players.length) {

      box.innerHTML =
        '<div class="empty">Noch keine Spieler in der Rangliste.</div>';

      return;
    }


    box.innerHTML =
      players
        .map(
          (player, index) => {

            const medal =
              index === 0
                ? "🥇"
                : index === 1
                ? "🥈"
                : index === 2
                ? "🥉"
                : String(index + 1);


            const me =
              player.username ===
              getName()
                ? "me"
                : "";


            return `

              <div
                class="leader-item ${me}"
              >

                <span class="rank-num">
                  ${medal}
                </span>


                <span class="player-name">

                  <b>
                    ${escapeHtml(
                      player.username
                    )}
                  </b>


                  <small>
                    ${rank(
                      player.rating
                    )}
                    ·
                    ${player.wins || 0}
                    Siege
                  </small>

                </span>


                <span class="pill">
                  ${player.rating}
                </span>

              </div>
            `;
          }
        )
        .join("");

  } catch (error) {

    console.error(
      "Leaderboard:",
      error
    );


    box.innerHTML =
      `
      <div class="empty">
        ⚠️ Die Online-Rangliste konnte nicht geladen werden.
      </div>
      `;
  }
}


/* =========================================================
   SCHACHBRETT
========================================================= */

function fresh() {

  board = [

    "rnbqkbnr",
    "pppppppp",
    "........",
    "........",
    "........",
    "........",
    "PPPPPPPP",
    "RNBQKBNR"

  ].map(
    row => [...row]
  );


  turn = "w";

  selected = null;

  lastMove = null;

  gameOver = false;

  localResultDone = false;


  if (
    typeof chessState !==
    "undefined"
  ) {

    chessState.whiteKingMoved =
      false;

    chessState.blackKingMoved =
      false;

    chessState.whiteRookAMoved =
      false;

    chessState.whiteRookHMoved =
      false;

    chessState.blackRookAMoved =
      false;

    chessState.blackRookHMoved =
      false;

    chessState.enPassantTarget =
      null;
  }


  draw();
}


/* =========================================================
   BRETT ZEICHNEN
========================================================= */

function draw() {

  const boardElement =
    document.getElementById(
      "board"
    );


  if (!boardElement) {
    return;
  }


  boardElement.innerHTML = "";


  for (
    let r = 0;
    r < 8;
    r++
  ) {

    for (
      let c = 0;
      c < 8;
      c++
    ) {

      const square =
        document.createElement(
          "div"
        );


      square.className =
        "sq " +
        (
          (r + c) % 2
            ? "dark"
            : "light"
        );


      if (
        selected &&
        selected[0] === r &&
        selected[1] === c
      ) {

        square.classList.add(
          "selected"
        );
      }


      if (
        lastMove &&
        (
          (
            lastMove[0] === r &&
            lastMove[1] === c
          )
          ||
          (
            lastMove[2] === r &&
            lastMove[3] === c
          )
        )
      ) {

        square.classList.add(
          "last"
        );
      }


      const piece =
        board[r][c];


      const span =
        document.createElement(
          "span"
        );


      span.className =
        "piece " +
        (
          colorOf(piece) === "b"
            ? "black"
            : colorOf(piece) === "w"
            ? "white"
            : ""
        );


      span.textContent =
        PIECES[piece] || "";


      square.appendChild(
        span
      );


      square.addEventListener(
        "click",
        () => tap(r, c)
      );


      boardElement.appendChild(
        square
      );
    }
  }


  const turnElement =
    document.getElementById(
      "turn"
    );


  if (turnElement) {

    turnElement.textContent =
      gameOver
        ? "Partie beendet"
        : "Am Zug: " +
          (
            turn === "w"
              ? "Weiß"
              : "Schwarz"
          );
  }


  const colorElement =
    document.getElementById(
      "color"
    );


  if (
    colorElement &&
    myColor
  ) {

    colorElement.textContent =
      "Du: " +
      (
        myColor === "w"
          ? "Weiß"
          : "Schwarz"
      );
  }
}


/* =========================================================
   BRETT KLICK
========================================================= */

function tap(r, c) {

  if (gameOver) {
    return;
  }


  if (
    myColor &&
    myColor !== turn
  ) {

    showMessage(
      "Der Gegner ist am Zug."
    );

    return;
  }


  const piece =
    board[r][c];


  if (!selected) {

    if (
      colorOf(piece) === turn
    ) {

      selected = [
        r,
        c
      ];

      draw();
    }

    return;
  }


  if (
    colorOf(piece) === turn
  ) {

    selected = [
      r,
      c
    ];

    draw();

    return;
  }


  if (
    typeof legal ===
      "function" &&
    legal(
      selected[0],
      selected[1],
      r,
      c
    )
  ) {

    applyMove(
      selected[0],
      selected[1],
      r,
      c,
      true
    );


    selected = null;

    draw();

    return;
  }


  selected = null;

  draw();
}


/* =========================================================
   ZUG AUSFÜHREN
========================================================= */

function applyMove(
  r1,
  c1,
  r2,
  c2,
  send = true
) {

  const moving =
    board[r1][c1];


  if (
    !moving ||
    moving === "."
  ) {
    return;
  }


  const movingColor =
    colorOf(moving);


  const captured =
    board[r2][c2];


  const isEnPassant =
    moving.toLowerCase() === "p" &&
    c1 !== c2 &&
    captured === "." &&
    typeof chessState !==
      "undefined" &&
    chessState.enPassantTarget &&
    chessState.enPassantTarget[0] === r2 &&
    chessState.enPassantTarget[1] === c2;


  board[r2][c2] =
    moving;

  board[r1][c1] =
    ".";


  if (isEnPassant) {

    const capturedPawnRow =
      movingColor === "w"
        ? r2 + 1
        : r2 - 1;


    board[capturedPawnRow][c2] =
      ".";
  }


  /* Rochade */

  if (
    moving.toLowerCase() === "k" &&
    Math.abs(c2 - c1) === 2
  ) {

    const row = r1;


    if (c2 === 6) {

      board[row][5] =
        board[row][7];

      board[row][7] =
        ".";
    }


    if (c2 === 2) {

      board[row][3] =
        board[row][0];

      board[row][0] =
        ".";
    }
  }


  /* Rochade-Status */

  if (
    typeof chessState !==
    "undefined"
  ) {

    if (moving === "K") {
      chessState.whiteKingMoved =
        true;
    }

    if (moving === "k") {
      chessState.blackKingMoved =
        true;
    }


    if (
      moving === "R" &&
      r1 === 7 &&
      c1 === 0
    ) {

      chessState.whiteRookAMoved =
        true;
    }


    if (
      moving === "R" &&
      r1 === 7 &&
      c1 === 7
    ) {

      chessState.whiteRookHMoved =
        true;
    }


    if (
      moving === "r" &&
      r1 === 0 &&
      c1 === 0
    ) {

      chessState.blackRookAMoved =
        true;
    }


    if (
      moving === "r" &&
      r1 === 0 &&
      c1 === 7
    ) {

      chessState.blackRookHMoved =
        true;
    }
  }


  /* Bauernumwandlung */

  if (
    moving === "P" &&
    r2 === 0
  ) {

    board[r2][c2] =
      "Q";
  }


  if (
    moving === "p" &&
    r2 === 7
  ) {

    board[r2][c2] =
      "q";
  }


  /* En Passant Ziel */

  if (
    typeof chessState !==
    "undefined"
  ) {

    chessState.enPassantTarget =
      null;


    if (
      moving.toLowerCase() === "p" &&
      Math.abs(r2 - r1) === 2
    ) {

      chessState.enPassantTarget = [

        (r1 + r2) / 2,

        c1

      ];
    }
  }


  lastMove = [
    r1,
    c1,
    r2,
    c2
  ];


  turn =
    turn === "w"
      ? "b"
      : "w";


  draw();


  checkGameEnd();


  if (
    send &&
    conn &&
    conn.open
  ) {

    conn.send({

      type: "move",

      m: [
        r1,
        c1,
        r2,
        c2
      ]

    });
  }
}


/* =========================================================
   SPIELENDE
========================================================= */

function checkGameEnd() {

  if (
    typeof isCheckmate !==
      "function" ||
    typeof isStalemate !==
      "function"
  ) {

    return;
  }


  if (
    isCheckmate(turn)
  ) {

    gameOver = true;


    const winner =
      turn === "w"
        ? "b"
        : "w";


    if (
      winner === myColor
    ) {

      score("win");

    } else {

      score("loss");
    }


    showMessage(
      winner === myColor
        ? "♚ Schachmatt – Du gewinnst!"
        : "♚ Schachmatt – Du hast verloren."
    );


    if (
      conn &&
      conn.open
    ) {

      conn.send({

        type: "gameover",

        winner

      });
    }


    draw();

    return;
  }


  if (
    isStalemate(turn)
  ) {

    gameOver = true;


    score("draw");


    showMessage(
      "🤝 Patt – Remis"
    );


    if (
      conn &&
      conn.open
    ) {

      conn.send({

        type: "draw"

      });
    }


    draw();
  }
}


/* =========================================================
   SPIELSTATUS
========================================================= */

function getGameState() {

  return {

    board:
      board.map(
        row => [...row]
      ),

    turn,

    lastMove:
      lastMove
        ? [...lastMove]
        : null,

    chessState:
      typeof chessState !==
        "undefined"

        ? {

            whiteKingMoved:
              chessState.whiteKingMoved,

            blackKingMoved:
              chessState.blackKingMoved,

            whiteRookAMoved:
              chessState.whiteRookAMoved,

            whiteRookHMoved:
              chessState.whiteRookHMoved,

            blackRookAMoved:
              chessState.blackRookAMoved,

            blackRookHMoved:
              chessState.blackRookHMoved,

            enPassantTarget:
              chessState.enPassantTarget
                ? [
                    ...chessState.enPassantTarget
                  ]
                : null

          }

        : null
  };
}


function restoreGameState(state) {

  if (!state) {
    return;
  }


  if (
    Array.isArray(
      state.board
    )
  ) {

    board =
      state.board.map(
        row => [...row]
      );
  }


  turn =
    state.turn || "w";


  lastMove =
    state.lastMove
      ? [...state.lastMove]
      : null;


  if (
    state.chessState &&
    typeof chessState !==
      "undefined"
  ) {

    Object.assign(
      chessState,
      state.chessState
    );
  }


  selected = null;

  gameOver = false;

  localResultDone = false;


  draw();
}


/* =========================================================
   RÄUME – REGISTRIEREN
========================================================= */

async function registerRoom() {

  if (
    !sb ||
    !room
  ) {
    return;
  }


  try {

    const result =
      await sb
        .from("rooms")
        .upsert(
          {

            room_code:
              room,

            player_name:
              getName(),

            player_rating:
              rating,

            status:
              "open",

            created_at:
              new Date()
                .toISOString()

          },
          {
            onConflict:
              "room_code"
          }
        );


    if (result.error) {
      throw result.error;
    }


    await refreshRooms();

  } catch (error) {

    console.warn(
      "Raum konnte nicht registriert werden:",
      error
    );


    roomInfo(
      "Raum-Code: " +
      room +
      " · Online-Raumliste momentan nicht verfügbar"
    );
  }
}


/* =========================================================
   RAUM LÖSCHEN
========================================================= */

async function unregisterRoom() {

  if (
    !sb ||
    !room
  ) {
    return;
  }


  try {

    await sb
      .from("rooms")
      .delete()
      .eq(
        "room_code",
        room
      );

  } catch (error) {

    console.warn(
      "Raum konnte nicht entfernt werden:",
      error
    );
  }
}


/* =========================================================
   RÄUME AKTUALISIEREN
========================================================= */

async function refreshRooms() {

  const box =
    document.getElementById(
      "roomList"
    );


  if (
    !box ||
    !sb
  ) {
    return;
  }


  const searchInput =
    document.getElementById(
      "roomSearch"
    );


  const query =
    (
      searchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  box.innerHTML =
    '<div class="empty">⏳ Räume werden geladen …</div>';


  try {

    const result =
      await sb
        .from("rooms")
        .select(
          "room_code,player_name,player_rating,created_at,status"
        )
        .eq(
          "status",
          "open"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(50);


    if (result.error) {
      throw result.error;
    }


    const rooms =
      (result.data || [])
        .filter(
          r =>
            !query ||
            String(
              r.room_code
            )
              .toLowerCase()
              .includes(query) ||
            String(
              r.player_name
            )
              .toLowerCase()
              .includes(query)
        );


    if (!rooms.length) {

      box.innerHTML =
        '<div class="empty">Keine offenen Räume gefunden.</div>';

      return;
    }


    box.innerHTML =
      rooms
        .map(
          r => `

            <div class="room-item">

              <div>

                <b>
                  ♟
                  ${escapeHtml(
                    r.player_name
                  )}
                </b>

                <br>

                <small>
                  Raum
                  ${escapeHtml(
                    r.room_code
                  )}
                  ·
                  ${r.player_rating || 1000}
                  Punkte
                </small>

              </div>


              <div class="room-actions">

                <span class="pill">
                  🟢 Offen
                </span>


                <button
                  type="button"
                  onclick="joinListedRoom('${escapeJs(
                    r.room_code
                  )}')"
                >
                  Beitreten
                </button>

              </div>

            </div>

          `
        )
        .join("");

  } catch (error) {

    console.error(
      "Räume:",
      error
    );


    box.innerHTML =
      `
      <div class="empty">
        ⚠️ Räume konnten nicht geladen werden.
      </div>
      `;
  }
}


/* =========================================================
   RAUM AUS LISTE BEITRETEN
========================================================= */

function joinListedRoom(code) {

  const input =
    document.getElementById(
      "roomInput"
    ) ||
    document.getElementById(
      "roomSearch"
    );


  if (input) {
    input.value = code;
  }


  joinRoom(
    code
  );
}


/* =========================================================
   SCHNELL SPIELEN
========================================================= */

async function quickJoin() {

  if (!sb) {

    showMessage(
      "Online-Raumsuche ist nicht verfügbar."
    );

    return;
  }


  try {

    const result =
      await sb
        .from("rooms")
        .select(
          "room_code"
        )
        .eq(
          "status",
          "open"
        )
        .limit(50);


    if (result.error) {
      throw result.error;
    }


    if (
      !result.data?.length
    ) {

      showMessage(
        "Keine offenen Räume gefunden."
      );

      return;
    }


    const randomRoom =
      result.data[
        Math.floor(
          Math.random() *
          result.data.length
        )
      ];


    joinRoomByCode(
      randomRoom.room_code
    );

  } catch (error) {

    console.error(
      "Schnellspiel:",
      error
    );


    showMessage(
      "Die Gegnersuche ist momentan nicht verfügbar."
    );
  }
}


function startQuickGame() {

  quickJoin();
}


/* =========================================================
   RAUMCODE
========================================================= */

function joinRoomByCode(code) {

  const cleanCode =
    String(code || "")
      .trim()
      .toUpperCase();


  if (!cleanCode) {

    showMessage(
      "Bitte einen Raumcode eingeben."
    );

    return;
  }


  const input =
    document.getElementById(
      "roomInput"
    );


  if (input) {
    input.value =
      cleanCode;
  }


  joinRoom(
    cleanCode
  );
}


/* =========================================================
   RAUM ERSTELLEN
========================================================= */

async function createRoom() {

  await syncPlayer();


  room =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();


  myColor = "w";


  showGame();

  fresh();


  roomInfo(
    "Raum-Code: " +
    room +
    " · Verbindung wird vorbereitet …"
  );


  if (
    typeof Peer ===
    "undefined"
  ) {

    roomInfo(
      "PeerJS konnte nicht geladen werden."
    );


    showMessage(
      "PeerJS ist nicht geladen."
    );


    return;
  }


  try {

    peer =
      new Peer(
        "schacharena-" +
        room
      );


    peer.on(
      "open",
      async () => {

        await registerRoom();


        roomInfo(
          "Raum-Code: " +
          room +
          " · Warte auf Gegner …"
        );


        showMessage(
          "Raum erstellt: " +
          room
        );
      }
    );


    peer.on(
      "connection",
      connection => {

        conn =
          connection;


        setupConnection();


        conn.on(
          "open",
          () => {

            conn.send({

              type: "state",

              state:
                getGameState()

            });


            unregisterRoom();
          }
        );
      }
    );


    peer.on(
      "error",
      error => {

        console.error(
          "PeerJS:",
          error
        );


        roomInfo(
          "Raum-Code: " +
          room +
          " · Verbindungsfehler"
        );
      }
    );

  } catch (error) {

    console.error(
      "Raumerstellung:",
      error
    );


    roomInfo(
      "Raum konnte nicht erstellt werden."
    );
  }
}


/* =========================================================
   RAUM BEITRETEN
========================================================= */

function joinRoom(
  codeFromDashboard = null
) {

  syncPlayer();


  let input =
    document.getElementById(
      "roomInput"
    );


  if (!input) {

    input =
      document.getElementById(
        "roomSearch"
      );
  }


  const code =
    (
      codeFromDashboard ||
      input?.value ||
      ""
    )
      .trim()
      .toUpperCase();


  if (!code) {

    showMessage(
      "Bitte einen Raumcode eingeben."
    );


    input?.focus();


    return;
  }


  room =
    code;


  myColor =
    "b";


  showGame();

  fresh();


  roomInfo(
    "Verbinde mit Raum " +
    room +
    " …"
  );


  if (
    typeof Peer ===
    "undefined"
  ) {

    showMessage(
      "PeerJS ist nicht geladen."
    );


    return;
  }


  try {

    peer =
      new Peer();


    peer.on(
      "open",
      () => {

        conn =
          peer.connect(
            "schacharena-" +
            room
          );


        setupConnection();

      }
    );


    peer.on(
      "error",
      error => {

        console.error(
          "Peer-Fehler:",
          error
        );


        roomInfo(
          "❌ Raum nicht gefunden oder Verbindung fehlgeschlagen."
        );


        showMessage(
          "Verbindung zum Raum fehlgeschlagen."
        );
      }
    );

  } catch (error) {

    console.error(
      "Raumbeitritt:",
      error
    );


    showMessage(
      "Raum konnte nicht betreten werden."
    );
  }
}


/* =========================================================
   PEERJS VERBINDUNG
========================================================= */

function setupConnection() {

  if (!conn) {
    return;
  }


  const colorElement =
    document.getElementById(
      "color"
    );


  if (colorElement) {

    colorElement.textContent =
      "Du: " +
      (
        myColor === "w"
          ? "Weiß"
          : "Schwarz"
      );
  }


  conn.on(
    "open",
    () => {

      roomInfo(
        "Verbunden · Raum-Code: " +
        room
      );
    }
  );


  conn.on(
    "data",
    message => {

      if (!message) {
        return;
      }


      /* Spielstand */

      if (
        message.type ===
        "state"
      ) {

        if (
          message.state
        ) {

          restoreGameState(
            message.state
          );

        } else {

          board =
            message.b
              ? message.b.map(
                  row => [...row]
                )
              : board;


          turn =
            message.turn ||
            "w";


          draw();
        }


        return;
      }


      /* Zug */

      if (
        message.type ===
        "move"
      ) {

        if (
          Array.isArray(
            message.m
          )
        ) {

          applyMove(
            ...message.m,
            false
          );
        }


        return;
      }


      /* Spielende */

      if (
        message.type ===
        "gameover"
      ) {

        gameOver =
          true;


        const winner =
          message.winner;


        if (
          winner ===
          myColor
        ) {

          score("win");

        } else {

          score("loss");
        }


        showMessage(
          winner === myColor
            ? "🎉 Du hast gewonnen!"
            : "😕 Du hast verloren."
        );


        draw();


        return;
      }


      /* Remis */

      if (
        message.type ===
        "draw"
      ) {

        gameOver =
          true;


        score("draw");


        showMessage(
          "🤝 Remis"
        );


        draw();


        return;
      }


      /* Neues Spiel */

      if (
        message.type ===
        "reset"
      ) {

        fresh();


        showMessage(
          "Neues Spiel gestartet."
        );


        return;
      }
    }
  );


  conn.on(
    "close",
    () => {

      roomInfo(
        "Verbindung zum Gegner wurde beendet."
      );


      if (!gameOver) {

        showMessage(
          "⚠️ Der Gegner hat die Verbindung beendet."
        );
      }
    }
  );


  conn.on(
    "error",
    error => {

      console.error(
        "Verbindungsfehler:",
        error
      );


      roomInfo(
        "Verbindungsfehler."
      );
    }
  );
}


/* =========================================================
   SPIELANSICHT
========================================================= */

function showGame() {

  let game =
    document.getElementById(
      "game"
    );


  if (!game) {

    game =
      document.createElement(
        "section"
      );


    game.id =
      "game";


    game.className =
      "game-screen";


    game.innerHTML = `

      <div class="game-inner">


        <div class="game-header">

          <button
            type="button"
            class="secondary-button"
            onclick="backLobby()"
          >
            ← Zurück
          </button>


          <div>

            <h2>
              SchachArena
            </h2>

            <p id="roomInfo">
              Spiel wird vorbereitet …
            </p>

          </div>


          <button
            type="button"
            class="secondary-button"
            onclick="copyRoom()"
          >
            Raumcode kopieren
          </button>

        </div>


        <div class="game-status">

          <span id="color">
            Du: —
          </span>


          <strong id="turn">
            Am Zug: Weiß
          </strong>

        </div>


        <div
          id="board"
          class="board"
          aria-label="Schachbrett"
        ></div>


        <div class="game-controls">

          <button
            type="button"
            class="outline-button"
            onclick="newGame()"
          >
            NEUES SPIEL
          </button>


          <button
            type="button"
            class="outline-button"
            onclick="backLobby()"
          >
            ZURÜCK
          </button>

        </div>

      </div>
    `;


    document.body.appendChild(
      game
    );


    addGameStyles();
  }


  game.style.display =
    "block";


  const app =
    document.querySelector(
      ".app"
    );


  if (app) {

    app.style.display =
      "none";
  }


  document.body.classList.add(
    "game-active"
  );


  draw();
}


/* =========================================================
   SPIEL CSS
========================================================= */

function addGameStyles() {

  if (
    document.getElementById(
      "schacharena-game-style"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "schacharena-game-style";


  style.textContent = `

    .game-screen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      overflow: auto;
      background:
        radial-gradient(
          circle at top,
          #18284d 0%,
          #090d18 55%,
          #05070c 100%
        );
      color: white;
      padding: 24px;
    }


    .game-inner {
      width: min(100%, 900px);
      margin: 0 auto;
    }


    .game-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
    }


    .game-header h2 {
      margin: 0;
    }


    .game-header p {
      margin: 5px 0 0;
      opacity: .7;
    }


    .game-status {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 15px 18px;
      margin-bottom: 18px;
      border-radius: 14px;
      background: rgba(255,255,255,.08);
    }


    .board {
      width: min(90vw, 720px);
      aspect-ratio: 1;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(8, 1fr);
      overflow: hidden;
      border-radius: 14px;
      box-shadow: 0 25px 80px rgba(0,0,0,.45);
    }


    .sq {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      position: relative;
    }


    .sq.light {
      background: #e8d7b1;
    }


    .sq.dark {
      background: #6f5137;
    }


    .sq.selected {
      box-shadow:
        inset 0 0 0 5px #36a3ff;
    }


    .sq.last {
      box-shadow:
        inset 0 0 0 4px rgba(255,215,70,.65);
    }


    .piece {
      font-size: clamp(30px, 7vw, 68px);
      line-height: 1;
      transform: translateY(-2px);
    }


    .piece.white {
      color: #fff;
      text-shadow:
        0 2px 2px rgba(0,0,0,.75);
    }


    .piece.black {
      color: #171717;
      text-shadow:
        0 1px 1px rgba(255,255,255,.25);
    }


    .game-controls {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }


    @media (max-width: 600px) {

      .game-screen {
        padding: 12px;
      }

      .game-header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .game-status {
        font-size: 14px;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   RAUMINFO
========================================================= */

function roomInfo(text) {

  const element =
    document.getElementById(
      "roomInfo"
    );


  if (element) {

    element.textContent =
      text;
  }
}


/* =========================================================
   RAUMCODE KOPIEREN
========================================================= */

async function copyRoom() {

  if (!room) {

    showMessage(
      "Kein Raumcode vorhanden."
    );

    return;
  }


  try {

    await navigator.clipboard.writeText(
      room
    );


    showMessage(
      "Raum-Code kopiert: " +
      room
    );

  } catch (error) {

    window.prompt(
      "Raum-Code kopieren:",
      room
    );
  }
}


/* =========================================================
   NEUES SPIEL
========================================================= */

function newGame() {

  fresh();


  if (
    conn &&
    conn.open
  ) {

    conn.send({
      type: "reset"
    });
  }


  roomInfo(
    "Neues Spiel · Raum-Code: " +
    room
  );
}


/* =========================================================
   ZURÜCK
========================================================= */

async function backLobby() {

  await unregisterRoom();


  if (conn) {

    try {
      conn.close();
    } catch (_) {}
  }


  if (peer) {

    try {
      peer.destroy();
    } catch (_) {}
  }


  conn = null;
  peer = null;


  const game =
    document.getElementById(
      "game"
    );


  if (game) {

    game.style.display =
      "none";
  }


  const app =
    document.querySelector(
      ".app"
    );


  if (app) {

    app.style.display =
      "";
  }


  document.body.classList.remove(
    "game-active"
  );


  room = "";

  myColor = null;


  fresh();


  window.scrollTo(
    0,
    0
  );


  refreshRooms();
}


/* =========================================================
   FREUNDE
   ABSICHTLICH OHNE BEISPIEL-BOTS
========================================================= */

function openFriends() {

  const existing =
    document.getElementById(
      "friendsModal"
    );


  if (existing) {

    existing.remove();

    return;
  }


  const modal =
    createModal(
      "Freunde",
      `

        <div
          class="friends-empty"
          style="
            text-align:center;
            padding:25px 10px;
          "
        >

          <div
            style="
              font-size:48px;
              margin-bottom:12px;
            "
          >
            👥
          </div>


          <h3>
            Noch keine Freunde
          </h3>


          <p
            style="
              opacity:.65;
              margin-bottom:20px;
            "
          >
            Deine Freundesliste ist momentan leer.
          </p>


          <button
            type="button"
            class="modal-primary"
            onclick="addFriend()"
          >
            + Freund hinzufügen
          </button>

        </div>

      `
    );


  modal.id =
    "friendsModal";


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   FREUND HINZUFÜGEN
========================================================= */

function addFriend() {

  const name =
    window.prompt(
      "Spielernamen eingeben:"
    );


  if (!name) {
    return;
  }


  const cleanName =
    String(name)
      .trim()
      .slice(0, 18);


  if (!cleanName) {
    return;
  }


  showMessage(
    "Freundesanfrage an " +
    cleanName +
    " wurde gesendet."
  );
}


/* =========================================================
   FREUND HERAUSFORDERN
========================================================= */

function challengeFriend(name) {

  showMessage(
    "♟ Spielanfrage an " +
    name +
    " wird vorbereitet …"
  );
}


/* =========================================================
   RANKING POPUP
========================================================= */

function openRanking() {

  const modal =
    createModal(
      "Ranking",
      `

        <div id="leaderboard">

          <div class="empty">
            ⏳ Rangliste wird geladen …
          </div>

        </div>

      `
    );


  document.body.appendChild(
    modal
  );


  loadLeaderboard();
}


/* =========================================================
   NACHRICHTEN
========================================================= */

function openMessages() {

  const modal =
    createModal(
      "Nachrichten",
      `

        <div class="message-box">

          <div class="message-item unread">

            <div class="message-avatar">
              ♟
            </div>


            <div>

              <b>
                SchachArena
              </b>


              <p>
                Willkommen bei SchachArena!
              </p>


              <small>
                Neu
              </small>

            </div>

          </div>


          <div class="message-empty">
            Deine Nachrichten werden hier angezeigt.
          </div>

        </div>

      `
    );


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   EINSTELLUNGEN
========================================================= */

function openSettings() {

  const currentName =
    getName();


  const modal =
    createModal(
      "Einstellungen",
      `

        <div class="settings-form">

          <label>

            Benutzername

            <input
              id="settingsName"
              type="text"
              maxlength="18"
              value="${escapeHtml(
                currentName
              )}"
            >

          </label>


          <label class="setting-check">

            <input
              id="soundSetting"
              type="checkbox"
              checked
            >

            Sounds aktivieren

          </label>


          <button
            type="button"
            class="modal-primary"
            onclick="saveSettings()"
          >
            Einstellungen speichern
          </button>

        </div>

      `
    );


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   EINSTELLUNGEN SPEICHERN
========================================================= */

function saveSettings() {

  const input =
    document.getElementById(
      "settingsName"
    );


  if (input) {

    setName(
      input.value
    );
  }


  updateDashboardName();

  syncPlayer();


  closeCurrentModal();


  showMessage(
    "Einstellungen gespeichert."
  );
}


/* =========================================================
   PROFIL
========================================================= */

function openProfile() {

  const name =
    getName();


  const modal =
    createModal(
      "Profil",
      `

        <div class="profile-modal">

          <div class="profile-modal-avatar">

            <img
              src="assets/profile-placeholder.jpg"
              alt="${escapeHtml(name)}"
            >

          </div>


          <h3>
            ${escapeHtml(name)}
          </h3>


          <p>
            🟢 Online
          </p>


          <div class="profile-stat-grid">

            <div>

              <strong>
                ${rating}
              </strong>

              <small>
                Rating
              </small>

            </div>


            <div>

              <strong>
                ${wins}
              </strong>

              <small>
                Siege
              </small>

            </div>


            <div>

              <strong>
                ${losses}
              </strong>

              <small>
                Niederlagen
              </small>

            </div>

          </div>

        </div>

      `
    );


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   MODAL
========================================================= */

function createModal(
  title,
  content
) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "sa-modal";


  wrapper.innerHTML = `

    <div class="sa-modal-backdrop"></div>


    <div class="sa-modal-window">

      <div class="sa-modal-header">

        <h2>
          ${escapeHtml(title)}
        </h2>


        <button
          type="button"
          class="sa-modal-close"
          aria-label="Schließen"
        >
          ×
        </button>

      </div>


      <div class="sa-modal-content">
        ${content}
      </div>

    </div>

  `;


  const close =
    () => wrapper.remove();


  wrapper
    .querySelector(
      ".sa-modal-close"
    )
    .addEventListener(
      "click",
      close
    );


  wrapper
    .querySelector(
      ".sa-modal-backdrop"
    )
    .addEventListener(
      "click",
      close
    );


  return wrapper;
}


/* =========================================================
   MODAL SCHLIESSEN
========================================================= */

function closeCurrentModal() {

  const modal =
    document.querySelector(
      ".sa-modal"
    );


  if (modal) {
    modal.remove();
  }
}


/* =========================================================
   DASHBOARD NAME
========================================================= */

function updateDashboardName() {

  const name =
    getName();


  const welcome =
    document.querySelector(
      ".welcome h1"
    );


  if (welcome) {

    welcome.innerHTML =
      escapeHtml(name) +
      ' <span class="verified">✓</span>';
  }


  document
    .querySelectorAll(
      ".profile-box h3"
    )
    .forEach(
      element => {

        element.innerHTML =
          escapeHtml(name) +
          ' <span class="verified small">✓</span>';

      }
    );


  document
    .querySelectorAll(
      'img[alt="Nico"]'
    )
    .forEach(
      image => {

        image.alt =
          name;

      }
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  const links =
    document.querySelectorAll(
      ".nav-link"
    );


  links.forEach(
    link => {

      link.addEventListener(
        "click",
        event => {

          event.preventDefault();


          const text =
            link
              .querySelector(
                "span:last-child"
              )
              ?.textContent
              .trim()
              .toLowerCase();


          links.forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


          link.classList.add(
            "active"
          );


          if (
            text === "spielen"
          ) {

            showGameLobby();

            return;
          }


          if (
            text === "freunde"
          ) {

            openFriends();

            return;
          }


          if (
            text === "ranking"
          ) {

            openRanking();

            return;
          }


          if (
            text === "nachrichten"
          ) {

            openMessages();

            return;
          }


          if (
            text === "einstellungen"
          ) {

            openSettings();

            return;
          }


          if (
            text === "übersicht"
          ) {

            window.scrollTo(
              0,
              0
            );
          }

        }
      );
    }
  );
}


/* =========================================================
   SPIELEN LOBBY
========================================================= */

function showGameLobby() {

  const modal =
    createModal(
      "Spielen",
      `

        <div class="play-options">


          <button
            type="button"
            class="play-option"
            onclick="
              startQuickGame();
              closeCurrentModal();
            "
          >

            <span>
              ⚡
            </span>


            <div>

              <b>
                Schnell spielen
              </b>

              <small>
                Finde automatisch einen Gegner.
              </small>

            </div>

          </button>


          <button
            type="button"
            class="play-option"
            onclick="
              createRoom();
              closeCurrentModal();
            "
          >

            <span>
              ＋
            </span>


            <div>

              <b>
                Raum erstellen
              </b>

              <small>
                Erstelle einen privaten Raum.
              </small>

            </div>

          </button>


          <div class="play-join">

            <b>
              Raum beitreten
            </b>


            <div>

              <input
                id="modalRoomInput"
                type="text"
                maxlength="12"
                placeholder="Raumcode"
              >


              <button
                type="button"
                onclick="joinFromModal()"
              >
                Beitreten
              </button>

            </div>

          </div>

        </div>

      `
    );


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   MODAL RAUM BEITRETEN
========================================================= */

function joinFromModal() {

  const input =
    document.getElementById(
      "modalRoomInput"
    );


  const code =
    input?.value
      .trim()
      .toUpperCase();


  if (!code) {

    showMessage(
      "Bitte Raumcode eingeben."
    );


    input?.focus();


    return;
  }


  closeCurrentModal();


  joinRoomByCode(
    code
  );
}


/* =========================================================
   TOP BUTTONS
========================================================= */

function setupTopButtons() {

  const buttons =
    document.querySelectorAll(
      ".top-button"
    );


  buttons.forEach(
    (button, index) => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();


          if (index === 0) {

            showGameLobby();

          } else {

            openMessages();
          }

        }
      );
    }
  );


  const profileButton =
    document.querySelector(
      ".profile-small"
    );


  if (profileButton) {

    profileButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        openProfile();

      }
    );
  }
}


/* =========================================================
   DASHBOARD BUTTONS
========================================================= */

function setupDashboardButtons() {

  const profileButton =
    document.querySelector(
      ".full-button"
    );


  if (profileButton) {

    const profileCard =
      profileButton.closest(
        ".side-card"
      );


    if (
      profileCard &&
      profileCard
        .querySelector(
          ".side-title"
        )
        ?.textContent
        .includes("PROFIL")
    ) {

      profileButton.addEventListener(
        "click",
        event => {

          event.preventDefault();

          openProfile();

        }
      );
    }
  }


  const search =
    document.getElementById(
      "roomSearch"
    );


  if (search) {

    search.addEventListener(
      "input",
      () => refreshRooms()
    );
  }
}


/* =========================================================
   TOAST
========================================================= */

function showMessage(text) {

  const old =
    document.querySelector(
      ".toast"
    );


  if (old) {
    old.remove();
  }


  const message =
    document.createElement(
      "div"
    );


  message.className =
    "toast";


  message.textContent =
    text;


  document.body.appendChild(
    message
  );


  requestAnimationFrame(
    () => {

      message.classList.add(
        "show"
      );

    }
  );


  setTimeout(
    () => {

      message.classList.remove(
        "show"
      );


      setTimeout(
        () => {

          if (
            message.parentNode
          ) {

            message.remove();
          }

        },
        250
      );

    },
    2600
  );
}


/* =========================================================
   APP CSS
========================================================= */

function addAppStyles() {

  if (
    document.getElementById(
      "schacharena-app-style"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "schacharena-app-style";


  style.textContent = `

    .sa-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }


    .sa-modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(8px);
    }


    .sa-modal-window {
      position: relative;
      width: min(100%, 620px);
      max-height: 90vh;
      overflow: auto;
      background: #151923;
      color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 22px;
      box-shadow: 0 30px 100px rgba(0,0,0,.6);
    }


    .sa-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 22px 24px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }


    .sa-modal-header h2 {
      margin: 0;
    }


    .sa-modal-close {
      border: 0;
      background: rgba(255,255,255,.08);
      color: #fff;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      font-size: 25px;
      cursor: pointer;
    }


    .sa-modal-content {
      padding: 24px;
    }


    .play-options {
      display: grid;
      gap: 14px;
    }


    .play-option {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      padding: 18px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 16px;
      background: rgba(255,255,255,.05);
      color: white;
      text-align: left;
      cursor: pointer;
    }


    .play-option:hover {
      background: rgba(255,255,255,.1);
    }


    .play-option > span {
      font-size: 30px;
    }


    .play-option b,
    .play-option small {
      display: block;
    }


    .play-option small {
      margin-top: 4px;
      opacity: .65;
    }


    .play-join {
      padding: 18px;
      border-radius: 16px;
      background: rgba(255,255,255,.04);
    }


    .play-join > b {
      display: block;
      margin-bottom: 10px;
    }


    .play-join > div {
      display: flex;
      gap: 8px;
    }


    .play-join input,
    .settings-form input {
      min-width: 0;
      flex: 1;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(0,0,0,.25);
      color: white;
    }


    .play-join button,
    .modal-primary,
    .modal-friend button {
      border: 0;
      border-radius: 10px;
      padding: 11px 16px;
      cursor: pointer;
      background: #267cff;
      color: white;
      font-weight: 700;
    }


    .modal-primary {
      width: 100%;
    }


    .settings-form {
      display: grid;
      gap: 18px;
    }


    .settings-form label {
      display: grid;
      gap: 8px;
      font-weight: 600;
    }


    .setting-check {
      display: flex !important;
      align-items: center;
      gap: 8px;
    }


    .profile-modal {
      text-align: center;
    }


    .profile-modal-avatar {
      width: 100px;
      height: 100px;
      margin: 0 auto 15px;
      overflow: hidden;
      border-radius: 50%;
    }


    .profile-modal-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }


    .profile-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 22px;
    }


    .profile-stat-grid > div {
      padding: 15px 8px;
      border-radius: 12px;
      background: rgba(255,255,255,.05);
    }


    .profile-stat-grid strong,
    .profile-stat-grid small {
      display: block;
    }


    .profile-stat-grid small {
      opacity: .6;
      margin-top: 3px;
    }


    .message-item {
      display: flex;
      gap: 12px;
      padding: 15px;
      border-radius: 13px;
      background: rgba(255,255,255,.05);
    }


    .message-item p {
      margin: 5px 0;
    }


    .message-item small {
      opacity: .55;
    }


    .message-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #303b59;
    }


    .message-empty {
      margin-top: 18px;
      opacity: .55;
      text-align: center;
    }


    .toast {
      position: fixed;
      z-index: 20000;
      left: 50%;
      bottom: 30px;
      transform: translate(-50%, 20px);
      padding: 13px 18px;
      border-radius: 12px;
      background: #171a23;
      color: white;
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 15px 40px rgba(0,0,0,.4);
      opacity: 0;
      transition: .25s ease;
      pointer-events: none;
      text-align: center;
    }


    .toast.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }


    /* ================================================
       BELOHNUNGS-POPUP
    ================================================= */

    .rewards-popup-overlay {
      position: fixed;
      inset: 0;
      z-index: 15000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(8px);
    }


    .rewards-popup {
      position: relative;
      width: min(100%, 560px);
      max-height: 90vh;
      overflow: auto;
      padding: 30px 24px 24px;
      border-radius: 22px;
      background: #151923;
      color: white;
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 30px 100px rgba(0,0,0,.6);
    }


    .rewards-popup-close {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.08);
      color: white;
      font-size: 25px;
      cursor: pointer;
    }


    .rewards-popup-icon {
      font-size: 45px;
      text-align: center;
      margin-bottom: 8px;
    }


    .rewards-popup h2 {
      margin: 0;
      text-align: center;
    }


    .rewards-subtitle {
      text-align: center;
      opacity: .6;
      margin-bottom: 22px;
    }


    .reward-task {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 15px;
      background: rgba(255,255,255,.05);
    }


    .task-icon {
      width: 45px;
      height: 45px;
      flex: 0 0 45px;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: rgba(255,255,255,.08);
      font-size: 23px;
    }


    .task-content {
      flex: 1;
      min-width: 0;
    }


    .task-content strong,
    .task-content span {
      display: block;
    }


    .task-content span {
      margin-top: 4px;
      opacity: .6;
      font-size: 14px;
    }


    .task-progress {
      height: 7px;
      margin-top: 9px;
      overflow: hidden;
      border-radius: 10px;
      background: rgba(255,255,255,.1);
    }


    .task-progress > div {
      height: 100%;
      border-radius: inherit;
      background: #267cff;
      transition: width .3s ease;
    }


    .task-reward {
      white-space: nowrap;
      font-weight: 700;
    }


    .rewards-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding: 16px;
      border-radius: 14px;
      background: rgba(255,255,255,.08);
    }


    .rewards-total strong {
      font-size: 18px;
    }


    @media(max-width:600px) {

      .sa-modal {
        padding: 10px;
      }


      .sa-modal-content {
        padding: 17px;
      }


      .play-join > div {
        flex-direction: column;
      }


      .profile-stat-grid {
        grid-template-columns: 1fr;
      }


      .rewards-popup-overlay {
        padding: 10px;
      }


      .rewards-popup {
        padding: 28px 15px 18px;
      }


      .reward-task {
        gap: 9px;
      }


      .task-reward {
        font-size: 13px;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   INIT
========================================================= */

function initApp() {

  addAppStyles();


  loadCoins();

  loadDailyTasks();


  updateDashboardName();

  updateRanking();

  updateRewardsDisplays();


  setupNavigation();

  setupTopButtons();

  setupDashboardButtons();


  refreshRooms();

  loadLeaderboard();


  /* Name-Eingabe */

  const nameInput =
    document.getElementById(
      "nameInput"
    );


  if (nameInput) {

    if (
      nameInput.value
    ) {

      setName(
        nameInput.value
      );
    }


    nameInput.addEventListener(
      "change",
      () => {

        setName(
          nameInput.value
        );


        syncPlayer();

        updateDashboardName();

      }
    );
  }


  /* Raumcode Enter */

  const roomInput =
    document.getElementById(
      "roomSearch"
    );


  if (roomInput) {

    roomInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          event.preventDefault();


          const code =
            roomInput.value
              .trim()
              .toUpperCase();


          if (code) {

            joinRoomByCode(
              code
            );
          }
        }
      }
    );
  }


  /* Globale Funktionen */

  window.startQuickGame =
    startQuickGame;

  window.quickJoin =
    quickJoin;

  window.createRoom =
    createRoom;

  window.joinRoom =
    joinRoom;

  window.joinRoomByCode =
    joinRoomByCode;

  window.joinListedRoom =
    joinListedRoom;

  window.joinFromModal =
    joinFromModal;

  window.openRewards =
    openRewards;

  window.updateRewardsDisplays =
    updateRewardsDisplays;

  window.openFriends =
    openFriends;

  window.openRanking =
    openRanking;

  window.openMessages =
    openMessages;

  window.openSettings =
    openSettings;

  window.openProfile =
    openProfile;

  window.addFriend =
    addFriend;

  window.challengeFriend =
    challengeFriend;

  window.copyRoom =
    copyRoom;

  window.newGame =
    newGame;

  window.backLobby =
    backLobby;

  window.saveSettings =
    saveSettings;

  window.closeCurrentModal =
    closeCurrentModal;

  window.showMessage =
    showMessage;


  window.joinRoomDashboard =
    function () {

      const input =
        document.getElementById(
          "roomSearch"
        );


      if (!input) {

        showMessage(
          "Raumcode-Feld wurde nicht gefunden."
        );

        return;
      }


      const code =
        input.value
          .trim()
          .toUpperCase();


      if (!code) {

        input.focus();

        return;
      }


      joinRoomByCode(
        code
      );
    };


  window.createRoomDashboard =
    createRoom;


  window.findOpponent =
    quickJoin;


  /* Schachbrett vorbereiten */

  fresh();
}


/* =========================================================
   APP STARTEN
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initApp
  );

} else {

  initApp();
}
