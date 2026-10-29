const puppeteer=require('puppeteer');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage']});
  let fails=0;
  const check=(name,ok,extra)=>{ console.log((ok?'PASS':'FAIL')+' — '+name+(extra?' :: '+extra:'')); if(!ok)fails++; };

  // ================= desktop index =================
  const p=await b.newPage(); await p.setViewport({width:1440,height:900});
  const errs=[]; p.on('pageerror',e=>errs.push('P:'+e.message.slice(0,120)));
  p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text().slice(0,120));});
  p.on('requestfailed',r=>errs.push('REQ:'+r.url().slice(-30)));
  await p.goto('http://127.0.0.1:8080/index.html',{waitUntil:'load'}); await wait(4000);

  const diag = await p.evaluate(()=>{
    const j=window.TIDALIA;
    return {loaderDone:getComputedStyle(document.getElementById('loader')).display==='none',
      modules:j.modules.filter(Boolean).map(m=>m.name),
      fps:Math.round(j.fps), scenes:Object.keys(j.scenes||{}),
      heroWords:document.querySelectorAll('#hero h1 .w').length,
      gradientWordsVisible:Array.from(document.querySelectorAll('#hero h1 .grad-text .w')).every(w=>getComputedStyle(w).backgroundImage.includes('linear')),
      journeyMem: j.journey? j.journey.renderer.info.memory.textures+'/'+j.journey.renderer.info.memory.geometries : 'n/a',
      drawCalls: j.journey? j.journey.renderer.info.render.calls : 0};
  });
  check('loader lifts', diag.loaderDone);
  check('all 8 modules registered', diag.modules.length===8, diag.modules.join(','));
  check('4 three.js scenes built', diag.scenes.length===4, diag.scenes.join(','));
  check('hero headline split into words', diag.heroWords===6, String(diag.heroWords));
  check('gradient words keep their gradient', diag.gradientWordsVisible);
  check('frame rate healthy (headless swiftshader)', diag.fps>20, diag.fps+'fps');
  check('journey draw calls sane', diag.drawCalls<180, diag.drawCalls+' calls, tex/geo '+diag.journeyMem);

  // scroll through the whole page, sampling for errors and layout
  const H = await p.evaluate(()=>document.body.scrollHeight);
  for (let i=0;i<=20;i++){
    await p.evaluate((y)=>window.scrollTo(0,y), Math.round(H*i/20));
    await wait(220);
  }
  check('scrolling whole page is clean', errs.length===0, errs.slice(0,3).join(' | '));

  // each story caption should be fully visible while its window is on screen
  const chap = await p.evaluate(async ()=>{
    document.documentElement.style.scrollBehavior='auto';
    const settle=async()=>{ let last=-1; for(let i=0;i<40;i++){ await new Promise(r=>requestAnimationFrame(r)); if(Math.abs(window.pageYOffset-last)<0.5) break; last=window.pageYOffset; } };
    await settle();
    const s=document.getElementById('hero');
    const ats=Array.from(document.querySelectorAll('.chapter')).map(c=>c.dataset.at.split(',').map(Number));
    const res=[];
    for (const f of [0.09,0.36,0.60,0.79]){
      window.scrollTo(0, s.getBoundingClientRect().top+pageYOffset+(s.offsetHeight-innerHeight)*f);
      await new Promise(r=>setTimeout(r,250));
      await settle();
      const ops=Array.from(document.querySelectorAll('.chapter')).map(c=>+getComputedStyle(c).opacity);
      const active=ats.findIndex(a=>f>=a[0] && f<=a[2]);
      res.push({f, active, activeOpacity: active>=0? ops[active] : null, visible: ops.filter(o=>o>0.5).length});
    }
    return res;
  });
  check('each story caption takes over in its own window (exactly one on screen)',
    chap.every(c=>c.active>=0 && c.activeOpacity>0.7 && c.visible===1) &&
    new Set(chap.map(c=>c.active)).size===4, JSON.stringify(chap));

  // realms
  await p.evaluate(()=>{const s=document.getElementById('realms');window.scrollTo(0,s.getBoundingClientRect().top+pageYOffset+(s.offsetHeight-innerHeight)*0.5);});
  await wait(2200);
  const realms = await p.evaluate(()=>({name:document.querySelector('[data-realm-name]').textContent, idx:document.querySelector('[data-realm-index]').textContent,
    dots:document.querySelectorAll('[data-realm-dot].is-on').length, bgOn:document.querySelectorAll('.realms__bg.is-on').length}));
  check('carousel shows a realm with metadata', realms.name.length>3 && realms.idx.includes('/'), JSON.stringify(realms));
  await p.click('[data-open-realm]'); await wait(800);
  check('realm modal opens', await p.evaluate(()=>document.getElementById('realm-modal').classList.contains('is-open')));
  await p.keyboard.press('Escape'); await wait(600);
  check('realm modal closes on Escape', await p.evaluate(()=>!document.getElementById('realm-modal').classList.contains('is-open')));

  // audio
  await p.click('#sound-toggle'); await wait(1600);
  const au = await p.evaluate(()=>({on:window.TIDALIA.audio.on,state:window.TIDALIA.audio.ctx.state,lvl:+window.TIDALIA.audio.level.toFixed(3)}));
  check('ambient soundtrack runs on user gesture', au.on&&au.state==='running'&&au.lvl>0, JSON.stringify(au));

  // ================= composer =================
  await p.goto('http://127.0.0.1:8080/composer.html',{waitUntil:'load'}); await wait(3000);
  check('composer loader lifts (no streaming scene on this page)', await p.evaluate(()=>getComputedStyle(document.getElementById('loader')).display==='none'));
  await p.click('#composer-form button[type=submit]'); await wait(700);
  check('empty prompt is rejected with a message', (await p.evaluate(()=>document.querySelector('.err').textContent)).length>10);
  await p.type('#composer-form textarea','neon rain on a motorway at 3am',{delay:4});
  await p.click('#composer-form button[type=submit]'); await wait(5200);
  const r1 = await p.evaluate(()=>({shown:!document.getElementById('result-wrap').hidden,
    busyHidden:document.getElementById('compose-busy').hidden,
    title:document.querySelector('[data-res-title]').textContent,
    meta:document.querySelector('[data-res-meta]').textContent.replace(/\s+/g,''),
    realm:document.querySelector('[data-res-meta]').textContent}));
  check('composer renders a track', r1.shown && r1.title.length>3, r1.title);
  check('the "composing" panel hides again', r1.busyHidden);
  check('prompt steers the realm (neon rain → chrome)', /Chrome/.test(r1.realm), r1.realm.slice(0,40));
  await p.click('[data-res-play]'); await wait(2200);
  check('generated track plays live', await p.evaluate(()=>!!window.TIDALIA.audio.activeTrack() && window.TIDALIA.audio.level>0));
  await p.click('[data-res-add]'); await wait(600);
  check('track saves to the local archive', await p.evaluate(()=>JSON.parse(localStorage.getItem('tidalia:archive')||'[]').length===1));
  await p.screenshot({path:'shots/Z1-composer.png'});

  // ================= archive =================
  await p.goto('http://127.0.0.1:8080/archive.html',{waitUntil:'load'}); await wait(2600);
  const arch = await p.evaluate(()=>({cards:document.querySelectorAll('#archive-grid .track').length,
    waves:document.querySelectorAll('#archive-grid canvas').length, count:document.getElementById('archive-count').textContent}));
  check('archive lists seeds + the saved track', arch.cards===10 && arch.waves===10, JSON.stringify(arch));
  await p.click('[data-filter="lagoon"]'); await wait(900);
  check('realm filter narrows the list', await p.evaluate(()=>document.querySelectorAll('#archive-grid .track').length===1 && document.getElementById('archive-count').textContent.includes('Cassette Lagoon')));
  await p.screenshot({path:'shots/Z2-archive.png'});

  // ================= mobile =================
  const m=await b.newPage(); await m.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const merrs=[]; m.on('pageerror',e=>merrs.push(e.message.slice(0,100)));
  await m.goto('http://127.0.0.1:8080/index.html',{waitUntil:'load'}); await wait(4200);
  check('mobile: no horizontal overflow', await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),
        'scrollW='+await m.evaluate(()=>document.documentElement.scrollWidth));
  await m.screenshot({path:'shots/Z3-mobile-hero.png'});
  await m.evaluate(()=>{const el=document.getElementById('finale');window.scrollTo(0,el.getBoundingClientRect().top+pageYOffset);}); await wait(2200);
  await m.screenshot({path:'shots/Z4-mobile-finale.png'});
  await m.evaluate(()=>{const s=document.getElementById('realms');window.scrollTo(0,s.getBoundingClientRect().top+pageYOffset+(s.offsetHeight-innerHeight)*0.6);}); await wait(2200);
  await m.screenshot({path:'shots/Z5-mobile-realms.png'});
  check('mobile: journey + pages run without errors', merrs.length===0, merrs.slice(0,2).join(' | '));

  console.log('\n'+(fails===0? '✅ ALL CHECKS PASSED' : '❌ '+fails+' check(s) failed'));
  await b.close();
  process.exit(fails?1:0);
})();
