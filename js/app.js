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

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
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
   TÄGLICHE HERAUSFORDERUNGEN
========================================================= */


/* =========================================================
   MÜNZ-SHOP
========================================================= */

const SHOP_ITEMS = [
  {
    id: "board_ocean",
    category: "Bretter",
    name: "🌊 Ozean-Brett",
    description: "Blaues Schachbrett im Wasser-Stil.",
    price: 150
  },
  {
    id: "board_forest",
    category: "Bretter",
    name: "🌲 Wald-Brett",
    description: "Dunkles Brett mit natürlichem Look.",
    price: 200
  },
  {
    id: "board_royal",
    category: "Bretter",
    name: "👑 Königs-Brett",
    description: "Elegantes Brett für königliche Partien.",
    price: 250
  },
  {
    id: "board_neon",
    category: "Bretter",
    name: "💜 Neon-Brett",
    description: "Modernes Brett mit futuristischem Stil.",
    price: 300
  },
  {
    id: "pieces_gold",
    category: "Figuren",
    name: "👑 Goldene Figuren",
    description: "Goldener Look für deine Schachfiguren.",
    price: 300
  },
  {
    id: "pieces_ice",
    category: "Figuren",
    name: "❄️ Eis-Figuren",
    description: "Kühler, kristalliner Figuren-Stil.",
    price: 350
  },
  {
    id: "pieces_shadow",
    category: "Figuren",
    name: "🌑 Schatten-Figuren",
    description: "Dunkler und geheimnisvoller Figuren-Stil.",
    price: 400
  },
  {
    id: "effect_fire",
    category: "Effekte",
    name: "🔥 Feuer-Effekt",
    description: "Feuriger Effekt für besondere Momente.",
    price: 400
  },
  {
    id: "effect_spark",
    category: "Effekte",
    name: "✨ Funken-Effekt",
    description: "Glitzernde Funken für deine Partie.",
    price: 450
  },
  {
    id: "profile_frame",
    category: "Profil",
    name: "💎 Diamant-Rahmen",
    description: "Besonderer Rahmen für dein Profil.",
    price: 500
  },
  {
    id: "profile_crown",
    category: "Profil",
    name: "👑 Kronen-Rahmen",
    description: "Zeige deinen königlichen Stil.",
    price: 600
  },
  {
    id: "profile_fire",
    category: "Profil",
    name: "🔥 Feuer-Rahmen",
    description: "Auffälliger Rahmen mit Feuer-Look.",
    price: 700
  }
];


/* Gekaufte Gegenstände laden */

function getPurchasedItems() {

  try {

    return JSON.parse(
      localStorage.getItem(
        "sa_shop_items"
      ) || "[]"
    );

  } catch (error) {

    console.warn(
      "Shop-Daten konnten nicht geladen werden:",
      error
    );

    return [];
  }
}


/* Gekaufte Gegenstände speichern */

function savePurchasedItems(items) {

  localStorage.setItem(
    "sa_shop_items",
    JSON.stringify(items)
  );
}


/* Prüfen, ob Gegenstand gekauft wurde */

function ownsShopItem(id) {

  return getPurchasedItems().includes(id);
}


/* Münz-Shop öffnen */

