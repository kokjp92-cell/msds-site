const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname, PER_PAGE=500;
const companies=[
 ['GS칼텍스','gs-caltex','정유 제품의 국문 MSDS를 확인할 수 있습니다.','경유는 주유소 판매용·해상용·수출용을 구분하고, 휘발유는 보통·고급·항공용 제품명을 대조하세요.'],
 ['SK에너지','sk-energy','공식 MSDS 목록에서 제품을 조회하는 경로를 안내합니다.','공식 목록으로 이동한 뒤 제품명으로 조회하고 MSDS 열의 저장 아이콘을 선택하세요. 경고표지는 MSDS와 다른 문서입니다.'],
 ['S-OIL','s-oil','정유·석유화학 제품의 공식 MSDS로 연결합니다.','연료의 용도와 황 함유량, 수지의 제품 등급을 구분하세요. 비슷한 이름이더라도 사용하는 제품과 일치하는 문서를 선택해야 합니다.'],
 ['HD현대오일뱅크','hyundai-xteer','등록된 현대 XTeer 제품의 공식 검색 결과로 연결합니다.','점도와 제품 등급을 대조한 뒤 MSDS 다운로드 여부를 확인하세요. XTeer Alpha Diesel·Gasoline은 연료첨가제이므로 연료 자체의 자료와 구분하세요.'],
 ['GS칼텍스 Kixx','kixx','Kixx 윤활유의 국문·영문 MSDS를 찾을 수 있습니다.','같은 제품군에서도 SAE·ISO 점도와 성능 등급이 다를 수 있습니다. 디젤 엔진용 윤활유는 경유 연료와 다른 제품입니다.'],
 ['에쓰오일토탈에너지스윤활유','stlc','윤활유의 공식 PDF·ZIP 자료로 연결합니다.','제품명과 점도를 확인하세요. ZIP은 내려받아 압축을 푼 뒤 해당 제품 문서를 선택하고, 제품 설명서인 TDS와 MSDS를 구분하세요.'],
 ['노루페인트','noroo','제품코드·색상별 공식 MSDS를 확인할 수 있습니다.','제품명이 같아도 색상·제품코드·주제·경화제에 따라 문서가 다를 수 있습니다. 실제 사용하는 용기 라벨의 코드를 목록과 대조하세요.'],
 ['KCC','kcc','언어·국가가 구분된 공식 MSDS를 제공합니다.','국문이 필요하면 국문(KOR)을 선택하세요. 영문(USA) 등 다른 국가용 문서는 제품명뿐 아니라 언어와 적용 국가를 확인해야 합니다.'],
 ['한국쓰리엠','3m','제품명과 SDS 번호로 공식 문서를 찾을 수 있습니다.','제품명이나 SDS 번호를 대조하세요. 긴 제품명은 공식 검색 결과에서 일부 생략될 수 있으므로 문서 번호와 PDF 첫 페이지도 함께 확인하세요.'],
 ['대한유화','kpic','수지 제품 등급별 공식 국문·영문 MSDS로 연결합니다.','숫자와 영문이 포함된 제품 등급을 정확히 확인하세요. 비슷한 등급의 문서를 임의로 대신 사용하지 말고 용기·포장 표기와 대조하세요.'],
 ['현대종합금속','hyundai-welding','용접재료 제품별 공식 MSDS를 확인할 수 있습니다.','피복봉·솔리드와이어·플럭스코어드와이어 등 재료 종류와 제품명을 확인하세요. 국문·영문 버튼이 함께 있으면 필요한 언어를 선택하세요.'],
 ['조선선재','chosun-welding','용접봉·와이어·플럭스의 공식 국문 MSDS로 연결합니다.','공식 다운로드가 HTTP 주소로 제공됩니다. 브라우저에서 다운로드가 제한되면 공식 목록 페이지에서 제품명을 조회하세요. 계속 제한되면 공급자에게 자료를 요청하세요.'],
 ['에어리퀴드코리아','air-liquide','산업용가스와 혼합가스의 공식 MSDS를 확인할 수 있습니다.','기체·액체 상태, 혼합 조성, AL·DIG 등 공급자 표기를 구분하세요. 이름이 같은 가스라도 공급자와 제품 구분이 맞는 문서를 선택하세요.'],
 ['헨켈 / LOCTITE','loctite','현재 등록된 LOCTITE 제품의 공식 자료 경로를 안내합니다.','등록 범위는 일부 제품입니다. 공식 페이지에서 지역·언어·제품번호를 확인하고, 접근할 수 없으면 제조사 자료 검색이나 공급자 문의를 이용하세요.']
];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const file=(slug,page=1)=>`manufacturer-${slug}${page===1?'':'-'+page}.html`;
const fmt=n=>n.toLocaleString('ko-KR');
const link=(url,text,cls='action')=>`<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(text)}</a>`;
const make=tag=>({tag,children:[],dataset:{},append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},querySelectorAll(){return []},addEventListener(){}});
async function readProducts(html){
 const nodes=Object.fromEntries(['query','results','heading','search','catalog-status','kcc-catalog-status','three-m-catalog-status'].map(k=>['#'+k,make(k)]));nodes['#query'].value='';
 const context={URL,URLSearchParams,document:{querySelector:k=>nodes[k],querySelectorAll:()=>[],createElement:make,createTextNode:t=>({textContent:t})},fetch:async name=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'))})};
 vm.runInNewContext(html.split('<script>')[1].split('</script>')[0]+'\nthis.exportedProducts=products;',context);
 await new Promise(r=>setImmediate(r));
 const base=JSON.parse(html.match(/const catalog = (\[.*\]);/)[1]);const expected=base.length+['noroo-products.json','kcc-products.json','3m-products.json'].reduce((n,f)=>n+JSON.parse(fs.readFileSync(path.join(root,f))).length,0);
 assert.equal(context.exportedProducts.length,expected,'All source catalogs must load before generation');
 return Array.from(context.exportedProducts,p=>JSON.parse(JSON.stringify(p)));
}
const extraCss=`.breadcrumbs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;font-size:14px}.breadcrumbs a{color:#17644f}.catalog-intro{line-height:1.8;margin-bottom:24px}.catalog-intro h2{margin-top:24px}.pagination{height:auto;max-width:none;display:flex;flex-wrap:wrap;justify-content:flex-start;gap:6px;border:0;padding:12px 0;margin:12px 0}.pagination a,.pagination span{display:inline-flex;min-width:44px;min-height:44px;padding:8px 12px;align-items:center;justify-content:center;border:1px solid #cbdcda;border-radius:7px}.pagination a{background:white}.pagination [aria-current]{background:#102c35;color:white}.catalog-filter{display:block;background:#fff;border:1px solid #dbe5e8;border-radius:12px;padding:16px;margin:20px 0}.catalog-filter label{display:block;font-weight:700;margin-bottom:8px}.catalog-filter input{border:1px solid #a9bfc1;min-height:44px}.catalog-filter p{margin-bottom:0}.catalog-item[hidden]{display:none!important}.catalog-hub h2{font-size:20px}.catalog-hub p{margin:6px 0}.catalog-count{font-weight:700;color:#17644f}.global-search label{display:block;font-size:14px;font-weight:700;margin-bottom:8px}.global-search{margin-top:20px}.global-search form{border:1px solid #dbe5e8}.page-title{font-size:clamp(28px,4vw,40px);line-height:1.35;overflow-wrap:anywhere}.catalog-intro p{margin:10px 0}@media(max-width:640px){.pagination{gap:5px}.pagination a,.pagination span{padding:8px;min-width:42px}.catalog-filter{padding:14px}.catalog-hub .row{align-items:stretch}.catalog-hub .row h2{font-size:20px}.catalog-intro{line-height:1.75}}`;
function footer(){return `<footer class="site-footer"><div class="footer-inner"><div><strong>MSDS 모아</strong><p>제조사 공식 물질안전보건자료로 연결합니다.</p></div><nav aria-label="하단 메뉴"><a href="about.html">사이트 소개</a><a href="guide.html">이용 방법</a><a href="index.html#msds-law">MSDS 관련 법령</a><a href="privacy.html">개인정보 안내</a><a href="feedback.html">링크 오류 안내</a><a href="index.html#faq">자주 묻는 질문</a></nav></div></footer>`}
function shell(title,description,heading,subtitle,body,css,script=''){
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="theme-color" content="#102c35"><meta name="application-name" content="MSDS 모아"><meta property="og:site_name" content="MSDS 모아"><link rel="icon" href="favicon.ico?v=20261106" sizes="any"><link rel="icon" type="image/svg+xml" href="favicon.svg?v=20261106"><link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png"><link rel="manifest" href="site.webmanifest"><meta name="description" content="${escape(description)}"><style>${css}\n${extraCss}</style></head><body><!-- generated:manufacturer-catalog --><header><nav><a class="brand" href="index.html" aria-label="MSDS 모아 홈"><img src="favicon.svg" alt="" width="28" height="28"><strong>MSDS 모아</strong></a><a href="manufacturers.html" style="color:#c8d9de">제조사별 자료실</a></nav><section class="hero"><div class="eyebrow">제조사별 물질안전보건자료</div><h1 class="page-title">${escape(heading)}</h1><p>${escape(subtitle)}</p></section></header><main>${body}</main>${footer()}${script}</body></html>`;
}
function pager(slug,current,total){
 if(total===1)return '';
 const visible=[...new Set([1,total,...Array.from({length:5},(_,i)=>current+i-2).filter(n=>n>=1&&n<=total)])].sort((a,b)=>a-b);
 let items=current>1?`<a href="${file(slug,current-1)}" rel="prev">이전</a>`:'';
 let last=0;
 for(const n of visible){if(last&&n>last+1)items+='<span aria-hidden="true">…</span>';items+=n===current?`<span aria-current="page">${n}</span>`:`<a href="${file(slug,n)}" aria-label="${n}페이지">${n}</a>`;last=n;}
 if(current<total)items+=`<a href="${file(slug,current+1)}" rel="next">다음</a>`;
 const all=Array.from({length:total},(_,i)=>`<a href="${file(slug,i+1)}">${i+1}</a>`).join('');
 return `<nav class="pagination" aria-label="자료 목록 페이지">${items}</nav>`+(total>7?`<details class="maker"><summary>전체 ${total}페이지 바로가기</summary><div class="pagination" style="padding:0 12px 12px">${all}</div></details>`:'');

}
function productRow(p){
 const other=(p.additionalDownloads||[]).map(d=>link(d.url,`공식 ${d.language} MSDS 다운로드 ↗`)).join('');
 const fallback=p.verifiedList&&p.verifiedList!==p.url?link(p.verifiedList,'공식 목록·검색 결과','meta'):'';
 return `<article class="row catalog-item" data-search="${escape([p.name,p.company,p.detail,p.keywords].join(' ').toLowerCase())}"><div><div class="status">${escape(p.company+' · '+(p.detail||'공식 자료'))}</div><h3>${escape(p.name)}</h3><div class="meta">${escape(p.instructions||'제품명과 공급자 정보를 확인하세요.')}</div></div><div class="result-actions">${link(p.url,p.label||'공식 자료 열기 ↗')}${other}${fallback}</div></article>`;
}
const pageScript=`<script>const field=document.getElementById('page-filter');const rows=Array.from(document.querySelectorAll('.catalog-item'));field.addEventListener('input',()=>{const terms=field.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);let count=0;for(const row of rows){row.hidden=!terms.every(t=>row.dataset.search.includes(t));if(!row.hidden)count++;}document.getElementById('page-filter-status').textContent='이 페이지에서 '+count.toLocaleString('ko-KR')+'건';});</script>`;
async function build(){
 let home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 if(!home.includes('id="manufacturer-directory-link"'))home=home.replace('<h2 id="heading">','<p class="note"><a id="manufacturer-directory-link" href="manufacturers.html">제조사별 MSDS 자료실 보기 →</a> · 페이지별 자료 목록과 다운로드 안내를 확인하세요.</p><h2 id="heading">');
 if(!home.includes('new URLSearchParams(location.search)'))home=home.replace("const query = document.querySelector('#query');","const query = document.querySelector('#query');\nif (typeof location !== 'undefined') query.value = new URLSearchParams(location.search).get('q') || '';");
 fs.writeFileSync(path.join(root,'index.html'),home);
 const products=await readProducts(home),css=home.split('<style>')[1].split('</style>')[0],groups=Map.groupBy(products,p=>p.company);
 assert.deepEqual(new Set(groups.keys()),new Set(companies.map(c=>c[0])),'Every manufacturer needs a configured page');
 // Delete only earlier outputs explicitly marked as owned by this generator.
 for(const f of fs.readdirSync(root))if(/^manufacturer-.+\.html$/.test(f)&&fs.readFileSync(path.join(root,f),'utf8').includes('generated:manufacturer-catalog'))fs.unlinkSync(path.join(root,f));
 let pages=0,rendered=0;
 const report=[];
 for(const [company,slug,intro,guide] of companies){
  const rows=groups.get(company),total=Math.ceil(rows.length/PER_PAGE);report.push({company,slug,items:rows.length,pages:total});
  for(let current=1;current<=total;current++){
   const batch=rows.slice((current-1)*PER_PAGE,current*PER_PAGE),start=(current-1)*PER_PAGE+1,end=start+batch.length-1;
   const introBody=current===1?`<section class="catalog-intro"><h2>${escape(company)} 자료를 선택하는 방법</h2><p>${escape(intro)}</p><p>${escape(guide)}</p><p class="note">이 사이트에 등록된 자료의 목록입니다. 같은 제품도 언어·국가·색상·등급에 따라 여러 항목이 있을 수 있습니다. 제조사 전체 제품이나 최신 개정 여부를 보장하는 목록은 아니므로 원문과 공급자 정보를 확인하세요.</p></section>`:`<p class="note">${escape(company)} 자료 목록 ${current}페이지입니다. <a href="${file(slug)}">첫 페이지의 제품 선택 안내</a>도 확인하세요.</p>`;
   const global=`<div class="global-search"><label for="global-query">전체 제조사 자료 검색</label><form action="index.html" method="get"><input id="global-query" name="q" type="search" placeholder="제품명·제조사·제품코드" aria-label="전체 자료 검색어"><button type="submit">검색</button></form></div>`;
   const body=`<div class="breadcrumbs"><a href="index.html">검색 홈</a><span>›</span><a href="manufacturers.html">제조사별 자료실</a><span>›</span><span>${escape(company)}</span></div>${introBody}<h2 id="catalog-heading">등록 자료 ${fmt(rows.length)}건</h2><p class="note">${current} / ${total}페이지 · ${fmt(start)}–${fmt(end)}번째 자료 · 페이지당 최대 ${PER_PAGE}건</p>${global}${pager(slug,current,total)}<div class="catalog-filter"><label for="page-filter">이 페이지 안에서 찾기</label><input id="page-filter" type="search" placeholder="제품명·코드·언어 등" aria-describedby="filter-help"><p class="note" id="filter-help">현재 페이지의 ${fmt(batch.length)}건 안에서 찾습니다. 다른 페이지나 제조사까지 찾으려면 위의 전체 자료 검색을 이용하세요.</p><p class="note" role="status" id="page-filter-status">이 페이지에서 ${fmt(batch.length)}건</p></div><section aria-labelledby="catalog-heading">${batch.map(productRow).join('\n')}</section>${pager(slug,current,total)}`;
   const title=current===1?`${company} MSDS 검색·다운로드 | MSDS 모아`:`${company} MSDS 목록 ${current}페이지 | MSDS 모아`;
   const description=`${company} 물질안전보건자료(MSDS·SDS) ${fmt(rows.length)}건 중 ${fmt(start)}–${fmt(end)}번째 자료입니다. 제품명·등급·언어를 확인하고 제조사 공식 문서로 이동하세요.`;
   fs.writeFileSync(path.join(root,file(slug,current)),shell(title,description,`${company} MSDS${current>1?' · '+current+'페이지':''}`,intro,body,css,pageScript));pages++;rendered+=batch.length;
  }
 }
 const hubBody=`<div class="breadcrumbs"><a href="index.html">검색 홈</a><span>›</span><span>제조사별 자료실</span></div><section class="catalog-intro"><h2>사용 중인 제품의 제조사를 선택하세요</h2><p>제조사별 자료 목록과 다운로드 방법을 확인할 수 있습니다. 목록의 페이지 번호를 누르면 다음 자료로 이동합니다. 제품명을 알고 있다면 <a href="index.html">전체 자료 검색</a>을 이용하는 편이 빠릅니다.</p><p class="note">총 ${companies.length}개 제조사·브랜드, 등록 자료 ${fmt(products.length)}건입니다. 언어·국가·색상·등급이 다른 문서는 별도 항목일 수 있습니다. 직접 다운로드 버튼은 제조사 서버의 파일로 연결되며, 공식 목록으로 이동하는 자료는 해당 사이트에서 다시 조회해야 할 수 있습니다.</p></section><section class="catalog-hub" aria-label="제조사 목록">${companies.map(([company,slug,intro])=>`<article class="row"><div><h2><a href="${file(slug)}">${escape(company)} MSDS</a></h2><p class="meta">${escape(intro)}</p><p class="catalog-count">등록 자료 ${fmt(groups.get(company).length)}건</p></div><a class="action" href="${file(slug)}">자료 목록 보기 →</a></article>`).join('')}</section>`;
 fs.writeFileSync(path.join(root,'manufacturers.html'),shell('제조사별 MSDS 자료실 | MSDS 모아',`노루페인트·KCC·한국쓰리엠·정유사 등 ${companies.length}개 제조사·브랜드의 공식 MSDS 경로를 확인하세요. 제조사별 자료 선택 방법과 페이지별 목록을 제공합니다.`,'제조사별 MSDS 자료실','제품에 표시된 제조사·공급자를 확인하고 해당 자료 목록을 선택하세요.',hubBody,css));
 const guidePath=path.join(root,'guide.html');let guideHtml=fs.readFileSync(guidePath,'utf8');if(!guideHtml.includes('id="manufacturer-guide-link"'))guideHtml=guideHtml.replace('<h2>제품 검색부터 PDF 확인까지</h2>','<p id="manufacturer-guide-link"><a href="manufacturers.html">제조사별 MSDS 자료실</a>에서는 제품 목록을 페이지별로 살펴볼 수 있습니다. 페이지 안 찾기와 전체 자료 검색은 검색 범위가 다르므로 안내를 확인하세요.</p><h2>제품 검색부터 PDF 확인까지</h2>');fs.writeFileSync(guidePath,guideHtml);
 assert.equal(rendered,products.length);
 fs.writeFileSync(path.join(root,'업로드안내.txt'),'제조사별 MSDS 페이지 포함 전체 파일입니다.\n\n1. 새 폴더에 압축을 풉니다.\n2. GitHub 저장소에서 Add file → Upload files를 누릅니다.\n3. 이 폴더 안의 파일을 모두 선택해 업로드합니다. 폴더나 ZIP 자체를 올리지 않습니다.\n4. Commit changes를 누릅니다.\n5. 배포 후 홈의 제조사별 MSDS 자료실 보기를 확인합니다.\n\n자료 목록을 바꾸면 제조사별 HTML도 다시 만들어야 합니다. 다음 업데이트 때 전체 파일을 교체하세요. 생성 도구는 build-manufacturer-pages.cjs이며 Node.js 표준 모듈만 사용합니다. 실행: node build-manufacturer-pages.cjs\n');
 console.log(JSON.stringify({total:products.length,manufacturerCount:companies.length,listPages:pages,totalFiles:fs.readdirSync(root).filter(f=>!f.startsWith('.')).length,report},null,2));
}
build().catch(e=>{console.error(e);process.exitCode=1});
