const ROOTS=new Set(['Q783794']);
const qid=id=>/^Q\d+$/.test(id||'');
export const claimIds=(entity,property)=>(entity?.claims?.[property]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value?.id).filter(qid);
export async function searchCompanies(query,{fetcher=fetch,signal,classes=new Map()}={}){
  query=query.trim();if(query.length<3||query.length>120)return [];
  async function api(params){const url=new URL('https://www.wikidata.org/w/api.php');url.search=new URLSearchParams({format:'json',origin:'*',...params});const r=await fetcher(url.href,{signal,credentials:'omit',referrerPolicy:'no-referrer',headers:{'Api-User-Agent':'PrepSpace/1.0 (https://github.com/qascript20/prep-interview)'}});if(!r.ok)throw new Error('Company search unavailable');const data=await r.json();if(data.error)throw new Error('Company search unavailable');return data;}
  const found=await api({action:'wbsearchentities',search:query,language:'en',uselang:'en',type:'item',limit:'10'});
  const candidates=(found.search||[]).filter(x=>qid(x.id)&&/\b(company|companies|corporation|bank|banking|firm|enterprise|business|subsidiary|conglomerate|holdings|retailer|airline|insurer|lender|startup|stock exchange)\b/i.test(x.description||''));if(!candidates.length)return [];
  const {entities={}}=await api({action:'wbgetentities',ids:candidates.map(x=>x.id).join('|'),props:'claims'});
  let frontier=[...new Set(Object.values(entities).flatMap(e=>claimIds(e,'P31')))];
  for(let depth=0;depth<6&&frontier.length;depth++){
    const missing=frontier.filter(id=>!ROOTS.has(id)&&!classes.has(id));
    for(let offset=0;offset<missing.length;offset+=50){const data=await api({action:'wbgetentities',ids:missing.slice(offset,offset+50).join('|'),props:'claims'});for(const id of missing.slice(offset,offset+50))classes.set(id,claimIds(data.entities?.[id],'P279'));}
    if(candidates.every(item=>claimIds(entities[item.id],'P31').some(id=>isBusiness(id))))break;
    frontier=[...new Set(frontier.flatMap(id=>classes.get(id)||[]))];
  }
  function isBusiness(id,seen=new Set()) {if(ROOTS.has(id))return true;if(seen.has(id))return false;seen.add(id);return (classes.get(id)||[]).some(parent=>isBusiness(parent,seen));}
  const result=candidates.filter(item=>claimIds(entities[item.id],'P31').some(id=>isBusiness(id))).slice(0,5).map(item=>({id:item.id,name:String(item.label||'').slice(0,120),description:String(item.description||'').slice(0,240)})).filter(x=>x.name);
  if(classes.size>1000)classes.clear();return result;
}
export function mountCompanySearch(){
 const input=document.getElementById('studio-company'),list=document.getElementById('company-results'),status=document.getElementById('company-search-status');if(!input||!list||!status||input.dataset.companySearch)return;input.dataset.companySearch='true';
 let timer,controller,revision=0,results=[],active=-1,closed=false;const cache=new Map(),classes=new Map();
 function hide(){closed=true;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function show(items){results=items;active=-1;list.replaceChildren();for(const [i,item] of items.entries()){const option=document.createElement('div');option.id='company-option-'+i;option.role='option';option.setAttribute('aria-selected','false');option.dataset.companyIndex=i;const name=document.createElement('strong'),description=document.createElement('small');name.textContent=item.name;description.textContent=item.description;option.append(name,description);list.append(option);}list.hidden=!items.length;input.setAttribute('aria-expanded',String(!!items.length));}
 function choose(i){const item=results[i];if(!item)return;revision++;controller?.abort();clearTimeout(timer);input.value=item.name;hide();status.textContent='Selected '+item.name+'.';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));hide();clearTimeout(timer);input.focus();}
 function schedule(){clearTimeout(timer);controller?.abort();const token=++revision,query=input.value.trim();closed=false;hide();closed=false;status.textContent='';if(query.length<3)return;timer=setTimeout(async()=>{if(closed||!input.isConnected)return;const key=query.toLocaleLowerCase();if(cache.has(key)){show(cache.get(key));status.textContent=results.length?'':'No company matches. You can keep your own entry.';return;}const requestController=new AbortController();controller=requestController;const deadline=setTimeout(()=>requestController.abort(),18000);status.textContent='Searching Wikidata…';try{const items=await searchCompanies(query,{signal:requestController.signal,classes});if(token!==revision||closed||!input.isConnected)return;cache.set(key,items);if(cache.size>30)cache.delete(cache.keys().next().value);show(items);status.textContent=items.length?'':'No company matches. You can keep your own entry.';}catch{if(token===revision&&!closed&&input.isConnected){hide();status.textContent='Search unavailable. You can still enter any company.';}}finally{clearTimeout(deadline);}},500);}
 input.addEventListener('input',schedule);input.addEventListener('focus',()=>{if(input.value.trim().length>=3)schedule();});input.addEventListener('blur',()=>{clearTimeout(timer);revision++;controller?.abort();hide();});
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();clearTimeout(timer);revision++;controller?.abort();hide();status.textContent='';}if(list.hidden)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();active=active<0?(event.key==='ArrowDown'?0:results.length-1):(active+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;for(const [i,el] of [...list.children].entries())el.setAttribute('aria-selected',String(i===active));input.setAttribute('aria-activedescendant','company-option-'+active);}if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active);}});
 list.addEventListener('pointerdown',event=>{const option=event.target.closest('[data-company-index]');if(option){event.preventDefault();choose(Number(option.dataset.companyIndex));}});
}
if(typeof window!=='undefined')window.PrepCompanySearch={mount:mountCompanySearch};
