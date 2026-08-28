// Informationen über Sonderzüge
const chessState = {
  whiteKingMoved: false,
  blackKingMoved: false,

  whiteRookAMoved: false,
  whiteRookHMoved: false,

  blackRookAMoved: false,
  blackRookHMoved: false,

  enPassantTarget: null
};
function colorOf(p){
  return p && p !== "." ? (p === p.toUpperCase() ? "w" : "b") : null;
}


function clearPath(r1,c1,r2,c2){
  let dr=Math.sign(r2-r1);
  let dc=Math.sign(c2-c1);
  let r=r1+dr;
  let c=c1+dc;

  while(r!==r2 || c!==c2){
    if(board[r][c]!==".") return false;
    r+=dr;
    c+=dc;
  }

  return true;
}


/*
  Prüft nur die grundsätzliche Bewegungsregel
  einer Figur.

  Wichtig:
  Hier wird noch NICHT geprüft, ob der eigene König
  danach im Schach steht.
*/
function pseudoLegal(r1,c1,r2,c2,side=turn){
  const p=board[r1][c1];
  const t=board[r2][c2];

  if(!p || p===".") return false;

  if(colorOf(p)!==side) return false;

  if(colorOf(t)===side) return false;

  // Einen König darf man niemals schlagen.
  if(t==="K" || t==="k") return false;

  const dr=r2-r1;
  const dc=c2-c1;
  const a=Math.abs(dr);
  const d=Math.abs(dc);
  const type=p.toLowerCase();


  // Bauer
  if(type==="p"){
    const dir=side==="w" ? -1 : 1;
    const start=side==="w" ? 6 : 1;

    // Gerade nach vorne
    if(
      dc===0 &&
      t==="."
    ){
      if(dr===dir){
        return true;
      }

      if(
        r1===start &&
        dr===2*dir &&
        board[r1+dir][c1]==="."
      ){
        return true;
      }
    }

    // Diagonal schlagen
    if(
      d===1 &&
      dr===dir &&
      t!=="."
    ){
      return true;
    }

    return false;
  }


  // Springer
  if(type==="n"){
    return (a===2 && d===1) || (a===1 && d===2);
  }


  // Läufer
  if(type==="b"){
    return a===d && clearPath(r1,c1,r2,c2);
  }


  // Turm
  if(type==="r"){
    return (a===0 || d===0) &&
           clearPath(r1,c1,r2,c2);
  }


  // Dame
  if(type==="q"){
    return (
      a===d ||
      a===0 ||
      d===0
    ) && clearPath(r1,c1,r2,c2);
  }


  // König
if(type==="k"){

  // Normaler Königszug
  if(Math.max(a,d)===1){
    return true;
  }

  // Kurze Rochade
  if(
    dr===0 &&
    dc===2
  ){
    return canCastleKingSide(side);
  }

  // Lange Rochade
  if(
    dr===0 &&
    dc===-2
  ){
    return canCastleQueenSide(side);
  }

  return false;
}

/*
  Prüft, ob ein bestimmtes Feld von einer Farbe
  angegriffen wird.
*/
function isSquareAttacked(r,c,byColor){

  // -------------------------
  // Bauern
  // -------------------------

  const pawn=byColor==="w" ? "P" : "p";

  // Wenn Weiß angreift, kommen weiße Bauern
  // aus der Reihe darunter.
  const pawnRow=byColor==="w" ? r+1 : r-1;

  for(const dc of [-1,1]){
    const rr=pawnRow;
    const cc=c+dc;

    if(
      rr>=0 && rr<8 &&
      cc>=0 && cc<8 &&
      board[rr][cc]===pawn
    ){
      return true;
    }
  }


  // -------------------------
  // Springer
  // -------------------------

  const knight=byColor==="w" ? "N" : "n";

  const knightMoves=[
    [-2,-1],
    [-2,1],
    [-1,-2],
    [-1,2],
    [1,-2],
    [1,2],
    [2,-1],
    [2,1]
  ];

  for(const [dr,dc] of knightMoves){
    const rr=r+dr;
    const cc=c+dc;

    if(
      rr>=0 && rr<8 &&
      cc>=0 && cc<8 &&
      board[rr][cc]===knight
    ){
      return true;
    }
  }


  // -------------------------
  // König
  // -------------------------

  const king=byColor==="w" ? "K" : "k";

  for(let dr=-1;dr<=1;dr++){
    for(let dc=-1;dc<=1;dc++){

      if(dr===0 && dc===0) continue;

      const rr=r+dr;
      const cc=c+dc;

      if(
        rr>=0 && rr<8 &&
        cc>=0 && cc<8 &&
        board[rr][cc]===king
      ){
        return true;
      }
    }
  }


  // -------------------------
  // Türme und Damen
  // -------------------------

  const rook=byColor==="w" ? "R" : "r";
  const queen=byColor==="w" ? "Q" : "q";

  const straightDirections=[
    [-1,0],
    [1,0],
    [0,-1],
    [0,1]
  ];

  for(const [dr,dc] of straightDirections){

    let rr=r+dr;
    let cc=c+dc;

    while(
      rr>=0 && rr<8 &&
      cc>=0 && cc<8
    ){

      const piece=board[rr][cc];

      if(piece!=="."){

        if(
          piece===rook ||
          piece===queen
        ){
          return true;
        }

        // Andere Figur blockiert den Angriff.
        break;
      }

      rr+=dr;
      cc+=dc;
    }
  }


  // -------------------------
  // Läufer und Damen
  // -------------------------

  const bishop=byColor==="w" ? "B" : "b";

  const diagonalDirections=[
    [-1,-1],
    [-1,1],
    [1,-1],
    [1,1]
  ];

  for(const [dr,dc] of diagonalDirections){

    let rr=r+dr;
    let cc=c+dc;

    while(
      rr>=0 && rr<8 &&
      cc>=0 && cc<8
    ){

      const piece=board[rr][cc];

      if(piece!=="."){

        if(
          piece===bishop ||
          piece===queen
        ){
          return true;
        }

        break;
      }

      rr+=dr;
      cc+=dc;
    }
  }

  return false;
}


/*
  Prüft, ob der König einer Farbe im Schach steht.
*/
function isInCheck(color){

  const king=color==="w" ? "K" : "k";

  let kingRow=-1;
  let kingCol=-1;


  // König finden
  for(let r=0;r<8;r++){

    for(let c=0;c<8;c++){

      if(board[r][c]===king){
        kingRow=r;
        kingCol=c;
        break;
      }
    }

    if(kingRow!==-1) break;
  }


  // Ohne eigenen König ist die Stellung ungültig.
  if(kingRow===-1){
    return true;
  }


  const opponent=color==="w" ? "b" : "w";

  return isSquareAttacked(
    kingRow,
    kingCol,
    opponent
  );
}


/*
  DIE NEUE LEGAL-FUNKTION

  1. Prüft den normalen Figuren-Zug.
  2. Simuliert den Zug.
  3. Prüft, ob der eigene König im Schach steht.
  4. Macht den simulierten Zug wieder rückgängig.
*/
function legal(r1,c1,r2,c2){

  const side=turn;

  // Grundregeln prüfen
  if(!pseudoLegal(
    r1,
    c1,
    r2,
    c2,
    side
  )){
    return false;
  }


  const moving=board[r1][c1];
  const captured=board[r2][c2];


  // -------------------------
  // Zug simulieren
  // -------------------------

  board[r2][c2]=moving;
  board[r1][c1]=".";
// Rochade simulieren
if(
  moving.toLowerCase()==="k" &&
  Math.abs(c2-c1)===2
){

  const row=r1;

  // Kurze Rochade
  if(c2===6){
    board[row][5]=board[row][7];
    board[row][7]=".";
  }

  // Lange Rochade
  if(c2===2){
    board[row][3]=board[row][0];
    board[row][0]=".";
  }
}

  // -------------------------
  // Königssicherheit prüfen
  // -------------------------

  const illegalBecauseOfCheck=isInCheck(side);


  // -------------------------
  // Brett zurücksetzen
  // -------------------------

  board[r1][c1]=moving;
  board[r2][c2]=captured;


  // Wenn der eigene König nach dem Zug
  // im Schach wäre, ist der Zug illegal.
  if(illegalBecauseOfCheck){
    return false;
  }

  return true;
}
/*
  Prüft, ob eine Farbe mindestens einen legalen Zug hat.
*/
function hasLegalMove(color){

  // Aktuellen Spieler merken
  const oldTurn=turn;

  // Temporär die zu prüfende Farbe setzen
  turn=color;

  // Alle Felder des Brettes durchsuchen
  for(let r1=0;r1<8;r1++){

    for(let c1=0;c1<8;c1++){

      const piece=board[r1][c1];

      // Nur eigene Figuren prüfen
      if(
        piece==="." ||
        colorOf(piece)!==color
      ){
        continue;
      }

      // Jedes mögliche Zielfeld ausprobieren
      for(let r2=0;r2<8;r2++){

        for(let c2=0;c2<8;c2++){

          if(legal(r1,c1,r2,c2)){

            // Ursprünglichen Spieler wiederherstellen
            turn=oldTurn;

            return true;
          }
        }
      }
    }
  }

  // Ursprünglichen Spieler wiederherstellen
  turn=oldTurn;

  return false;
}


/*
  Prüft, ob eine Farbe Schachmatt ist.

  Schachmatt bedeutet:
  1. Der König steht im Schach.
  2. Es gibt keinen legalen Zug mehr.
*/
function isCheckmate(color){

  return (
    isInCheck(color) &&
    !hasLegalMove(color)
  );
}


/*
  Prüft, ob eine Farbe Patt ist.

  Patt bedeutet:
  1. Der König steht NICHT im Schach.
  2. Es gibt keinen legalen Zug mehr.
*/
function isStalemate(color){

  return (
    !isInCheck(color) &&
    !hasLegalMove(color)
  );
}
function canCastleKingSide(color){

  const row=color==="w" ? 7 : 0;

  const king=color==="w" ? "K" : "k";
  const rook=color==="w" ? "R" : "r";

  // König und Turm müssen vorhanden sein
  if(board[row][4]!==king) return false;
  if(board[row][7]!==rook) return false;

  // König bzw. Turm darf noch nicht bewegt worden sein
  if(color==="w" && chessState.whiteKingMoved) return false;
  if(color==="b" && chessState.blackKingMoved) return false;

  if(color==="w" && chessState.whiteRookHMoved) return false;
  if(color==="b" && chessState.blackRookHMoved) return false;

  // Felder zwischen König und Turm müssen frei sein
  if(
    board[row][5]!=="." ||
    board[row][6]!=="."
  ){
    return false;
  }

  // König darf nicht im Schach stehen
  if(isInCheck(color)){
    return false;
  }

  const opponent=color==="w" ? "b" : "w";

  // König darf kein angegriffenes Feld überqueren
  if(isSquareAttacked(row,5,opponent)){
    return false;
  }

  // Zielfeld des Königs darf nicht angegriffen werden
  if(isSquareAttacked(row,6,opponent)){
    return false;
  }

  return true;
}


function canCastleQueenSide(color){

  const row=color==="w" ? 7 : 0;

  const king=color==="w" ? "K" : "k";
  const rook=color==="w" ? "R" : "r";

  if(board[row][4]!==king) return false;
  if(board[row][0]!==rook) return false;

  if(color==="w" && chessState.whiteKingMoved) return false;
  if(color==="b" && chessState.blackKingMoved) return false;

  if(color==="w" && chessState.whiteRookAMoved) return false;
  if(color==="b" && chessState.blackRookAMoved) return false;

  // Felder zwischen König und Turm
  if(
    board[row][1]!=="." ||
    board[row][2]!=="." ||
    board[row][3]!=="."
  ){
    return false;
  }

  // König darf nicht im Schach stehen
  if(isInCheck(color)){
    return false;
  }

  const opponent=color==="w" ? "b" : "w";

  // d-Feld darf nicht angegriffen sein
  if(isSquareAttacked(row,3,opponent)){
    return false;
  }

  // c-Feld darf nicht angegriffen sein
  if(isSquareAttacked(row,2,opponent)){
    return false;
  }

  return true;
}