function openShop() {

  const oldShop =
    document.getElementById(
      "shopPopup"
    );

  if (oldShop) {
    oldShop.remove();
    return;
  }

  const purchased =
    getPurchasedItems();

  const popup =
    document.createElement(
      "div"
    );

  popup.id =
    "shopPopup";

  popup.className =
    "shop-popup-overlay";

  const categories = [
    "Alle",
    ...new Set(
      SHOP_ITEMS.map(
        item =>
          item.category
      )
    )
  ];

  popup.innerHTML = `
    <div class="shop-popup shop-popup-large">

      <button
        type="button"
        class="shop-popup-close"
        id="closeShopPopup"
        aria-label="Shop schließen">
        ×
      </button>

      <div class="shop-popup-icon">
        🛒
      </div>

      <h2>
        Münz-Shop
      </h2>

      <p class="shop-subtitle">
        Sammle Münzen, schalte Extras frei und stelle deinen eigenen Stil zusammen.
      </p>

      <div class="shop-balance">
        🪙
        <strong id="shopCoinBalance">
          ${coins}
        </strong>
        Münzen
      </div>

      <div class="shop-categories">

        ${categories.map(
          (category, index) => `

          <button
            type="button"
            class="shop-category ${
              index === 0
                ? "active"
                : ""
            }"
            data-category="${escapeHtml(
              category
            )}">
            ${escapeHtml(
              category
            )}
          </button>

        `
        ).join("")}

      </div>

      <div
        class="shop-items shop-items-scroll"
        id="shopItemsList">

        ${SHOP_ITEMS.map(
          item => {

            const owned =
              purchased.includes(
                item.id
              );

            const icon =
              item.name.split(
                " "
              )[0];

            return `
              <div
                class="shop-item"
                data-shop-category="${escapeHtml(
                  item.category
                )}">

                <div class="shop-item-icon">
                  ${icon}
                </div>

                <div class="shop-item-content">

                  <span class="shop-item-category">
                    ${escapeHtml(
                      item.category
                    )}
                  </span>

                  <strong>
                    ${escapeHtml(
                      item.name
                    )}
                  </strong>

                  <small>
                    ${escapeHtml(
                      item.description
                    )}
                  </small>

                </div>

                <div class="shop-item-action">

                  ${
                    owned

                      ? `
                        <button
                          type="button"
                          class="shop-owned"
                          disabled>
                          ✓ Gekauft
                        </button>
                      `

                      : `
                        <button
                          type="button"
                          class="shop-buy"
                          onclick="buyShopItem('${escapeJs(
                            item.id
                          )}')">
                          🪙 ${item.price}
                        </button>
                      `
                  }

                </div>

              </div>
            `;
          }
        ).join("")}

      </div>

      <div class="shop-footer">
        Deine Münzen erhältst du durch tägliche Aufgaben.
      </div>

    </div>
  `;

  document.body.appendChild(
    popup
  );

  document
    .getElementById(
      "closeShopPopup"
    )
    ?.addEventListener(
      "click",
      () => popup.remove()
    );


  popup
    .querySelectorAll(
      ".shop-category"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            popup
              .querySelectorAll(
                ".shop-category"
              )
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            const category =
              button.dataset.category;

            popup
              .querySelectorAll(
                ".shop-item"
              )
              .forEach(
                item => {

                  item.style.display =
                    category ===
                      "Alle" ||
                    item.dataset
                      .shopCategory ===
                      category
                      ? "flex"
                      : "none";
                }
              );
          }
        );
      }
    );


  popup.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        popup
      ) {
        popup.remove();
      }

    }
  );
}


function buyShopItem(id) {

  const item =
    SHOP_ITEMS.find(
      shopItem =>
        shopItem.id === id
    );


  if (!item) {

    showMessage(
      "Dieser Gegenstand wurde nicht gefunden."
    );

    return;
  }


  if (
    ownsShopItem(id)
  ) {

    showMessage(
      "Du besitzt diesen Gegenstand bereits."
    );

    return;
  }


  if (
    coins < item.price
  ) {

    showMessage(
      "❌ Du hast nicht genug Münzen."
    );

    return;
  }


  const success =
    spendCoins(
      item.price
    );


  if (!success) {

    showMessage(
      "❌ Kauf konnte nicht durchgeführt werden."
    );

    return;
  }


  const purchased =
    getPurchasedItems();


  purchased.push(
    item.id
  );


  savePurchasedItems(
    purchased
  );


  showMessage(
    "🎉 " +
    item.name +
    " gekauft!"
  );


  const popup =
    document.getElementById(
      "shopPopup"
    );


  if (popup) {

    popup.remove();

    openShop();
  }
}


/* =========================================================
   BELOHNUNGEN ÖFFNEN
========================================================= */

function openRewards() {

  dailyTasks =
    JSON.parse(
      localStorage.getItem(
        "sa_daily_tasks"
      ) || "null"
    );


  createDailyTasks();


  const winsDone =
    Math.min(
      dailyTasks.wins || 0,
      3
    );


  const gamesDone =
    Math.min(
      dailyTasks.games || 0,
      5
    );


  const winsPercent =
    Math.min(
      100,
      (winsDone / 3) * 100
    );


  const gamesPercent =
    Math.min(
      100,
      (gamesDone / 5) * 100
    );


  const oldPopup =
    document.getElementById(
      "rewardsPopup"
    );


  if (oldPopup) {

    oldPopup.remove();

    return;
  }


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
        class="rewards-popup-close"
        id="closeRewardsPopup"
        aria-label="Schließen">
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
            ${winsDone} / 3 geschafft
          </span>

          <div class="task-progress">

            <div
              style="width: ${winsPercent}%">
            </div>

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
            ${gamesDone} / 5 geschafft
          </span>

          <div class="task-progress">

            <div
              style="width: ${gamesPercent}%">
            </div>

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
          🪙 ${coins || 0}
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
        event.target ===
        popup
      ) {

        popup.remove();
      }

    }
  );
}


