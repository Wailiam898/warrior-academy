const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
async function check(){
 const root=path.resolve(__dirname,'..'),name=path.basename(root).split('-')[0];
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\(async function boot\(\)\{[\s\S]*$/,'');
 const nop=()=>{},el={classList:{add:nop,remove:nop,toggle:nop},style:{},addEventListener:nop};
 const ctx=vm.createContext({console,Date,Math,Promise,JSON,Set,Map,Number,String,Object,Array,RegExp,Uint8Array,innerWidth:390,screen:{width:390,height:844},document:{querySelector:s=>s==='#app'?el:null,addEventListener:nop,hidden:false},localStorage:{getItem:()=>null,setItem:nop},window:{addEventListener:nop},addEventListener:nop,setInterval:()=>0,clearInterval:nop,setTimeout:()=>0,clearTimeout:nop});
 vm.runInContext(script,ctx);
 const run=s=>vm.runInContext(s,ctx);
 run("S=defaults();S.name='Test Keeper';S.age=10;save=()=>{};persistLocal=()=>{};sfx.tap=()=>{}");
 const count=name==='whisker'?62:39;
 assert.equal(run('Object.keys(HOF_GAMES).length'),count);
 assert.equal(run('new Set(Object.values(HOF_GAMES).map(g=>g.key)).size'),count);
 assert.equal(run('HOF_GAMES.blade.key'),name==='whisker'?'blade':'warrior:blade');
 for(const age of name==='whisker'?[5,8,10]:[10]){
  run(`S.age=${age}`);const view=run('practiceView()');assert.ok(view.includes('Hall of Fame'));
  for(const quick of view.matchAll(/data-act="quick" data-k="([^"]+)"/g))assert.ok(run(`!!HOF_GAMES[practiceId('quick_'+${JSON.stringify(quick[1])})]`),quick[1]);
  for(const m of view.matchAll(/data-act="hof" data-g="([^"]+)"/g))assert.ok(run(`!!HOF_GAMES[${JSON.stringify(m[1])}]`),m[1]);
  assert.equal([...view.matchAll(/data-act="table"/g)].length,age===5?0:11);
  assert.equal([...view.matchAll(/data-act="dtable"/g)].length,age<9?0:11);
 }
 run("S.age=10;P={hofGame:practiceId('quick_dec'),mode:'quick',n:8,credits:[1,1,1,1,1,1,.5,0],maxCombo:6};recordPracticeRound()");
 assert.equal(run("practiceRecord(practiceId('quick_dec')).best"),75);
 assert.equal(run("practiceRecord(practiceId('quick_dec')).plays"),1);
 run('recordPracticeRound()');assert.equal(run("practiceRecord(practiceId('quick_dec')).plays"),1);
 run("P={hofGame:practiceId('quick_dec'),mode:'quick',n:8,credits:[1],maxCombo:1};recordPracticeRound()");
 assert.equal(run("practiceRecord(practiceId('quick_dec')).plays"),1);
 run("P={hofGame:practiceId('lightning'),mode:'lightning',score:12,hofAttempts:15,maxCombo:7};recordPracticeRound()");
 assert.equal(run("practiceRecord(practiceId('lightning')).best"),12);
 assert.equal(run("hofScore(75,HOF_GAMES[practiceId('quick_dec')])"),'75%');
 run("mergePracticeRecords({[practiceId('quick_dec')]:{best:100,plays:3,answered:24,firstTry:22,combo:8}})");
 assert.equal(run("practiceRecord(practiceId('quick_dec')).best"),100);
 assert.equal(run("practiceRecord(practiceId('quick_dec')).plays"),3);
 run("S.cloud=true;S.pinHash='test';rpc=async()=>{throw Error('offline')}");await run('practiceBoardFlush()');
 assert.ok(run("practiceRecord(practiceId('quick_dec')).pending"));
 run("var calls=[];rpc=async(fn,args)=>{calls.push({fn,...args});return {ok:true}};");await run('practiceBoardFlush()');
 assert.equal(run("!!practiceRecord(practiceId('quick_dec')).pending"),false);
 const calls=JSON.parse(run('JSON.stringify(calls)'));
 assert.ok(calls.some(c=>c.p_game===`${name}:big:quick_dec`&&c.p_score===75&&c.p_weekly));
 assert.ok(calls.some(c=>c.p_game===`${name}:big:quick_dec`&&c.p_score===100&&!c.p_weekly));
 // An expired weekly record must not be submitted to the current week.
 run("calls=[];S.practiceScores[practiceId('quick_dec')].pending={week:'2000-01-03',score:100}");await run('practiceBoardFlush()');
 assert.ok(!run('calls.some(c=>c.p_weekly)'));
 // Hidden and local-only players can browse, but cannot submit.
 run("S.settings.hideBoard=true;calls=[];S.practiceScores[practiceId('quick_dec')].pending={week:practiceWeek(),score:100}");await run('practiceBoardFlush()');
 assert.equal(run('calls.length'),0);
 run("S.cloud=false;S.pinHash=null;var modalHTML='';modal=x=>{modalHTML=x}");await run("openBoard('all',practiceId('quick_dec'))");
 assert.ok(run("modalHTML.includes('Choose a game')"));assert.ok(run("modalHTML.includes('Shared with all players')"));
 const before=run('calls.length');await run("boardSubmit(practiceId('quick_dec'),100)");assert.equal(run('calls.length'),before);
 console.log(name+': board coverage, scoring, unfinished/duplicate guards, cloud merging, offline retries, weekly isolation, privacy and public viewing passed');
}
check().catch(e=>{console.error(e);process.exitCode=1});
