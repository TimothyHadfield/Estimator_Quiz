const DB='https://estimator-quiz-default-rtdb.firebaseio.com';
const get=async p=>(await fetch(`${DB}/${p}.json`)).json();
const qs=await get('questions'), daily=await get('daily');
const list=Object.entries(qs).filter(([,q])=>q&&typeof q==='object');
const c=f=>list.filter(([,q])=>f(q)).length;
console.log('questions',list.length,'daily',c(q=>q.pool==='daily'),'practice',c(q=>q.pool==='practice'),'no pool',c(q=>!q.pool),'gradeA',c(q=>q.grade==='A'));
console.log('bad answers',c(q=>typeof q.answer!=='number'||!(q.answer>0)),'empty text',c(q=>!q.text));
const texts=new Map();let dupText=0;list.forEach(([k,q])=>{const t=q.text.trim().toLowerCase();if(texts.has(t))dupText++;texts.set(t,k)});console.log('exact duplicate texts',dupText);
const dates=Object.keys(daily).sort();const fut=dates.filter(d=>d>='2026-10-11');
let items=0,notDaily=0,mismatch=0,wrongCount=0,sameTopic=0;const seen=new Map();let reuse=0;
for(const d of fut){const arr=Object.values(daily[d].q||{});if(arr.length!==5)wrongCount++;const topics=new Set();for(const it of arr){items++;const q=qs[it.key];if(!q||q.pool!=='daily')notDaily++;else{if(q.text!==it.text||q.answer!==it.answer)mismatch++;topics.add(q.topic)}if(seen.has(String(it.key)))reuse++;seen.set(String(it.key),d)}if(topics.size<arr.length)sameTopic++}
console.log('future days',fut.length,fut[0],fut[fut.length-1],'items',items,'not live daily-pool',notDaily,'text/answer mismatch',mismatch,'days not 5',wrongCount,'days with a repeated topic',sameTopic,'question reused',reuse);
// contiguous?
let gaps=0;for(let i=1;i<fut.length;i++){if((new Date(fut[i])-new Date(fut[i-1]))!==86400000)gaps++}console.log('gaps',gaps);
// past/today items reused in future?
let pastReuse=0;for(const d of dates.filter(d=>d<'2026-10-11'))for(const it of Object.values(daily[d].q||{}))if(seen.has(String(it.key)))pastReuse++;console.log('past dates',dates.filter(d=>d<'2026-10-11').length,'past questions reused later',pastReuse);