/* =========================================================
   TÄGLICHE AUFGABEN – DASHBOARD
========================================================= */

function updateRewardsDisplay() {

  createDailyTasks();

  const winsDone =
    Math.min(
      dailyTasks.wins || 0,
      3
    );

  const gamesDone =
    Math.min(
      dailyTasks.games || 0,
      5
    );


  const winElements =
    document.querySelectorAll(
      "[data-daily-wins]"
    );

  winElements.forEach(
    element => {

      element.textContent =
        winsDone + " / 3";

    }
  );


  const gameElements =
    document.querySelectorAll(
      "[data-daily-games]"
    );

  gameElements.forEach(
    element => {

      element.textContent =
        gamesDone + " / 5";

    }
  );


  const winProgress =
    document.querySelectorAll(
      "[data-daily-wins-progress]"
    );

  winProgress.forEach(
    element => {

      element.style.width =
        (
          winsDone / 3 * 100
        ) + "%";

    }
  );


  const gameProgress =
    document.querySelectorAll(
      "[data-daily-games-progress]"
    );

  gameProgress.forEach(
    element => {

      element.style.width =
        (
          gamesDone / 5 * 100
        ) + "%";

    }
  );


  const coinElements =
    document.querySelectorAll(
      "[data-coins]"
    );

  coinElements.forEach(
    element => {

      element.textContent =
        coins;

    }
  );
}


