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
