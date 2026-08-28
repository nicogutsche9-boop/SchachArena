/* =========================================================
   TÄGLICHE AUFGABEN – INITIALISIEREN
   FIX FÜR "BELOHNUNGEN ANSEHEN"
========================================================= */

function createDailyTasks() {

  const today = getToday();

  let stored = null;

  try {

    stored = JSON.parse(
      localStorage.getItem("sa_daily_tasks") || "null"
    );

  } catch (error) {

    console.warn(
      "Tägliche Aufgaben konnten nicht gelesen werden:",
      error
    );

    stored = null;
  }


  /* Wenn noch keine Aufgaben existieren
     oder ein neuer Tag begonnen hat */

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


  /* Fehlende Werte absichern */

  stored.wins =
    Number(stored.wins) || 0;

  stored.games =
    Number(stored.games) || 0;

  stored.winsRewarded =
    Boolean(stored.winsRewarded);

  stored.gamesRewarded =
    Boolean(stored.gamesRewarded);


  dailyTasks = stored;

  return dailyTasks;
}
/* =========================================================
   SCHACHARENA – SHOP BUTTON
   Fügt links einen sichtbaren SHOP-Bereich hinzu
   und verbindet ihn direkt mit openShop()
========================================================= */

(function setupShopButton() {

  function createShopButton() {

    /* Falls bereits vorhanden: nichts doppelt erstellen */
    if (document.getElementById("saShopButton")) {
      return;
    }

    /* -----------------------------------------------------
       CSS
    ----------------------------------------------------- */

    if (!document.getElementById("saShopButtonStyle")) {

      const style = document.createElement("style");

      style.id = "saShopButtonStyle";

      style.textContent = `

        /* SHOP-BEREICH */

        .sa-shop-sidebar {
          position: fixed;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 9000;
        }


        .sa-shop-button {
          width: 150px;
          min-height: 115px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 7px;

          border: 1px solid rgba(255,255,255,.12);
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              rgba(38,124,255,.25),
              rgba(255,255,255,.06)
            );

          color: white;

          box-shadow:
            0 15px 45px rgba(0,0,0,.28);

          backdrop-filter: blur(12px);

          cursor: pointer;

          transition:
            transform .2s ease,
            box-shadow .2s ease,
            background .2s ease;

          padding: 15px;
        }


        .sa-shop-button:hover {

          transform:
            translateY(-4px)
            scale(1.02);

          background:
            linear-gradient(
              145deg,
              rgba(38,124,255,.38),
              rgba(255,255,255,.09)
            );

          box-shadow:
            0 20px 55px rgba(0,0,0,.38);
        }


        .sa-shop-button:active {

          transform:
            translateY(0)
            scale(.98);
        }


        .sa-shop-icon {

          font-size: 38px;

          line-height: 1;
        }


        .sa-shop-title {

          font-size: 17px;

          font-weight: 800;

          letter-spacing: .5px;
        }


        .sa-shop-coins {

          display: flex;

          align-items: center;

          gap: 5px;

          font-size: 13px;

          opacity: .8;
        }


        .sa-shop-coins strong {

          color: #ffd84d;

          font-size: 14px;
        }


        /* -----------------------------------------------
           MOBIL
        ----------------------------------------------- */

        @media (max-width: 900px) {

          .sa-shop-sidebar {

            left: 10px;
          }


          .sa-shop-button {

            width: 82px;

            min-height: 82px;

            border-radius: 17px;

            padding: 10px;
          }


          .sa-shop-icon {

            font-size: 28px;
          }


          .sa-shop-title {

            font-size: 13px;
          }


          .sa-shop-coins {

            font-size: 11px;
          }


          .sa-shop-coins strong {

            font-size: 12px;
          }

        }


        @media (max-width: 600px) {

          .sa-shop-sidebar {

            left: 8px;

            top: auto;

            bottom: 18px;

            transform: none;
          }


          .sa-shop-button {

            width: 70px;

            min-height: 70px;

            padding: 8px;

            border-radius: 16px;
          }


          .sa-shop-icon {

            font-size: 25px;
          }


          .sa-shop-title {

            font-size: 11px;
          }


          .sa-shop-coins {

            font-size: 10px;
          }


          .sa-shop-coins strong {

            font-size: 11px;
          }

        }

      `;

      document.head.appendChild(style);
    }


    /* -----------------------------------------------------
       SHOP-CONTAINER
    ----------------------------------------------------- */

    const sidebar =
      document.createElement("div");

    sidebar.className =
      "sa-shop-sidebar";


    /* -----------------------------------------------------
       SHOP-BUTTON
    ----------------------------------------------------- */

    const button =
      document.createElement("button");

    button.id =
      "saShopButton";

    button.className =
      "sa-shop-button";

    button.type =
      "button";


    button.innerHTML = `

      <span class="sa-shop-icon">
        🛒
      </span>

      <span class="sa-shop-title">
        SHOP
      </span>

      <span class="sa-shop-coins">
        🪙
        <strong data-shop-coins>
          0
        </strong>
      </span>

    `;


    /* -----------------------------------------------------
       KLICK
    ----------------------------------------------------- */

    button.addEventListener(
      "click",
      function () {

        /* Münzstand vorher aktualisieren */

        updateShopButtonCoins();


        /* Vorhandenen Shop öffnen */

        if (
          typeof openShop === "function"
        ) {

          openShop();

        } else {

          showMessage(
            "Der Shop konnte nicht geladen werden."
          );

        }

      }
    );


    sidebar.appendChild(button);

    document.body.appendChild(sidebar);


    /* Münzen anzeigen */

    updateShopButtonCoins();
  }


  /* =======================================================
     MÜNZANZEIGE
  ======================================================= */

  function updateShopButtonCoins() {

    const elements =
      document.querySelectorAll(
        "[data-shop-coins]"
      );


    const currentCoins =
      Number(
        localStorage.getItem(
          "sa_coins"
        )
      ) || 0;


    elements.forEach(
      element => {

        element.textContent =
          currentCoins;

      }
    );
  }


  /* =======================================================
     INITIALISIERUNG
  ======================================================= */

  function initShopButton() {

    createShopButton();

    updateShopButtonCoins();

  }


  /* =======================================================
     WARTEN BIS HTML GELADEN IST
  ======================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initShopButton
    );

  } else {

    initShopButton();

  }


  /* =======================================================
     GLOBAL VERFÜGBAR
  ======================================================= */

  window.updateShopButtonCoins =
    updateShopButtonCoins;


})();