/* =========================================================
   TÄGLICHE AUFGABEN – SPIELERFOLG
========================================================= */


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
            text === "shop" ||
            text === "münz-shop"
          ) {

            openShop();

            return;
          }


          if (
            text === "belohnungen" ||
            text === "aufgaben"
          ) {

            openRewards();

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
   BELOHNUNGEN AKTUELL HALTEN
========================================================= */

function updateRewardsDisplays() {

  createDailyTasks();

  const winsCount =
    Math.min(
      dailyTasks.wins,
      3
    );

  const gamesCount =
    Math.min(
      dailyTasks.games,
      5
    );

  const winsPercent =
    Math.min(
      100,
      Math.round(
        (
          dailyTasks.wins /
          3
        ) *
        100
      )
    );

  const gamesPercent =
    Math.min(
      100,
      Math.round(
        (
          dailyTasks.games /
          5
        ) *
        100
      )
    );


  /* -----------------------------------------
     AUFGABE: 3 SIEGE
  ----------------------------------------- */

  document
    .querySelectorAll(
      "[data-reward-wins]"
    )
    .forEach(
      element => {

        element.textContent =
          winsCount +
          " / 3";
      }
    );


  document
    .querySelectorAll(
      "[data-reward-wins-progress]"
    )
    .forEach(
      element => {

        element.style.width =
          winsPercent +
          "%";
      }
    );


  /* -----------------------------------------
     AUFGABE: 5 PARTIEN
  ----------------------------------------- */

  document
    .querySelectorAll(
      "[data-reward-games]"
    )
    .forEach(
      element => {

        element.textContent =
          gamesCount +
          " / 5";
      }
    );


  document
    .querySelectorAll(
      "[data-reward-games-progress]"
    )
    .forEach(
      element => {

        element.style.width =
          gamesPercent +
          "%";
      }
    );


  /* -----------------------------------------
     ALLGEMEINE REWARDS-ANZEIGE
  ----------------------------------------- */

  document
    .querySelectorAll(
      "[data-rewards-completed]"
    )
    .forEach(
      element => {

        let completed = 0;

        if (
          dailyTasks.wins >= 3
        ) {
          completed++;
        }

        if (
          dailyTasks.games >= 5
        ) {
          completed++;
        }

        element.textContent =
          completed;
      }
    );


  document
    .querySelectorAll(
      "[data-rewards-total]"
    )
    .forEach(
      element => {

        element.textContent =
          "2";
      }
    );


  updateCoinDisplays();
}


/* =========================================================
   RANKING
========================================================= */

function updateRanking() {

  const ratingElement =
    document.querySelector(
      "[data-rating]"
    );

  const winsElement =
    document.querySelector(
      "[data-wins]"
    );

  const lossesElement =
    document.querySelector(
      "[data-losses]"
    );

  const drawsElement =
    document.querySelector(
      "[data-draws]"
    );


  if (
    ratingElement
  ) {

    ratingElement.textContent =
      rating;
  }


  if (
    winsElement
  ) {

    winsElement.textContent =
      wins;
  }


  if (
    lossesElement
  ) {

    lossesElement.textContent =
      losses;
  }


  if (
    drawsElement
  ) {

    drawsElement.textContent =
      draws;
  }
}


/* =========================================================
   RATING SPEICHERN
========================================================= */

function saveRating() {

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
}


/* =========================================================
   RATING AKTUALISIEREN
========================================================= */

function updateRating(result) {

  if (
    result === "win"
  ) {

    wins++;

    rating += 20;
  }


  if (
    result === "loss"
  ) {

    losses++;

    rating =
      Math.max(
        0,
        rating - 15
      );
  }


  if (
    result === "draw"
  ) {

    draws++;

    rating += 5;
  }


  saveRating();

  updateRanking();

  updateDashboardName();

  syncPlayer();
}


/* =========================================================
   DASHBOARD NAME
========================================================= */

function updateDashboardName() {

  const name =
    getName();

  document
    .querySelectorAll(
      "[data-username]"
    )
    .forEach(
      element => {

        element.textContent =
          name;
      }
    );


  document
    .querySelectorAll(
      ".username"
    )
    .forEach(
      element => {

        element.textContent =
          name;
      }
    );


  document
    .querySelectorAll(
      "[data-player-name]"
    )
    .forEach(
      element => {

        element.textContent =
          name;
      }
    );


  const input =
    document.getElementById(
      "nameInput"
    );

  if (
    input &&
    !input.value
  ) {

    input.value =
      name;
  }
}


/* =========================================================
   HTML SICHER DARSTELLEN
========================================================= */

function escapeHtml(value) {

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================================================
   NACHRICHTEN
========================================================= */

function showMessage(
  message,
  title = "SchachArena"
) {

  const existing =
    document.getElementById(
      "sa-message-modal"
    );

  if (
    existing
  ) {

    existing.remove();
  }


  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "sa-message-modal";

  modal.className =
    "sa-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <h3>
          ${escapeHtml(title)}
        </h3>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="sa-modal-body">

        <p>
          ${escapeHtml(message)}
        </p>

      </div>

      <div class="sa-modal-actions">

        <button
          class="primary"
          type="button"
          onclick="closeCurrentModal()"
        >
          OK
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   MODAL SCHLIESSEN
========================================================= */

function closeCurrentModal() {

  document
    .querySelectorAll(
      ".sa-modal"
    )
    .forEach(
      modal => {

        modal.remove();
      }
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  const navigationButtons =
    document.querySelectorAll(
      "[data-nav]"
    );


  navigationButtons.forEach(
    button => {

      if (
        button.dataset.navBound ===
        "true"
      ) {

        return;
      }


      button.dataset.navBound =
        "true";


      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();


          const target =
            button.dataset.nav;


          switch (
            target
          ) {

            case "home":
            case "dashboard":
              showDashboard();
              break;


            case "play":
              showPlay();
              break;


            case "rooms":
              showRooms();
              break;


            case "ranking":
              openRanking();
              break;


            case "friends":
              openFriends();
              break;


            case "messages":
              openMessages();
              break;


            case "settings":
              openSettings();
              break;


            case "profile":
              openProfile();
              break;


            case "rewards":
              openRewards();
              break;


            case "shop":
              openShop();
              break;


            default:

              console.warn(
                "Unbekannter Navigationspunkt:",
                target
              );

          }

        }
      );

    }
  );
}


/* =========================================================
   DASHBOARD ANZEIGEN
========================================================= */

function showDashboard() {

  closeCurrentModal();

  document.body.classList.remove(
    "page-overlay-open"
  );


  const pages =
    document.querySelectorAll(
      "[data-page]"
    );


  pages.forEach(
    page => {

      page.style.display =
        "none";
    }
  );


  const dashboard =
    document.querySelector(
      '[data-page="dashboard"]'
    );


  if (
    dashboard
  ) {

    dashboard.style.display =
      "";
  }


  const app =
    document.querySelector(
      ".app"
    );

  if (
    app
  ) {

    app.style.display =
      "";
  }


  updateDashboardName();

  updateRanking();

  updateCoinDisplays();

  updateRewardsDisplays();
}


/* =========================================================
   SPIELSEITE
========================================================= */

function showPlay() {

  const playPage =
    document.querySelector(
      '[data-page="play"]'
    );


  if (
    playPage
  ) {

    document
      .querySelectorAll(
        "[data-page]"
      )
      .forEach(
        page => {

          page.style.display =
            "none";
        }
      );

    playPage.style.display =
      "";
  }
}


/* =========================================================
   RÄUME
========================================================= */

function showRooms() {

  const roomsPage =
    document.querySelector(
      '[data-page="rooms"]'
    );


  if (
    roomsPage
  ) {

    document
      .querySelectorAll(
        "[data-page]"
      )
      .forEach(
        page => {

          page.style.display =
            "none";
        }
      );

    roomsPage.style.display =
      "";
  }


  refreshRooms();
}


/* =========================================================
   FREUNDE
========================================================= */

function openFriends() {

  closeCurrentModal();


  const friends =
    getFriends();


  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "sa-modal";

  modal.id =
    "sa-friends-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            Freunde
          </h2>

          <p>
            Deine Freundesliste
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="sa-modal-body">

        ${
          friends.length
            ? friends
                .map(
                  friend => `

                    <div class="modal-friend">

                      <div>

                        <strong>
                          ${escapeHtml(
                            friend.username
                          )}
                        </strong>

                        <small>
                          ${
                            friend.status ||
                            "Online"
                          }
                        </small>

                      </div>

                      <div>

                        <button
                          class="primary"
                          onclick="challengeFriend('${escapeHtml(
                            friend.username
                          )}')"
                        >
                          Herausfordern
                        </button>

                        <button
                          onclick="removeFriend('${escapeHtml(
                            friend.username
                          )}')"
                        >
                          Entfernen
                        </button>

                      </div>

                    </div>

                  `
                )
                .join("")
            : `
                <div class="empty">
                  Noch keine Freunde vorhanden.
                </div>
              `
        }

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   FREUNDE AUS LOCALSTORAGE
========================================================= */

function getFriends() {

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          "sa_friends"
        ) || "[]"
      );


    if (
      Array.isArray(
        stored
      )
    ) {

      return stored;
    }

  } catch (
    error
  ) {

    console.error(
      "Freunde konnten nicht geladen werden:",
      error
    );
  }


  return [];
}


