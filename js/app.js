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
