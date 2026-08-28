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
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6MTc4NzkxMTA1MDksImV4cCI6MjEwMzQ4NjUwOX0.TktaxxzGeChjr8B9xrl9wWbcq6A-mEBJlqKBT5EJufE";

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

const SHOP_ITEMS = [
  {
    id: "streak_boost",
    name: "🔥 Streak-Booster",
    description: "+1 Schutz für deine Serie",
    price: 100,
    type: "streak"
  },
  {
    id: "coin_pack_small",
    name: "🪙 Münzbonus",
    description: "Kleiner Bonus für dein Münzkonto",
    price: 150,
    type: "coins",
    value: 50
  },
  {
    id: "xp_boost",
    name: "⚡ XP-Booster",
    description: "Mehr XP bei deinen nächsten Aktivitäten",
    price: 200,
    type: "xp"
  },
  {
    id: "mystery_box",
    name: "🎁 Mystery Box",
    description: "Eine zufällige Belohnung",
    price: 250,
    type: "mystery"
  },
  {
    id: "coin_pack_medium",
    name: "💰 Münzpaket",
    description: "50 Bonus-Münzen",
    price: 300,
    type: "coins",
    value: 100
  },
  {
    id: "premium_reward",
    name: "💎 Premium-Belohnung",
    description: "Eine besondere Belohnung",
    price: 500,
    type: "premium"
  }
];

function getCoins() {
  try {
    return Number(localStorage.getItem("coins") || 0);
  } catch (error) {
    return 0;
  }
}

function setCoins(amount) {
  const newAmount = Math.max(0, Number(amount) || 0);

  try {
    localStorage.setItem("coins", String(newAmount));
  } catch (error) {
    console.error("Münzen konnten nicht gespeichert werden:", error);
  }

  updateCoinDisplays();
  return newAmount;
}

function addCoins(amount) {
  return setCoins(getCoins() + Number(amount || 0));
}

function spendCoins(amount) {
  const currentCoins = getCoins();
  const price = Number(amount || 0);

  if (currentCoins < price) {
    return false;
  }

  setCoins(currentCoins - price);
  return true;
}

function updateCoinDisplays() {
  const coins = getCoins();

  document.querySelectorAll("[data-coins]").forEach(element => {
    element.textContent = coins;
  });
}

function getOwnedShopItems() {
  try {
    return JSON.parse(localStorage.getItem("ownedShopItems") || "[]");
  } catch (error) {
    return [];
  }
}

function setOwnedShopItems(items) {
  try {
    localStorage.setItem(
      "ownedShopItems",
      JSON.stringify(Array.isArray(items) ? items : [])
    );
  } catch (error) {
    console.error("Shop-Inhalte konnten nicht gespeichert werden:", error);
  }
}

function isShopItemOwned(itemId) {
  return getOwnedShopItems().includes(itemId);
}

function addOwnedShopItem(itemId) {
  const owned = getOwnedShopItems();

  if (!owned.includes(itemId)) {
    owned.push(itemId);
    setOwnedShopItems(owned);
  }
}

function buyShopItem(itemId) {
  const item = SHOP_ITEMS.find(shopItem => shopItem.id === itemId);

  if (!item) {
    return;
  }

  if (isShopItemOwned(itemId) && item.type !== "coins") {
    showNotification("Du besitzt diesen Gegenstand bereits.");
    return;
  }

  if (!spendCoins(item.price)) {
    showNotification(
      `Du hast nicht genug Münzen. Benötigt: ${item.price} 🪙`
    );
    return;
  }

  if (item.type !== "coins") {
    addOwnedShopItem(item.id);
  }

  if (item.type === "coins") {
    addCoins(item.value || 0);
  }

  if (item.type === "streak") {
    try {
      const current = Number(localStorage.getItem("streakProtection") || 0);
      localStorage.setItem("streakProtection", String(current + 1));
    } catch (error) {
      console.error(error);
    }
  }

  if (item.type === "xp") {
    try {
      localStorage.setItem("xpBoost", "true");
    } catch (error) {
      console.error(error);
    }
  }

  if (item.type === "mystery") {
    const rewards = [50, 100, 150, 250];
    const reward =
      rewards[Math.floor(Math.random() * rewards.length)];

    addCoins(reward);

    showNotification(
      `🎁 Mystery Box geöffnet! Du bekommst ${reward} 🪙`
    );
  } else if (item.type === "coins") {
    showNotification(
      `💰 Kauf erfolgreich! +${item.value || 0} 🪙`
    );
  } else {
    showNotification(`✅ ${item.name} wurde gekauft!`);
  }

  renderShop();
}