/* =========================================================
   FREUNDE SPEICHERN
========================================================= */

function saveFriends(
  friends
) {

  localStorage.setItem(
    "sa_friends",
    JSON.stringify(
      friends
    )
  );
}


/* =========================================================
   FREUND HINZUFÜGEN
========================================================= */

function addFriend(
  username
) {

  username =
    String(
      username || ""
    )
      .trim();


  if (
    !username
  ) {

    return;
  }


  const friends =
    getFriends();


  const exists =
    friends.some(
      friend =>
        String(
          friend.username
        )
          .toLowerCase() ===
        username.toLowerCase()
    );


  if (
    exists
  ) {

    showMessage(
      "Dieser Spieler ist bereits in deiner Freundesliste."
    );

    return;
  }


  friends.push({
    username:
      username,

    status:
      "Offline"
  });


  saveFriends(
    friends
  );


  showMessage(
    username +
    " wurde zu deinen Freunden hinzugefügt."
  );
}


/* =========================================================
   FREUND ENTFERNEN
========================================================= */

function removeFriend(
  username
) {

  const friends =
    getFriends();


  const filtered =
    friends.filter(
      friend =>
        String(
          friend.username
        )
          .toLowerCase() !==
        String(
          username
        )
          .toLowerCase()
    );


  saveFriends(
    filtered
  );


  openFriends();
}


/* =========================================================
   FREUND HERAUSFORDERN
========================================================= */

function challengeFriend(
  username
) {

  closeCurrentModal();


  showMessage(
    username +
    " wurde zu einer Partie herausgefordert."
  );
}


/* =========================================================
   RANKING ÖFFNEN
========================================================= */

function openRanking() {

  closeCurrentModal();


  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "sa-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            🏆 Rangliste
          </h2>

          <p>
            Deine aktuelle Platzierung
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="sa-modal-body">

        <div class="profile-stat-grid">

          <div class="stat-card">

            <span>
              Rating
            </span>

            <strong>
              ${rating}
            </strong>

          </div>

          <div class="stat-card">

            <span>
              Rang
            </span>

            <strong>
              ${rank()}
            </strong>

          </div>

          <div class="stat-card">

            <span>
              Siege
            </span>

            <strong>
              ${wins}
            </strong>

          </div>

          <div class="stat-card">

            <span>
              Niederlagen
            </span>

            <strong>
              ${losses}
            </strong>

          </div>

        </div>

        <div
          id="leaderboard-modal-list"
          class="leaderboard"
        >

          <div class="empty">
            Rangliste wird geladen ...
          </div>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  loadLeaderboard(
    "leaderboard-modal-list"
  );
}


