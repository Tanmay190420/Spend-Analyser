const CATEGORIES=[
 ["Food","🍔"],["Groceries","🛒"],["Transport","🚕"],["Fuel","⛽"],["Shopping","🛍️"],
 ["Bills","📄"],["Rent","🏠"],["Entertainment","🎬"],["Health","💊"],["Travel","✈️"],
 ["Education","📚"],["Subscriptions","🔁"],["EMI / Loans","💳"],["Personal","👤"],["Other","•••"]
];
const PAYMENTS=["Cash","UPI","Credit Card","Debit Card","Bank Transfer","Other"];
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n||0);
const $=id=>document.getElementById(id);
let expenses=JSON.parse(localStorage.getItem("spend_analyser_expenses")||"[]");
let budget=Number(localStorage.getItem("spend_analyser_budget")||0);
let selectedCategory="Food";

function save(){localStorage.setItem("spend_analyser_expenses",JSON.stringify(expenses));localStorage.setItem("spend_analyser_budget",budget)}
function monthKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`}
function currentMonth(){return monthKey(new Date())}
function currentExpenses(){return expenses.filter(e=>monthKey(e.date)===currentMonth())}
function total(arr){return arr.reduce((s,e)=>s+Number(e.amount),0)}
function dateText(d){return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
function categoryIcon(c){return CATEGORIES.find(x=>x[0]===c)?.[1]||"•"}

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
 vals.forEach(x=>{const col=document.createElement("div");col.className="bar-col";col.innerHTML=`<div>${x.n?money(x.n).replace("₹","₹"):""}</div><div class="bar" style="height:${Math.max(3,x.n/max*130)}px"></div><div>${x.d.toLocaleDateString("en-IN",{weekday:"short"})}</div>`;box.appendChild(col)})
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
 $("categoryList").innerHTML=items.map((x,i)=>`<div class="cat-row"><span>${categoryIcon(x[0])} ${escapeHTML(x[0])}</span><b>${money(x[1])} · ${(x[1]/(mt||1)*100).toFixed(1)}%</b></div>`).join("");
 const insights=[];if(items[0])insights.push(`Your largest category is ${items[0][0]} at ${money(items[0][1])}.`);
 if(mt){const avg=mt/new Date().getDate();insights.push(`Your average spending per calendar day so far is ${money(avg)}.`)}
 if(prevTotal)insights.push(`Total spending is ${mt<=prevTotal?"lower":"higher"} than last month.`);
 $("insights").innerHTML=insights.map(x=>`<div class="insight">${x}</div>`).join("")||'<div class="muted">Add expenses to generate insights.</div>';
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function openModal(){
 $("expenseModal").classList.remove("hidden");$("amount").value="";$("note").value="";selectedCategory="Food";
 $("expenseDate").value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 renderCategories();$("amount").focus();
}
function renderCategories(){
 $("categoryGrid").innerHTML=CATEGORIES.map(x=>`<button type="button" class="cat ${selectedCategory===x[0]?"selected":""}" data-cat="${x[0]}">${x[1]} ${x[0]}</button>`).join("");
 document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories()})
}
function setup(){
 $("payment").innerHTML=PAYMENTS.map(x=>`<option>${x}</option>`).join("");
 document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>nav(b.dataset.nav));
 $("addHome").onclick=openModal;$("addExpenses").onclick=openModal;$("closeModal").onclick=()=>$("expenseModal").classList.add("hidden");
 $("search").oninput=renderExpenses;
 $("expenseForm").onsubmit=e=>{e.preventDefault();const amount=Number($("amount").value);if(!amount)return;expenses.push({id:crypto.randomUUID(),amount,category:selectedCategory,note:$("note").value.trim(),paymentMethod:$("payment").value,date:new Date($("expenseDate").value).toISOString()});save();$("expenseModal").classList.add("hidden");render()};
 $("saveBudget").onclick=()=>{budget=Math.max(0,Number($("budgetInput").value)||0);save();render()};
 $("clearBtn").onclick=()=>{if(confirm("Delete all expenses? This cannot be undone.")){expenses=[];save();render()}};
 $("exportBtn").onclick=exportCSV;
 $("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("spend_analyser_dark",document.body.classList.contains("dark"))};
 if(localStorage.getItem("spend_analyser_dark")==="true")document.body.classList.add("dark");
 render();
}
function nav(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.nav===id));window.scrollTo({top:0,behavior:"smooth"})}
function exportCSV(){
 const rows=[["Date","Amount","Category","Note","Payment Method"],...expenses.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(e=>[dateText(e.date),e.amount,e.category,e.note,e.paymentMethod])];
 const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="spend-analyser-expenses.csv";a.click();URL.revokeObjectURL(a.href);
}
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
setup();
