const CATEGORIES=[
 ["Food","🍔"],["Groceries","🛒"],["Transport","🚕"],["Fuel","⛽"],["Shopping","🛍️"],
 ["Bills","📄"],["Rent","🏠"],["Entertainment","🎬"],["Health","💊"],["Travel","✈️"],
 ["Education","📚"],["Subscriptions","🔁"],["EMI / Loans","💳"],["Personal","👤"],["Other","•••"]
];
const PAYMENTS=["Cash","UPI","Credit Card","Debit Card","Bank Transfer","Other"];
const GOOGLE_CLIENT_ID="454032202728-27a3smrichr13pelgf9houjulvpn5d.apps.googleusercontent.com";
const GOOGLE_SCOPE="https://www.googleapis.com/auth/drive.file";
const SHEET_NAME="Spend Analyser Data";
const EXPENSE_HEADERS=["ID","Date","Amount","Category","Note","Payment Method","Created At","Updated At"];
const SETTINGS_HEADERS=["Key","Value"];
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n||0);
const $=id=>document.getElementById(id);
let expenses=JSON.parse(localStorage.getItem("spend_analyser_expenses")||"[]");
let budget=Number(localStorage.getItem("spend_analyser_budget")||0);
let selectedCategory="Food";
let googleToken=null;
let tokenClient=null;
let spreadsheetId=localStorage.getItem("spend_analyser_sheet_id")||"";
let syncInProgress=false;