/* =========================================================
   NACHRICHTEN ÖFFNEN
========================================================= */

function openMessages() {

  closeCurrentModal();


  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "sa-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            💬 Nachrichten
          </h2>

          <p>
            Deine Nachrichten
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="sa-modal-body">

        <div class="empty">

          Noch keine Nachrichten vorhanden.

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );
}
/* =========================================================
   FREUNDE
========================================================= */

function openFriends() {

  closeCurrentModal();

  const friends =
    getFriends();

  const modal =
    document.createElement("div");

  modal.className =
    "sa-modal";

  modal.id =
    "sa-friends-modal";

  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            👥 Freunde
          </h2>

          <p>
            Deine Freunde und Schachpartner
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="sa-modal-body">

        <div class="friends-add">

          <input
            id="friendNameInput"
            type="text"
            maxlength="24"
            placeholder="Spielername eingeben"
          />

          <button
            class="primary"
            type="button"
            onclick="addFriend()"
          >
            Freund hinzufügen
          </button>

        </div>

        <div class="friends-list">

          ${
            friends.length === 0
              ? `
                <div class="empty-state">
                  <div>
                    👥
                  </div>

                  <strong>
                    Noch keine Freunde
                  </strong>

                  <p>
                    Füge deinen ersten Freund hinzu.
                  </p>
                </div>
              `
              : friends
                .map(
                  (friend, index) => `

                    <div class="friend-item">

                      <div class="friend-avatar">
                        ♟
                      </div>

                      <div class="friend-info">

                        <strong>
                          ${escapeHtml(
                            friend.name
                          )}
                        </strong>

                        <span>
                          ${
                            friend.online
                              ? "🟢 Online"
                              : "⚪ Offline"
                          }
                        </span>

                      </div>

                      <button
                        type="button"
                        onclick="removeFriend(${index})"
                      >
                        Entfernen
                      </button>

                    </div>

                  `
                )
                .join("")
          }

        </div>

      </div>

    </div>

  `;

  document.body.appendChild(
    modal
  );
}


/* =========================================================
   FREUNDE LADEN
========================================================= */

function getFriends() {

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          "sa_friends"
        ) || "[]"
      );

    if (
      Array.isArray(
        stored
      )
    ) {

      return stored;
    }

  } catch (
    error
  ) {

    console.error(
      "Freunde konnten nicht geladen werden:",
      error
    );

  }

  return [];
}


/* =========================================================
   FREUND HINZUFÜGEN
========================================================= */

function addFriend() {

  const input =
    document.getElementById(
      "friendNameInput"
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {

    showMessage(
      "Bitte gib einen Spielernamen ein."
    );

    return;
  }

  const ownName =
    getName();

  if (
    name.toLowerCase() ===
    ownName.toLowerCase()
  ) {

    showMessage(
      "Du kannst dich nicht selbst hinzufügen."
    );

    return;
  }


  const friends =
    getFriends();


  const alreadyExists =
    friends.some(
      friend =>
        friend.name.toLowerCase() ===
        name.toLowerCase()
    );


  if (
    alreadyExists
  ) {

    showMessage(
      "Dieser Spieler ist bereits in deiner Freundesliste."
    );

    return;
  }


  friends.push({
    name: name,
    online: false
  });


  localStorage.setItem(
    "sa_friends",
    JSON.stringify(
      friends
    )
  );


  showMessage(
    name +
    " wurde zu deinen Freunden hinzugefügt."
  );


  openFriends();
}


/* =========================================================
   FREUND ENTFERNEN
========================================================= */

function removeFriend(
  index
) {

  const friends =
    getFriends();


  if (
    index < 0 ||
    index >= friends.length
  ) {

    return;
  }


  const removed =
    friends[index];


  friends.splice(
    index,
    1
  );


  localStorage.setItem(
    "sa_friends",
    JSON.stringify(
      friends
    )
  );


  showMessage(
    removed.name +
    " wurde entfernt."
  );


  openFriends();
}


/* =========================================================
   SPIELEN
========================================================= */

function openPlay() {

  closeCurrentModal();

  const modal =
    document.createElement("div");

  modal.className =
    "sa-modal";

  modal.id =
    "sa-play-modal";

  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            ♟️ Spielen
          </h2>

          <p>
            Wähle deine Partie.
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>

      <div class="play-options">

        <button
          class="play-option"
          type="button"
          onclick="startGame('computer')"
        >

          <span>
            🤖
          </span>

          <strong>
            Gegen Computer
          </strong>

          <small>
            Spiele gegen einen Bot
          </small>

        </button>


        <button
          class="play-option"
          type="button"
          onclick="startGame('friend')"
        >

          <span>
            👥
          </span>

          <strong>
            Gegen Freund
          </strong>

          <small>
            Spiele gegen einen Freund
          </small>

        </button>


        <button
          class="play-option"
          type="button"
          onclick="startGame('online')"
        >

          <span>
            🌐
          </span>

          <strong>
            Online spielen
          </strong>

          <small>
            Finde einen Gegner
          </small>

        </button>

      </div>

    </div>

  `;

  document.body.appendChild(
    modal
  );
}