function showNotification(message) {
  const existing = document.getElementById("app-notification");

  if (existing) {
    existing.remove();
  }

  const notification = document.createElement("div");
  notification.id = "app-notification";
  notification.textContent = message;

  notification.style.position = "fixed";
  notification.style.left = "50%";
  notification.style.bottom = "30px";
  notification.style.transform = "translateX(-50%)";
  notification.style.zIndex = "99999";
  notification.style.padding = "14px 20px";
  notification.style.borderRadius = "14px";
  notification.style.background = "#171717";
  notification.style.color = "#fff";
  notification.style.fontSize = "15px";
  notification.style.fontWeight = "600";
  notification.style.boxShadow = "0 10px 30px rgba(0,0,0,.25)";
  notification.style.maxWidth = "90%";
  notification.style.textAlign = "center";

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity .25s ease";

    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2200);
}

function renderShop() {
  const shopContainer = document.getElementById("shop-items");

  if (!shopContainer) {
    return;
  }

  const coins = getCoins();

  shopContainer.innerHTML = SHOP_ITEMS.map(item => {
    const owned =
      isShopItemOwned(item.id) && item.type !== "coins";

    const canAfford = coins >= item.price;

    return `
      <div class="shop-item-card">
        <div class="shop-item-icon">
          ${item.name.split(" ")[0]}
        </div>

        <div class="shop-item-content">
          <div class="shop-item-title">
            ${item.name.substring(item.name.indexOf(" ") + 1)}
          </div>

          <div class="shop-item-description">
            ${item.description}
          </div>

          <div class="shop-item-bottom">
            <span class="shop-item-price">
              🪙 ${item.price}
            </span>

            <button
              class="shop-buy-button ${owned ? "owned" : ""}"
              data-shop-item="${item.id}"
              ${owned || !canAfford ? "disabled" : ""}
            >
              ${
                owned
                  ? "✓ Besitzt du"
                  : canAfford
                    ? "Kaufen"
                    : "Zu teuer"
              }
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  shopContainer.querySelectorAll("[data-shop-item]").forEach(button => {
    button.addEventListener("click", () => {
      buyShopItem(button.dataset.shopItem);
    });
  });

  updateCoinDisplays();
}

function openShop() {
  const shop = document.getElementById("shop-section");

  if (!shop) {
    return;
  }

  shop.style.display = "block";

  setTimeout(() => {
    shop.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 50);

  renderShop();
}

function closeShop() {
  const shop = document.getElementById("shop-section");

  if (!shop) {
    return;
  }

  shop.style.display = "none";
}

function createShopSection() {
  if (document.getElementById("shop-section")) {
    renderShop();
    return;
  }

  const section = document.createElement("section");
  section.id = "shop-section";

  section.style.display = "none";
  section.style.marginTop = "20px";
  section.style.padding = "20px";
  section.style.borderRadius = "22px";
  section.style.background = "#ffffff";
  section.style.boxShadow = "0 8px 30px rgba(0,0,0,.08)";

  section.innerHTML = `
    <div class="shop-header">
      <div>
        <div class="shop-title">
          🛍️ Shop
        </div>

        <div class="shop-subtitle">
          Tausche deine Münzen gegen besondere Belohnungen.
        </div>
      </div>

      <div class="shop-coin-counter">
        🪙 <span data-coins>0</span>
      </div>
    </div>

    <div class="shop-items" id="shop-items"></div>
  `;

  document.body.appendChild(section);

  renderShop();
}

function injectShopStyles() {
  if (document.getElementById("shop-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "shop-styles";

  style.textContent = `
    #shop-section {
      width: calc(100% - 40px);
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
      box-sizing: border-box;
    }

    .shop-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .shop-title {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 5px;
    }

    .shop-subtitle {
      font-size: 14px;
      opacity: .65;
    }

    .shop-coin-counter {
      flex-shrink: 0;
      padding: 10px 15px;
      border-radius: 14px;
      background: #f4f4f4;
      font-weight: 800;
      white-space: nowrap;
    }

    .shop-items {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .shop-item-card {
      display: flex;
      gap: 14px;
      padding: 16px;
      border-radius: 18px;
      background: #f7f7f8;
      border: 1px solid rgba(0,0,0,.06);
      box-sizing: border-box;
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .shop-item-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,.08);
    }

    .shop-item-icon {
      width: 48px;
      height: 48px;
      min-width: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: #ffffff;
      font-size: 25px;
    }

    .shop-item-content {
      min-width: 0;
      flex: 1;
    }

    .shop-item-title {
      font-weight: 800;
      font-size: 16px;
      margin-bottom: 5px;
    }

    .shop-item-description {
      font-size: 13px;
      line-height: 1.4;
      opacity: .65;
      min-height: 36px;
    }

    .shop-item-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 12px;
    }

    .shop-item-price {
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
    }

    .shop-buy-button {
      border: none;
      border-radius: 10px;
      padding: 9px 13px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      background: #111111;
      color: #ffffff;
    }

    .shop-buy-button:disabled {
      cursor: not-allowed;
      opacity: .45;
    }

    .shop-buy-button.owned {
      background: #d9d9d9;
      color: #333333;
      opacity: 1;
    }

    @media (max-width: 650px) {
      #shop-section {
        width: calc(100% - 24px);
        padding: 16px;
      }

      .shop-header {
        align-items: flex-start;
      }

      .shop-title {
        font-size: 23px;
      }

      .shop-items {
        grid-template-columns: 1fr;
      }

      .shop-item-card {
        padding: 14px;
      }
    }
  `;

  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", () => {
  injectShopStyles();
  createShopSection();
  updateCoinDisplays();
});
  // ============================================================
// TEIL 3/4
// Shop unter "Einstellungen" einbinden + Navigation + Münzen
// ============================================================

function findSettingsContainer() {
  const possibleSelectors = [
    "#settings",
    "#settings-section",
    ".settings",
    ".settings-section",
    '[data-section="settings"]',
    '[data-page="settings"]'
  ];

  for (const selector of possibleSelectors) {
    const element = document.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

function addShopToSettings() {
  const settings = findSettingsContainer();
  const shop = document.getElementById("shop-section");

  if (!settings || !shop) {
    return false;
  }

  // Shop aus dem normalen Dokumentfluss entfernen,
  // damit er ausschließlich unter Einstellungen erscheint.
  if (shop.parentElement !== settings) {
    settings.appendChild(shop);
  }

  shop.style.display = "block";
  shop.style.marginTop = "24px";

  return true;
}

function createShopNavigationButton() {
  // Bereits vorhandenen Shop-Button nicht doppelt erzeugen.
  if (document.getElementById("shop-navigation-button")) {
    return;
  }

  const settings = findSettingsContainer();

  if (!settings) {
    return;
  }

  const button = document.createElement("button");

  button.id = "shop-navigation-button";
  button.type = "button";

  button.innerHTML = `
    <span style="font-size:22px;">🛍️</span>
    <span style="flex:1;text-align:left;">
      <strong>Shop</strong>
      <small style="
        display:block;
        margin-top:3px;
        opacity:.6;
        font-weight:500;
      ">
        Belohnungen &amp; Extras
      </small>
    </span>
    <span style="font-size:20px;">›</span>
  `;

  button.style.width = "100%";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "12px";
  button.style.padding = "15px 16px";
  button.style.marginBottom = "18px";
  button.style.border = "1px solid rgba(0,0,0,.07)";
  button.style.borderRadius = "16px";
  button.style.background = "#f7f7f8";
  button.style.cursor = "pointer";
  button.style.textAlign = "left";
  button.style.fontSize = "15px";

  button.addEventListener("click", () => {
    const shop = document.getElementById("shop-section");

    if (!shop) {
      createShopSection();
      return;
    }

    shop.style.display =
      shop.style.display === "none" ? "block" : "none";

    if (shop.style.display === "block") {
      renderShop();

      setTimeout(() => {
        shop.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    }
  });

  settings.insertBefore(button, settings.firstChild);
}

function createCoinDisplay() {
  if (document.getElementById("global-coin-display")) {
    updateCoinDisplays();
    return;
  }

  const display = document.createElement("div");

  display.id = "global-coin-display";

  display.innerHTML = `
    <span>🪙</span>
    <span data-coins>0</span>
  `;

  display.style.position = "fixed";
  display.style.top = "14px";
  display.style.right = "14px";
  display.style.zIndex = "9990";
  display.style.display = "flex";
  display.style.alignItems = "center";
  display.style.gap = "6px";
  display.style.padding = "9px 13px";
  display.style.borderRadius = "14px";
  display.style.background = "#ffffff";
  display.style.boxShadow = "0 5px 20px rgba(0,0,0,.12)";
  display.style.fontWeight = "800";
  display.style.fontSize = "15px";

  document.body.appendChild(display);

  updateCoinDisplays();
}

function ensureCoinStorage() {
  try {
    const existing = localStorage.getItem("coins");

    if (existing === null || Number.isNaN(Number(existing))) {
      localStorage.setItem("coins", "0");
    }
  } catch (error) {
    console.error("Coin Storage Fehler:", error);
  }
}

function addDailyCoinReward(amount = 10) {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const lastReward =
      localStorage.getItem("lastDailyCoinReward");

    if (lastReward === today) {
      return false;
    }

    addCoins(amount);

    localStorage.setItem(
      "lastDailyCoinReward",
      today
    );

    showNotification(
      `🎉 Tagesbonus: +${amount} 🪙`
    );

    return true;
  } catch (error) {
    console.error(
      "Tagesbonus konnte nicht gespeichert werden:",
      error
    );

    return false;
  }
}

function connectExistingCoinButtons() {
  document
    .querySelectorAll(
      '[data-action="add-coins"], [data-add-coins]'
    )
    .forEach(button => {
      if (button.dataset.coinHandlerAttached === "true") {
        return;
      }

      button.dataset.coinHandlerAttached = "true";

      button.addEventListener("click", () => {
        const amount = Number(
          button.dataset.addCoins ||
          button.dataset.amount ||
          10
        );

        addCoins(amount);

        showNotification(
          `🪙 +${amount} Münzen erhalten!`
        );
      });
    });
}

function refreshShopSystem() {
  ensureCoinStorage();

  createShopSection();

  addShopToSettings();

  createShopNavigationButton();

  createCoinDisplay();

  connectExistingCoinButtons();

  renderShop();

  updateCoinDisplays();
}

function observeSettingsChanges() {
  const observer = new MutationObserver(() => {
    const settings = findSettingsContainer();

    if (!settings) {
      return;
    }

    const shop = document.getElementById("shop-section");

    if (shop && shop.parentElement !== settings) {
      addShopToSettings();
    }

    if (
      !document.getElementById(
        "shop-navigation-button"
      )
    ) {
      createShopNavigationButton();
    }

    updateCoinDisplays();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ------------------------------------------------------------
// Start des erweiterten Münz-/Shop-Systems
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    refreshShopSystem();
    observeSettingsChanges();
  }, 150);
});

// Falls deine App bereits vollständig geladen ist,
// bevor dieser Code ausgeführt wird.
if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  setTimeout(() => {
    refreshShopSystem();
    observeSettingsChanges();
  }, 150);
}
  // ============================================================
// TEIL 4/4
// Letzter Block – Stabilisierung, Event-Verbindungen,
// tägliche Ausführung und Shop-Updates
// ============================================================

(function () {
  "use strict";

  // ----------------------------------------------------------
  // Hilfsfunktion: Element sicher finden
  // ----------------------------------------------------------

  function getElement(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  // ----------------------------------------------------------
  // Shop öffnen
  // ----------------------------------------------------------

  window.openAppShop = function () {
    const shop = document.getElementById("shop-section");

    if (!shop) {
      if (typeof createShopSection === "function") {
        createShopSection();
      }
    }

    const currentShop =
      document.getElementById("shop-section");

    if (!currentShop) {
      return;
    }

    currentShop.style.display = "block";

    if (typeof renderShop === "function") {
      renderShop();
    }

    setTimeout(() => {
      currentShop.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  };

  // ----------------------------------------------------------
  // Shop schließen
  // ----------------------------------------------------------

  window.closeAppShop = function () {
    const shop =
      document.getElementById("shop-section");

    if (shop) {
      shop.style.display = "none";
    }
  };

  // ----------------------------------------------------------
  // Münzen global verfügbar machen
  // ----------------------------------------------------------

  window.getAppCoins = function () {
    if (typeof getCoins === "function") {
      return getCoins();
    }

    return 0;
  };

  window.addAppCoins = function (amount) {
    if (typeof addCoins === "function") {
      return addCoins(Number(amount) || 0);
    }

    return 0;
  };

  window.spendAppCoins = function (amount) {
    if (typeof spendCoins === "function") {
      return spendCoins(Number(amount) || 0);
    }

    return false;
  };

  // ----------------------------------------------------------
  // Shop-Kauf global verfügbar
  // ----------------------------------------------------------

  window.buyAppShopItem = function (itemId) {
    if (typeof buyShopItem === "function") {
      buyShopItem(itemId);
    }
  };

  // ----------------------------------------------------------
  // Einstellungen + Shop erneut verbinden
  // ----------------------------------------------------------

  function setupSettingsShop() {
    try {
      if (typeof ensureCoinStorage === "function") {
        ensureCoinStorage();
      }

      if (
        typeof createShopSection === "function" &&
        !document.getElementById("shop-section")
      ) {
        createShopSection();
      }

      if (typeof addShopToSettings === "function") {
        addShopToSettings();
      }

      if (
        typeof createShopNavigationButton === "function" &&
        !document.getElementById(
          "shop-navigation-button"
        )
      ) {
        createShopNavigationButton();
      }

      if (typeof updateCoinDisplays === "function") {
        updateCoinDisplays();
      }

      if (typeof renderShop === "function") {
        renderShop();
      }
    } catch (error) {
      console.error(
        "Fehler beim Einrichten des Shops:",
        error
      );
    }
  }

  // ----------------------------------------------------------
  // Münzsystem regelmäßig aktualisieren
  // ----------------------------------------------------------

  function startCoinRefresh() {
    setInterval(() => {
      try {
        if (typeof updateCoinDisplays === "function") {
          updateCoinDisplays();
        }

        if (
          typeof renderShop === "function" &&
          document.getElementById("shop-section")
        ) {
          renderShop();
        }
      } catch (error) {
        console.error(
          "Fehler beim Aktualisieren des Münzsystems:",
          error
        );
      }
    }, 1000);
  }

  // ----------------------------------------------------------
  // Event Delegation für Shop-Buttons
  // Funktioniert auch, wenn die App später Elemente neu rendert.
  // ----------------------------------------------------------

  function setupGlobalShopEvents() {
    document.addEventListener("click", event => {
      const shopButton =
        event.target.closest(
          "[data-shop-item]"
        );

      if (shopButton) {
        const itemId =
          shopButton.getAttribute(
            "data-shop-item"
          );

        if (
          itemId &&
          typeof buyShopItem === "function"
        ) {
          buyShopItem(itemId);
        }

        return;
      }

      const openButton =
        event.target.closest(
          '[data-open-shop], [data-action="shop"]'
        );

      if (openButton) {
        event.preventDefault();

        window.openAppShop();

        return;
      }

      const closeButton =
        event.target.closest(
          '[data-close-shop], [data-action="close-shop"]'
        );

      if (closeButton) {
        event.preventDefault();

        window.closeAppShop();
      }
    });
  }

  // ----------------------------------------------------------
  // Initialisierung
  // ----------------------------------------------------------

  function initializeFinalPart() {
    setupSettingsShop();
    setupGlobalShopEvents();
    startCoinRefresh();

    // Noch einmal kurz nach dem Start prüfen,
    // weil manche App-Elemente erst später erzeugt werden.
    setTimeout(setupSettingsShop, 500);
    setTimeout(setupSettingsShop, 1500);
    setTimeout(setupSettingsShop, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeFinalPart,
      { once: true }
    );
  } else {
    initializeFinalPart();
  }

})();