function save(){localStorage.setItem("spend_analyser_expenses",JSON.stringify(expenses));localStorage.setItem("spend_analyser_budget",budget)}
function monthKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`}
function currentMonth(){return monthKey(new Date())}
function currentExpenses(){return expenses.filter(e=>monthKey(e.date)===currentMonth())}
function total(arr){return arr.reduce((s,e)=>s+Number(e.amount),0)}
function dateText(d){return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
function categoryIcon(c){return CATEGORIES.find(x=>x[0]===c)?.[1]||"•"}
function nowISO(){return new Date().toISOString()}
function localExpense(e){return {...e,amount:Number(e.amount),createdAt:e.createdAt||e.date||nowISO(),updatedAt:e.updatedAt||e.date||nowISO()}}
function setSyncStatus(text,kind="muted"){$("syncStatus").textContent=text;$('syncStatus').className=`muted sync-status ${kind}`}

function render(){
 const now=new Date(), cur=currentExpenses(), mt=total(cur);
 $("dateLabel").textContent=now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
 $("monthTotal").textContent=money(mt);
 $("todayTotal").textContent=money(total(expenses.filter(e=>new Date(e.date).toDateString()===now.toDateString())));
 $("txCount").textContent=cur.length;
 if(budget){const pct=Math.min(mt/budget,1);$("budgetProgress").style.width=(pct*100)+"%";$("budgetText").textContent=money(Math.abs(budget-mt))+(budget>=mt?" remaining":" over budget")}else{$("budgetProgress").style.width="0";$("budgetText").textContent="No monthly budget set"}
 renderWeek();renderRecent();renderExpenses();renderAnalytics();$("budgetInput").value=budget||"";
}
function renderWeek(){
 const box=$("weekChart");box.innerHTML="";const now=new Date(), vals=[];
 for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const n=total(expenses.filter(e=>new Date(e.date).toDateString()===d.toDateString()));vals.push({d,n})}
 const max=Math.max(...vals.map(x=>x.n),1);
 vals.forEach(x=>{const col=document.createElement("div");col.className="bar-col";col.innerHTML=`<div>${x.n?money(x.n):""}</div><div class="bar" style="height:${Math.max(3,x.n/max*130)}px"></div><div>${x.d.toLocaleDateString("en-IN",{weekday:"short"})}</div>`;box.appendChild(col)})
}
function expenseHTML(e){
 return `<div class="expense" data-id="${e.id}"><div class="expense-icon">${categoryIcon(e.category)}</div><div class="expense-main"><b>${escapeHTML(e.category)}</b><small>${escapeHTML(e.note||e.paymentMethod)} · ${dateText(e.date)}</small></div><div class="expense-amt">${money(e.amount)}</div></div>`
}
function renderRecent(){$("recentList").innerHTML=currentExpenses().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(expenseHTML).join("")||'<div class="muted">No expenses this month. Tap + to add one.</div>'}
function renderExpenses(){
 const q=($("search").value||"").toLowerCase();
 const arr=expenses.filter(e=>(e.category+" "+e.note+" "+e.paymentMethod).toLowerCase().includes(q)).sort((a,b)=>new Date(b.date)-new Date(a.date));
 $("expenseList").innerHTML=arr.map(expenseHTML).join("")||'<div class="card muted">No expenses found.</div>';
}
function renderAnalytics(){
 const cur=currentExpenses(), mt=total(cur), grouped={};cur.forEach(e=>grouped[e.category]=(grouped[e.category]||0)+Number(e.amount));
 const items=Object.entries(grouped).sort((a,b)=>b[1]-a[1]), colors=items.map((_,i)=>`hsl(${i*47%360} 65% 50%)`);
 $("analyticsMonth").textContent=new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"});
 $("analyticsTotal").textContent=money(mt);
 const prev=new Date();prev.setMonth(prev.getMonth()-1);const prevTotal=total(expenses.filter(e=>monthKey(e.date)===monthKey(prev)));
 $("monthComparison").textContent=prevTotal?`${mt>=prevTotal?"↑":"↓"} ${money(Math.abs(mt-prevTotal))} vs last month (${Math.abs((mt-prevTotal)/prevTotal*100).toFixed(1)}%)`:"Add another month of expenses to compare.";
 let start=0;const stops=items.map((x,i)=>{const end=start+(x[1]/(mt||1))*100;const s=`${colors[i]} ${start}% ${end}%`;start=end;return s}).join(",");
 $("categoryChart").innerHTML=items.length?`<div class="donut" style="background:conic-gradient(${stops})"></div>`:'<div class="muted">No data yet.</div>';
 $("categoryList").innerHTML=items.map(x=>`<div class="cat-row"><span>${categoryIcon(x[0])} ${escapeHTML(x[0])}</span><b>${money(x[1])} · ${(x[1]/(mt||1)*100).toFixed(1)}%</b></div>`).join("");
 const insights=[];if(items[0])insights.push(`Your largest category is ${items[0][0]} at ${money(items[0][1])}.`);
 if(mt){const avg=mt/new Date().getDate();insights.push(`Your average spending per calendar day so far is ${money(avg)}.`)}
 if(prevTotal)insights.push(`Total spending is ${mt<=prevTotal?"lower":"higher"} than last month.`)
 $("insights").innerHTML=insights.map(x=>`<div class="insight">${x}</div>`).join("")||'<div class="muted">Add expenses to generate insights.</div>';
}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function openModal(){
 $("expenseModal").classList.remove("hidden");$("amount").value="";$("note").value="";selectedCategory="Food";
 $("expenseDate").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 renderCategories();$("amount").focus();
}
function renderCategories(){
 $("categoryGrid").innerHTML=CATEGORIES.map(x=>`<button type="button" class="cat ${selectedCategory===x[0]?"selected":""}" data-cat="${x[0]}">${x[1]} ${x[0]}</button>`).join("");
 document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories()})
}

function initGoogle(){
 if(tokenClient)return true;
 if(!window.google || !window.google.accounts || !window.google.accounts.oauth2){
   setSyncStatus("Google sign-in could not be loaded. Refresh the page and try again.","error");
   return false;
 }
 try{
   tokenClient=window.google.accounts.oauth2.initTokenClient({
     client_id:GOOGLE_CLIENT_ID,
     scope:GOOGLE_SCOPE,
     include_granted_scopes:true,
     callback:()=>{}
   });
   $("connectGoogle").onclick=connectGoogle;
   $("disconnectGoogle").onclick=disconnectGoogle;
   if(spreadsheetId)setSyncStatus("Google Sheet remembered. Connect to sync.");
   return true;
 }catch(err){
   console.error("Google OAuth initialization failed",err);
   setSyncStatus("Google sign-in could not be initialized. Refresh the page and try again.","error");
   return false;
 }
}
function getToken(prompt="consent"){
 return new Promise((resolve,reject)=>{
   if(!tokenClient && !initGoogle()){
     reject(new Error("Google sign-in is not available. Refresh the page and try again."));
     return;
   }
   tokenClient.callback=(response)=>{
     if(!response){reject(new Error("No response from Google."));return}
     if(response.error){reject(new Error(response.error_description||response.error));return}
     if(!response.access_token){reject(new Error("Google did not return an access token."));return}
     googleToken=response.access_token;
     resolve(googleToken);
   };
   try{
     tokenClient.requestAccessToken({prompt});
   }catch(err){
     reject(err);
   }
 });
}
async function connectGoogle(){
 if(syncInProgress)return;
 try{
   syncInProgress=true;$("connectGoogle").disabled=true;setSyncStatus("Connecting to Google Drive…");
   await getToken("consent");
   await syncWithGoogle();
   $("connectGoogle").textContent="Sync now";
   $("disconnectGoogle").classList.remove("hidden");
 }catch(err){console.error(err);setSyncStatus("Google connection failed: "+friendlyGoogleError(err),"error");
 }finally{syncInProgress=false;$("connectGoogle").disabled=false}
}
async function disconnectGoogle(){
 if(googleToken&&window.google?.accounts?.oauth2){
   try{await new Promise(resolve=>google.accounts.oauth2.revoke(googleToken,()=>resolve()));}catch{}
 }
 googleToken=null;$("connectGoogle").textContent="Connect Google Drive";$("disconnectGoogle").classList.add("hidden");setSyncStatus("Google disconnected. Your local data remains on this device.");
}
function friendlyGoogleError(err){
 const s=String(err?.message||err);
 if(s.includes("access_denied"))return "access was denied. Please try again and allow access.";
 if(s.includes("popup"))return "the Google sign-in window was blocked. Allow pop-ups and try again.";
 return s;
}
async function googleFetch(url,options={}){
 if(!googleToken)await getToken("");
 let response=await fetch(url,{...options,headers:{Authorization:`Bearer ${googleToken}`,...(options.headers||{})}});
 if(response.status===401){await getToken("");response=await fetch(url,{...options,headers:{Authorization:`Bearer ${googleToken}`,...(options.headers||{})}})}
 if(!response.ok){let body="";try{body=await response.text()}catch{};throw new Error(`Google API ${response.status}: ${body.slice(0,300)}`)}
 return response.status===204?null:response.json();
}
async function findOrCreateSpreadsheet(){
 if(spreadsheetId)return spreadsheetId;
 const q=encodeURIComponent(`name='${SHEET_NAME.replaceAll("'","\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
 const found=await googleFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&pageSize=10&fields=files(id,name,modifiedTime)`);
 if(found.files?.length){spreadsheetId=found.files[0].id;localStorage.setItem("spend_analyser_sheet_id",spreadsheetId);return spreadsheetId}
 const created=await googleFetch("https://sheets.googleapis.com/v4/spreadsheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({properties:{title:SHEET_NAME},sheets:[{properties:{title:"Expenses"}},{properties:{title:"Settings"}}]})});
 spreadsheetId=created.spreadsheetId;localStorage.setItem("spend_analyser_sheet_id",spreadsheetId);return spreadsheetId;
}
async function getSheetValues(sheet,range){
 const id=encodeURIComponent(spreadsheetId), r=encodeURIComponent(`${sheet}!${range}`);
 const data=await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${r}`);
 return data.values||[];
}
async function writeSheet(sheet,range,values){
 const id=encodeURIComponent(spreadsheetId), r=encodeURIComponent(`${sheet}!${range}`);
 await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${r}?valueInputOption=RAW`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({range:`${sheet}!${range}`,majorDimension:"ROWS",values})});
}
async function clearSheet(sheet,range){
 const id=encodeURIComponent(spreadsheetId), r=encodeURIComponent(`${sheet}!${range}`);
 await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${r}:clear`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
}
async function ensureSheetHeaders(){
 const meta=await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`);
 const sheets=meta.sheets||[];
 const titles=sheets.map(s=>s.properties?.title);
 const requests=[];
 if(!titles.includes("Expenses"))requests.push({addSheet:{properties:{title:"Expenses"}}});
 if(!titles.includes("Settings"))requests.push({addSheet:{properties:{title:"Settings"}}});
 if(requests.length)await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requests})});
 const expenseRows=await getSheetValues("Expenses","A1:H1");
 if(!expenseRows.length)await writeSheet("Expenses","A1:H1",[EXPENSE_HEADERS]);
 const settingRows=await getSheetValues("Settings","A1:B1");
 if(!settingRows.length)await writeSheet("Settings","A1:B1",[SETTINGS_HEADERS]);
}
function cloudRowsToExpenses(rows){
 return (rows||[]).slice(1).filter(r=>r[0]).map(r=>localExpense({id:r[0],date:r[1],amount:Number(r[2]||0),category:r[3]||"Other",note:r[4]||"",paymentMethod:r[5]||"Other",createdAt:r[6]||r[1],updatedAt:r[7]||r[1]}));
}
function expenseToRow(e){return [e.id,e.date,e.amount,e.category,e.note||"",e.paymentMethod||"Other",e.createdAt||e.date,e.updatedAt||e.date]}
function mergeExpenses(local,cloud){
 const map=new Map();[...cloud,...local].forEach(raw=>{const e=localExpense(raw), old=map.get(e.id);if(!old||new Date(e.updatedAt)>=new Date(old.updatedAt))map.set(e.id,e)});return [...map.values()].sort((a,b)=>new Date(a.date)-new Date(b.date));
}
async function syncWithGoogle(){
 if(!googleToken)return;
 syncInProgress=true;setSyncStatus("Syncing expenses…");
 try{
   await findOrCreateSpreadsheet();await ensureSheetHeaders();
   const [cloudExpenseRows,cloudSettings]=await Promise.all([getSheetValues("Expenses","A1:H"),getSheetValues("Settings","A1:B")]);
   const cloud=cloudRowsToExpenses(cloudExpenseRows);
   if(!cloud.length&&expenses.length){
     // First connection on a device with existing local data: upload it.
   }else if(cloud.length){expenses=mergeExpenses(expenses,cloud)}
   const budgetRow=(cloudSettings||[]).find(r=>r[0]==="monthlyBudget");
   if(budgetRow&&budgetRow[1]!==undefined)budget=Number(budgetRow[1])||0;
   save();
   await writeSheet("Expenses","A1:H",[EXPENSE_HEADERS,...expenses.map(expenseToRow)]);
   await clearSheet("Expenses",`A${expenses.length+2}:H`);
   await writeSheet("Settings","A1:B2",[SETTINGS_HEADERS,["monthlyBudget",String(budget||0)]]);
   await clearSheet("Settings",`A${3}:B`);
   setSyncStatus(`Synced to Google Drive · ${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`,"success");
   render();
 }catch(err){console.error(err);setSyncStatus("Sync failed: "+friendlyGoogleError(err),"error");throw err}
 finally{syncInProgress=false}
}
async function syncAfterLocalChange(){
 save();render();
 if(googleToken){try{await syncWithGoogle()}catch{}}
}

function setup(){
 $("payment").innerHTML=PAYMENTS.map(x=>`<option>${x}</option>`).join("");
 document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>nav(b.dataset.nav));
 $("addHome").onclick=openModal;$("addExpenses").onclick=openModal;$("closeModal").onclick=()=>$("expenseModal").classList.add("hidden");
 $("search").oninput=renderExpenses;
 $("expenseForm").onsubmit=async e=>{e.preventDefault();const amount=Number($("amount").value);if(!amount)return;const created=nowISO();expenses.push({id:crypto.randomUUID(),amount,category:selectedCategory,note:$("note").value.trim(),paymentMethod:$("payment").value,date:new Date($("expenseDate").value).toISOString(),createdAt:created,updatedAt:created});$("expenseModal").classList.add("hidden");await syncAfterLocalChange()};
 $("saveBudget").onclick=async()=>{budget=Math.max(0,Number($("budgetInput").value)||0);await syncAfterLocalChange()};
 $("clearBtn").onclick=async()=>{if(confirm("Delete all expenses? This cannot be undone.")){expenses=[];await syncAfterLocalChange()}};
 $("exportBtn").onclick=exportCSV;
 $("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("spend_analyser_dark",document.body.classList.contains("dark"))};
 if(localStorage.getItem("spend_analyser_dark")==="true")document.body.classList.add("dark");
 render();
 if(!initGoogle()){
   // The Google Identity Services script is loaded synchronously in index.html.
   // A short retry also handles browsers/extensions that delay external scripts.
   let tries=0;
   const waitForGoogle=()=>{
     if(initGoogle())return;
     if(tries++<20)setTimeout(waitForGoogle,250);
   };
   setTimeout(waitForGoogle,250);
 }
}
function nav(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));window.scrollTo({top:0,behavior:"smooth"})}
function exportCSV(){
 const rows=[["Date","Amount","Category","Note","Payment Method"],...expenses.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>[dateText(e.date),e.amount,e.category,e.note,e.paymentMethod])];
 const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="spend-analyser-expenses.csv";a.click();URL.revokeObjectURL(a.href);
}

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
setup();