/* =========================================================
   SPIEL STARTEN
========================================================= */

function startGame(
  mode
) {

  closeCurrentModal();


  if (
    typeof window.startChessGame ===
    "function"
  ) {

    window.startChessGame(
      mode
    );

    return;
  }


  if (
    typeof window.startGame ===
    "function" &&
    window.startGame !==
    startGame
  ) {

    window.startGame(
      mode
    );

    return;
  }


  showMessage(
    mode === "computer"
      ? "Computer-Spiel wird gestartet."
      : mode === "friend"
        ? "Freundschaftsspiel wird vorbereitet."
        : "Online-Spiel wird vorbereitet."
  );
}


/* =========================================================
   RANGLISTE
========================================================= */

function openLeaderboard() {

  closeCurrentModal();


  const players = [

    {
      name: getName(),
      rating: rating,
      me: true
    },

    {
      name: "SchachProfi",
      rating: 1820
    },

    {
      name: "KnightMaster",
      rating: 1745
    },

    {
      name: "ChessKing",
      rating: 1680
    },

    {
      name: "RookStar",
      rating: 1595
    },

    {
      name: "BishopBoss",
      rating: 1510
    }

  ];


  players.sort(
    (
      a,
      b
    ) =>
      b.rating -
      a.rating
  );


  const modal =
    document.createElement("div");

  modal.className =
    "sa-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            🏆 Rangliste
          </h2>

          <p>
            Die besten Spieler
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>


      <div class="leaderboard-list">

        ${
          players
            .map(
              (
                player,
                index
              ) => `

                <div
                  class="leaderboard-item
                    ${player.me ? "current-player" : ""}"
                >

                  <div class="leaderboard-rank">
                    ${
                      index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : "#" +
                              (index + 1)
                    }
                  </div>

                  <div class="leaderboard-player">

                    <strong>
                      ${escapeHtml(
                        player.name
                      )}
                    </strong>

                    ${
                      player.me
                        ? "<small>Du</small>"
                        : ""
                    }

                  </div>

                  <strong>
                    ${player.rating}
                  </strong>

                </div>

              `
            )
            .join("")
        }

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   HILFE
========================================================= */

function openHelp() {

  closeCurrentModal();


  const modal =
    document.createElement("div");

  modal.className =
    "sa-modal";


  modal.innerHTML = `

    <div class="sa-modal-content">

      <div class="sa-modal-header">

        <div>

          <h2>
            ❓ Hilfe
          </h2>

          <p>
            Alles Wichtige auf einen Blick.
          </p>

        </div>

        <button
          type="button"
          onclick="closeCurrentModal()"
        >
          ×
        </button>

      </div>


      <div class="help-list">

        <div class="help-item">

          <strong>
            🪙 Münzen
          </strong>

          <p>
            Münzen erhältst du durch tägliche
            Herausforderungen und kannst sie
            anschließend im Shop ausgeben.
          </p>

        </div>


        <div class="help-item">

          <strong>
            🎁 Belohnungen
          </strong>

          <p>
            Erfülle deine täglichen Aufgaben,
            um zusätzliche Münzen zu erhalten.
          </p>

        </div>


        <div class="help-item">

          <strong>
            🛍️ Shop
          </strong>

          <p>
            Im Shop findest du verschiedene
            Skins, Avatare, Effekte und Titel.
          </p>

        </div>


        <div class="help-item">

          <strong>
            👥 Freunde
          </strong>

          <p>
            Füge Spieler hinzu und behalte
            deine Freundesliste im Blick.
          </p>

        </div>

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   MODAL SCHLIESSEN
========================================================= */

function closeCurrentModal() {

  document
    .querySelectorAll(
      ".sa-modal"
    )
    .forEach(
      modal => {

        modal.remove();

      }
    );
}


/* =========================================================
   ESC ZUM SCHLIESSEN
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeCurrentModal();

    }

  }
);


/* =========================================================
   KLICK AUF MODAL-HINTERGRUND
========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.classList &&
      event.target.classList.contains(
        "sa-modal"
      )
    ) {

      event.target.remove();

    }

  }
);


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  const navigationMap = {

    home:
      () => {
        closeCurrentModal();

        if (
          typeof showHome ===
          "function"
        ) {
          showHome();
        }
      },

    play:
      openPlay,

    rewards:
      openRewards,

    friends:
      openFriends,

    leaderboard:
      openLeaderboard,

    profile:
      openProfile,

    settings:
      openSettings,

    shop:
      openShop,

    help:
      openHelp

  };


  document
    .querySelectorAll(
      "[data-nav]"
    )
    .forEach(
      button => {

        const nav =
          button.getAttribute(
            "data-nav"
          );


        if (
          !navigationMap[nav]
        ) {

          return;
        }


        button.onclick =
          event => {

            event.preventDefault();

            event.stopPropagation();

            navigationMap[nav]();

          };

      }
    );
}


/* =========================================================
   FALLBACK-NAVIGATION ÜBER TEXTE
   Falls die vorhandenen Buttons noch keine
   data-nav Attribute besitzen.
========================================================= */

function setupTextNavigation() {

  const buttons =
    document.querySelectorAll(
      "button, a"
    );


  buttons.forEach(
    button => {

      if (
        button.dataset.nav
      ) {

        return;
      }


      const text =
        (
          button.innerText ||
          button.textContent ||
          ""
        )
        .trim()
        .toLowerCase();


      if (
        text === "shop" ||
        text.includes("🛍️ shop")
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openShop();

          };

      }


      else if (
        text.includes(
          "einstellungen"
        ) ||
        text.includes(
          "settings"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openSettings();

          };

      }


      else if (
        text.includes(
          "freunde"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openFriends();

          };

      }


      else if (
        text.includes(
          "belohn"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openRewards();

          };

      }


      else if (
        text.includes(
          "rangliste"
        ) ||
        text.includes(
          "leaderboard"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openLeaderboard();

          };

      }


      else if (
        text === "profil" ||
        text.includes(
          "mein profil"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openProfile();

          };

      }


      else if (
        text === "spielen" ||
        text.includes(
          "spielen"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openPlay();

          };

      }


      else if (
        text.includes(
          "hilfe"
        )
      ) {

        button.onclick =
          event => {

            event.preventDefault();

            openHelp();

          };

      }

    }
  );
}


/* =========================================================
   DASHBOARD AKTUALISIEREN
========================================================= */

function updateDashboardName() {

  const name =
    getName();


  document
    .querySelectorAll(
      "[data-player-name]"
    )
    .forEach(
      element => {

        element.textContent =
          name;

      }
    );


  document
    .querySelectorAll(
      ".player-name"
    )
    .forEach(
      element => {

        element.textContent =
          name;

      }
    );
}


/* =========================================================
   INITIALISIERUNG
========================================================= */

function initializeApp() {

  loadCoins();

  loadStats();

  createDailyTasks();

  applyTheme();

  updateCoinDisplays();

  updateRewardsDisplays();

  updateDashboardName();

  setupNavigation();

  setupTextNavigation();

  setupShopNavigation();

}


/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();

}


/* =========================================================
   GLOBALE FUNKTIONEN
   Damit onclick="" aus dem HTML
   zuverlässig funktioniert.
========================================================= */

window.openShop =
  openShop;

window.openSettings =
  openSettings;

window.openRewards =
  openRewards;

window.openFriends =
  openFriends;

window.openProfile =
  openProfile;

window.openLeaderboard =
  openLeaderboard;

window.openPlay =
  openPlay;

window.openHelp =
  openHelp;

window.closeCurrentModal =
  closeCurrentModal;

window.buyShopItem =
  buyShopItem;

window.claimDailyReward =
  claimDailyReward;

window.addFriend =
  addFriend;

window.removeFriend =
  removeFriend;

window.saveSettingsName =
  saveSettingsName;

window.toggleTheme =
  toggleTheme;

window.resetLocalData =
  resetLocalData;

window.startGame =
  startGame;
