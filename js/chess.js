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

function legal(r1,c1,r2,c2){
  const p=board[r1][c1];
  const t=board[r2][c2];

  if(!p || p==="." || colorOf(p)!==turn || colorOf(t)===turn){
    return false;
  }

  const dr=r2-r1;
  const dc=c2-c1;
  const a=Math.abs(dr);
  const d=Math.abs(dc);
  const type=p.toLowerCase();

  if(type==="p"){
    const dir=turn==="w" ? -1 : 1;
    const start=turn==="w" ? 6 : 1;

    return (
      (dc===0 &&
       t==="." &&
       (
         dr===dir ||
         (
           r1===start &&
           dr===2*dir &&
           board[r1+dir][c1]==="."
         )
       )
      ) ||
      (d===1 && dr===dir && t!==".")
    );
  }

  if(type==="n"){
    return (a===2 && d===1) || (a===1 && d===2);
  }

  if(type==="b"){
    return a===d && clearPath(r1,c1,r2,c2);
  }

  if(type==="r"){
    return (a===0 || d===0) && clearPath(r1,c1,r2,c2);
  }

  if(type==="q"){
    return (a===d || a===0 || d===0) && clearPath(r1,c1,r2,c2);
  }

  if(type==="k"){
    return Math.max(a,d)===1;
  }

  return false;
}
function isSquareAttacked(r,c,byColor){
  // Bauern
  const pawn=byColor==="w" ? "P" : "p";
  const pawnRow=byColor==="w" ? r+1 : r-1;

  for(const dc of [-1,1]){
    const pc=pawnRow;
    const cc=c+dc;

    if(
      pc>=0 && pc<8 &&
      cc>=0 && cc<8 &&
      board[pc][cc]===pawn
    ){
      return true;
    }
  }

  // Springer
  const knight=byColor==="w" ? "N" : "n";
  const knightMoves=[
    [-2,-1],[-2,1],
    [-1,-2],[-1,2],
    [1,-2],[1,2],
    [2,-1],[2,1]
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

  // König
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

  // Türme und Damen
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

    while(rr>=0 && rr<8 && cc>=0 && cc<8){
      const piece=board[rr][cc];

      if(piece!=="."){
        if(piece===rook || piece===queen){
          return true;
        }

        break;
      }

      rr+=dr;
      cc+=dc;
    }
  }

  // Läufer und Damen
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

    while(rr>=0 && rr<8 && cc>=0 && cc<8){
      const piece=board[rr][cc];

      if(piece!=="."){
        if(piece===bishop || piece===queen){
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


function isInCheck(color){
  const king=color==="w" ? "K" : "k";

  let kingRow=-1;
  let kingCol=-1;

  // König suchen
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

  // Falls kein König auf dem Brett ist
  if(kingRow===-1){
    return false;
  }

  const opponent=color==="w" ? "b" : "w";

  return isSquareAttacked(
    kingRow,
    kingCol,
    opponent
  );
}
