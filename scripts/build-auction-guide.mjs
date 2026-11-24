/**
 * Builds the customer "Auction to Dismantling" guide from ONE source (the data below):
 *   - docs/AUCTION_FLOW.md                                             (markdown copy)
 *   - ../car-scrapping-frontend/public/guides/Auction-Flow-Guide.pdf   (downloaded from Account Settings)
 *
 * Run from car-scrapping-backend after changing the content or the app flow:
 *   node scripts/build-auction-guide.mjs
 *
 * Uses the Puppeteer already installed for authorization letters. No network needed.
 * Writing style: short sentences, everyday words, one action per line.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(backendRoot, '..', 'car-scrapping-frontend');
const mdOut = path.join(backendRoot, 'docs', 'AUCTION_FLOW.md');
const pdfOut = path.join(frontendRoot, 'public', 'guides', 'Auction-Flow-Guide.pdf');
const logoPath = path.join(frontendRoot, 'public', 'logo.png');

const TITLE = 'Auction to Dismantling Guide';
const SUBTITLE =
  'A simple, step-by-step guide. From winning an auction to selling the parts.';

const readFirst = [
  '**You do not need training.** The app always shows the next thing to do.',
  '**Every lot has its own steps.** Lot 1 can be paid while Lot 2 is still waiting. One lot never blocks another.',
  '**A grey step with a lock is not broken.** It is waiting for the step before it. It tells you why.',
  '**A vehicle can enter your yard only when its lot is Deal Done, fully paid, and the gate pass is uploaded.**',
];

const phases = [
  { name: 'A. Win the auction', steps: [1, 2] },
  { name: 'B. Pay and collect', steps: [3, 4, 5, 6] },
  { name: 'C. Yard and dismantling', steps: [7, 8, 9] },
  { name: 'D. Papers and sales', steps: [10, 11] },
];

const howItWorks = [
  'Open **Auctions** from the left menu.',
  'Look at the **Next step** column. It tells you what to do for each auction. Click it.',
  'A window opens. Your **lots are on the left**. The **steps of the selected lot are on the right**.',
  'The step marked **Next** is already open. Fill it in and click the save button.',
  'The window moves to the following step by itself.',
  'When a lot is finished, click **Next lot that needs work** at the bottom.',
];

const stateLegend = [
  ['Done', 'You finished this step. You can still open it to look or change it.'],
  ['Next', 'Do this one now. It is already open for you.'],
  ['Available', 'You can do this step any time.'],
  ['Locked', 'Not yet. The step before it is not finished. The reason is written below it.'],
  ['Not needed', 'The lot was Rejected or Left, so nothing more is needed.'],
];

const whichScreen = [
  ['I won or lost a lot', 'Auctions → click **Next step** → step 1 (Update lot status)'],
  ['I paid money for a lot', 'Auctions → click **Next step** → Record payment'],
  ['I received the delivery order', 'Auctions → click **Next step** → Delivery details'],
  ['I received the gate pass', 'Auctions → click **Next step** → Gate pass'],
  ['The vehicles arrived at my yard', 'Yard Management → the **+** button → Add auction vehicles to yard'],
  ['I started taking a vehicle apart', 'Yard Management → open the vehicle → **Start dismantling**'],
  ['I recovered parts', 'Inventory → Parts Inventory → the **+** button'],
  ['I got the COD', 'COD Tracking → add a record'],
  ['I sold parts', 'Sales → Sales Invoices'],
];

const stages = [
  {
    title: 'Create the auction',
    where: 'Auctions → the **+** button (Add New)',
    goal: 'Save the auction, its lots and its vehicles in the app.',
    steps: [
      '**Auction details:** auctioner, auction number, buyer reference number, dates, times and where the vehicles are. Click **Next**.',
      '**Lots:** add each lot you are bidding on. Give it a name and number, the pre-EMD amount and how many vehicles it has.',
      '**Vehicles & photos:** for each vehicle, enter the type, make, model, vehicle number, colour, chassis last 5 and year. Add photos. Save.',
    ],
    done: 'The auction shows in the Auctions list. Its Next step says **Update lot status**.',
  },
  {
    title: 'Say what happened to each lot',
    where: 'Auctions → click **Next step** → step 1, **Update lot status**',
    goal: 'Tell the app if you won, lost or are still waiting.',
    steps: [
      'Pick the **Outcome status**: **Pending** (waiting), **STA** (waiting for approval), **Deal Done** (you won), **Rejected** or **Left**.',
      'If you chose **Deal Done**, fill in the **Total amount**, **Pre-EMD amount**, **Closing date & time** and **Payment due date**. The balance to pay is worked out for you.',
      'Click **Save and continue**.',
    ],
    done: 'The lot says **Deal Done**. Rejected and Left lots are finished here. Nothing more is needed for them.',
    tips: [
      'Pending and STA can still be changed. Once you save Deal Done, Rejected or Left, it cannot be changed.',
    ],
  },
  {
    title: 'Pay for the lot',
    where: 'Same window → step 2, **Record payment**',
    goal: 'Record every payment until nothing is left to pay.',
    steps: [
      'Click **Add payment**. Enter the amount, transaction number, bank and a short remark. Save.',
      'If there is a penalty, click **Add penalty**.',
      'Watch the boxes: **Total due**, **Penalty**, **Paid**, **Left to pay**.',
      'When **Left to pay** is 0, note if the **acceptance letter** was received (letter number and date).',
    ],
    done: 'The lot is **Paid** (Left to pay is 0). Delivery and Gate pass unlock.',
    tips: ['You can pay in parts. The status goes Not paid → Partially paid → Paid.'],
  },
  {
    title: 'Add delivery details',
    where: 'Same window → step 3, **Delivery details**',
    goal: 'Write down how and until when the vehicles can be taken.',
    steps: [
      'Enter the **Delivery order number**.',
      'Enter the **Last date of lifting**.',
      'Choose **Final approval for lifting: Yes** when you have it. Click **Save delivery**.',
      'On this step you can also create the **authorization letter**. It is ready when every Deal Done lot is paid and has final approval and a last lifting date.',
    ],
    done: 'The delivery order, last lifting date and approval are saved.',
    tips: ['This step opens only after the lot is fully paid.'],
  },
  {
    title: 'Upload the gate pass',
    where: 'Same window → step 4, **Gate pass**',
    goal: 'Keep the gate pass in the app. It lets the vehicles into your yard.',
    steps: [
      'Enter the **Date of gate pass**.',
      'Upload the gate pass as a photo or PDF.',
      'Click **Save gate pass**. A **View gate pass** link shows it is saved.',
    ],
    done: 'A green box says the lot is **ready to park in the yard**, with a **Go to Yard** button.',
    tips: ['This step opens only after the lot is fully paid.'],
  },
  {
    title: 'RCM details (only if they apply to you)',
    where: 'Same window → step 5, **RCM detail**',
    goal: 'Record the reverse charge (RCM) GST challan, if you have one.',
    steps: ['Enter the **Challan number**, **Transaction date** and **Amount**. Save.'],
    done: 'This step is optional. It never stops you from parking in the yard. Skip it if it does not apply.',
  },
  {
    title: 'Park the vehicles in the yard',
    where: 'Yard Management → the **+** button → **Add auction vehicles to yard**',
    goal: 'Bring the vehicles into your yard records.',
    steps: [
      'Choose the **Auction** and the **Confirmed lot**. A lot that is not ready is grey and says why.',
      'All vehicles of the lot are ticked. Untick any you are not parking now.',
      'Choose the **Zone** (required). Add a **Slot** and **Notes** if you like.',
      'Click **Park selected**.',
    ],
    done: 'Each vehicle shows the status **Parked**.',
    tips: [
      'A lot is grey? Go back to Auctions, click its Next step, and finish payment and the gate pass.',
      'Zones must exist first. Ask your admin to create them in Yard Management.',
    ],
  },
  {
    title: 'Start dismantling',
    where: 'Yard Management → open the vehicle (eye icon) → **Start dismantling**',
    goal: 'Tell the app you are taking the vehicle apart.',
    steps: [
      'Open the parked vehicle.',
      'Click **Start dismantling**. The status becomes **Dismantling**.',
    ],
    done: 'The vehicle status is **Dismantling**.',
    tips: ['You can also press Start dismantling from the inventory form after you pick the vehicle.'],
  },
  {
    title: 'Add the parts you recovered',
    where: 'Inventory → Parts Inventory → the **+** button',
    goal: 'Record every part that came out of the vehicle.',
    steps: [
      'Choose the yard vehicle. It must be in Dismantling.',
      'Save the vehicle weight in KG if the form asks for it.',
      'Pick the parts from the list, fill in their details and click **Create**.',
    ],
    done: 'The parts show in Parts Inventory. The vehicle becomes **Dismantled**. You can add more parts later.',
    tips: ['If you see "Start dismantling to add parts", go back to the previous step.'],
  },
  {
    title: 'Record the COD',
    where: 'COD Tracking → add a record',
    goal: 'Keep the Certificate of Deposit (COD) of the vehicle.',
    steps: [
      'Choose the vehicle and switch on **COD Generated**.',
      'Enter the **COD Inward Number** and the **COD Issue Date**. Both are needed.',
      'Add the **COD Document**. Save.',
    ],
    done: 'The vehicle shows COD as generated.',
    tips: ['You can sell the parts of a vehicle only after its COD is recorded.'],
  },
  {
    title: 'Sell the parts',
    where: 'Sales → Buyers, then Sales → Sales Invoices',
    goal: 'Make the invoice for your buyer. Your stock goes down.',
    steps: [
      'Add the buyer in **Buyers** if the buyer is new.',
      'In **Sales Invoices**, create an invoice and add the parts you are selling. It is saved as a draft.',
      'Check it and click **Confirm**. Your stock goes down automatically.',
    ],
    done: 'The invoice is confirmed and the stock is reduced.',
    tips: [
      'Confirm is blocked if the vehicle has no COD recorded.',
      'If you cancel a confirmed invoice, the stock comes back.',
    ],
  },
];

const faq = [
  ['Can I fix a mistake?', 'Yes. Open the step again. Done steps say **View / edit**. The only exception is the lot status after you save Deal Done, Rejected or Left.'],
  ['Do all my lots have to be paid before I use the yard?', 'No. Each lot is separate. A paid lot with a gate pass can be parked while the others are still waiting.'],
  ['What if I lost or left a lot?', 'Mark it Rejected or Left in step 1. Nothing more is needed for that lot.'],
  ['Do I have to do the RCM step?', 'Only if RCM applies to you. It never blocks the yard.'],
  ['Where do I create the authorization letter?', 'In the Delivery details step. It is ready when every Deal Done lot is paid and has final approval and a last lifting date.'],
];

const troubleshooting = [
  ['Lot must be marked Deal Done first', 'Open the lot, go to step 1 and save it as Deal Done.'],
  ['Needs full payment / Lot must be fully paid before parking in yard', 'Add payments until **Left to pay** is 0.'],
  ['Upload the gate pass before parking in yard', 'Open the Gate pass step, add the date and upload the file.'],
  ['Available after payment is complete', 'Finish the payment step. Delivery and Gate pass open after that.'],
  ['Start dismantling to add parts', 'Open the vehicle in Yard Management and click **Start dismantling**.'],
  ['COD not generated for vehicle', 'Open COD Tracking and record the COD with its inward number and issue date.'],
];

const glossary = [
  ['STA', 'Subject to approval. Your bid is not final yet.'],
  ['Deal Done', 'You won the lot.'],
  ['Pre-EMD', 'Money you paid before the auction. It is taken off what you owe.'],
  ['Gate pass', 'The paper that lets the vehicle leave the auction site.'],
  ['RCM', 'Reverse charge. A GST payment made with a challan.'],
  ['COD', 'Certificate of Deposit for the vehicle.'],
  ['Parked', 'The vehicle is in your yard.'],
  ['Dismantling / Dismantled', 'Parts are being taken out / have been taken out of the vehicle.'],
];

const checklistColumns = [
  'Deal Done',
  'Paid',
  'Delivery',
  'Gate pass',
  'In yard',
  'Dismantling',
  'Parts',
  'COD',
  'Sold',
];

/* ---------- helpers ---------- */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const today = new Date().toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const phaseOf = (n) => phases.find((p) => p.steps.includes(n));

/* ---------- markdown ---------- */
function buildMarkdown() {
  const lines = [];
  lines.push(`# ${TITLE}`, '', `_${SUBTITLE}_`, '', `Last updated: ${today}`, '');
  lines.push('## Read this first', '');
  readFirst.forEach((r) => lines.push(`- ${r}`));
  lines.push('', '## The journey in four parts', '');
  phases.forEach((p) =>
    lines.push(`- **${p.name}:** ${p.steps.map((n) => `${n}. ${stages[n - 1].title}`).join(' → ')}`),
  );
  lines.push('', '## How the app guides you, lot by lot', '');
  howItWorks.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  lines.push('', '| Label | Meaning |', '| --- | --- |');
  stateLegend.forEach(([a, b]) => lines.push(`| ${a} | ${b} |`));
  lines.push('', '## Which screen do I use?', '', '| I want to… | Go to |', '| --- | --- |');
  whichScreen.forEach(([a, b]) => lines.push(`| ${a} | ${b} |`));
  lines.push('');
  stages.forEach((s, i) => {
    const n = i + 1;
    if (phaseOf(n)?.steps[0] === n) lines.push(`# ${phaseOf(n).name}`, '');
    lines.push(`## Step ${n}. ${s.title}`, '');
    lines.push(`**Where:** ${s.where}`, '', `**Why:** ${s.goal}`, '', '**What to do:**', '');
    s.steps.forEach((t, k) => lines.push(`${k + 1}. ${t}`));
    lines.push('', `**Done when:** ${s.done}`, '');
    (s.tips || []).forEach((t) => lines.push(`> Tip: ${t}`));
    if (s.tips?.length) lines.push('');
  });
  lines.push('## Common questions', '', '| Question | Answer |', '| --- | --- |');
  faq.forEach(([q, a]) => lines.push(`| ${q} | ${a} |`));
  lines.push('', '## If something is locked or blocked', '', '| Message | What to do |', '| --- | --- |');
  troubleshooting.forEach(([m, f]) => lines.push(`| ${m} | ${f} |`));
  lines.push('', '## Words used in the app', '', '| Word | Meaning |', '| --- | --- |');
  glossary.forEach(([t, d]) => lines.push(`| ${t} | ${d} |`));
  lines.push('', '## Lot checklist (print and tick)', '');
  lines.push(`| Lot | ${checklistColumns.join(' | ')} |`);
  lines.push(`| --- | ${checklistColumns.map(() => '---').join(' | ')} |`);
  for (let i = 0; i < 3; i += 1) {
    lines.push(`| | ${checklistColumns.map(() => '[ ]').join(' | ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

/* ---------- html (for PDF) ---------- */
function buildHtml(logoDataUrl) {
  const rows = (list) =>
    list.map(([a, b]) => `<tr><td>${inline(a)}</td><td>${inline(b)}</td></tr>`).join('');

  const phaseCards = phases
    .map(
      (p, i) => `
    <div class="phase p${i}">
      <div class="phase-name">${esc(p.name)}</div>
      ${p.steps
        .map(
          (n) =>
            `<div class="phase-step"><span class="num">${n}</span><span>${esc(stages[n - 1].title)}</span></div>`,
        )
        .join('')}
    </div>`,
    )
    .join('');

  const stageHtml = stages
    .map((s, i) => {
      const n = i + 1;
      const phase = phaseOf(n);
      const phaseHead =
        phase.steps[0] === n
          ? `<h3 class="phase-title p${phases.indexOf(phase)}">${esc(phase.name)}</h3>`
          : '';
      return `${phaseHead}
    <section class="stage">
      <div class="stage-head"><span class="num big">${n}</span><h2>${esc(s.title)}</h2></div>
      <div class="meta"><span class="tag">Where</span> ${inline(s.where)}</div>
      <div class="meta"><span class="tag goal">Why</span> ${inline(s.goal)}</div>
      <div class="label">What to do</div>
      <ol>${s.steps.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>
      <div class="done">Done when: ${inline(s.done)}</div>
      ${(s.tips || []).map((t) => `<div class="tip">Tip: ${inline(t)}</div>`).join('')}
    </section>`;
    })
    .join('');

  const legend = stateLegend
    .map(
      ([a, b]) =>
        `<tr><td><span class="badge ${a.toLowerCase().replace(' ', '')}">${esc(a)}</span></td><td>${inline(b)}</td></tr>`,
    )
    .join('');

  const checklistRows = Array.from({ length: 8 })
    .map(
      () =>
        `<tr><td class="lotcell"></td>${checklistColumns.map(() => '<td class="box"><span></span></td>').join('')}</tr>`,
    )
    .join('');

  const mock = `
  <div class="mock">
    <div class="mock-title">Auction A-100 — lot steps</div>
    <div class="mock-body">
      <div class="mock-lots">
        <div class="mock-lots-h">LOTS IN THIS AUCTION</div>
        <div class="mock-lot sel"><b>Lot 1 — Trucks</b><small>Next: Record payment</small></div>
        <div class="mock-lot"><b>Lot 2 — Cars</b><small>Ready for yard</small></div>
      </div>
      <div class="mock-steps">
        <div class="mock-lot-h"><b>Lot 1 — Trucks</b><span class="badge done">Deal Done</span></div>
        <div class="mock-step"><span>1. Update lot status</span><span class="badge done">Done</span></div>
        <div class="mock-step open"><span>2. Record payment</span><span class="badge next">Next</span></div>
        <div class="mock-form">Add payment · Left to pay: 5,00,000</div>
        <div class="mock-step"><span>3. Delivery details <i>Needs full payment</i></span><span class="badge locked">Locked</span></div>
        <div class="mock-step"><span>4. Gate pass <i>Needs full payment</i></span><span class="badge locked">Locked</span></div>
        <div class="mock-step"><span>5. RCM detail (optional)</span><span class="badge available">Available</span></div>
        <div class="mock-step"><span>Park this lot in the yard</span><span class="badge locked">Locked</span></div>
      </div>
    </div>
    <div class="mock-foot"><span>Refresh</span><span>Next lot that needs work</span><span class="mock-close">Close</span></div>
  </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1f2933; font-size: 11.5pt; line-height: 1.55; margin: 0; }
  header.cover { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1565c0; padding-bottom: 12px; margin-bottom: 14px; }
  header.cover img { height: 46px; }
  header.cover h1 { margin: 0; font-size: 22pt; color: #0d47a1; }
  header.cover p { margin: 2px 0 0; color: #52606d; font-size: 11pt; }
  .updated { color: #7b8794; font-size: 9pt; margin: -6px 0 12px; }
  h2 { font-size: 14.5pt; margin: 0; color: #0d47a1; }
  h3 { font-size: 13.5pt; color: #0d47a1; margin: 22px 0 8px; }
  .phase-title { padding: 5px 12px; border-radius: 6px; color: #fff; margin: 22px 0 6px; page-break-after: avoid; }
  .p0 { --c: #1565c0; } .p1 { --c: #ef6c00; } .p2 { --c: #2e7d32; } .p3 { --c: #6a1b9a; }
  .phase-title { background: var(--c); }
  .phases { display: flex; gap: 8px; }
  .phase { flex: 1; border: 2px solid var(--c); border-radius: 10px; overflow: hidden; }
  .phase-name { background: var(--c); color: #fff; font-weight: 700; font-size: 10pt; padding: 5px 8px; }
  .phase-step { display: flex; align-items: center; gap: 6px; padding: 4px 8px; font-size: 9.5pt; }
  .num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #1565c0; color: #fff; font-size: 9pt; font-weight: 700; flex: none; }
  .num.big { width: 32px; height: 32px; font-size: 13pt; }
  .readfirst { background: #fff8e1; border-left: 5px solid #f9a825; padding: 10px 16px 10px 34px; margin: 0; border-radius: 6px; }
  .readfirst li { margin: 5px 0; }
  .guide-list li { margin: 4px 0; }
  .stage { border: 1px solid #d9e2ec; border-radius: 10px; padding: 12px 16px; margin: 10px 0; page-break-inside: avoid; }
  .stage-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .meta { margin: 3px 0; font-size: 11pt; }
  .label { font-weight: 700; margin-top: 8px; color: #334e68; }
  .tag { display: inline-block; background: #1565c0; color: #fff; border-radius: 4px; padding: 0 6px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; margin-right: 4px; }
  .tag.goal { background: #455a64; }
  ol { margin: 4px 0 8px 22px; padding: 0; }
  li { margin: 3px 0; }
  .done { background: #e8f5e9; color: #1b5e20; border-radius: 6px; padding: 6px 10px; margin-top: 6px; }
  .tip { background: #f5f7fa; color: #52606d; border-radius: 6px; padding: 5px 10px; margin-top: 5px; font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d9e2ec; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #0d47a1; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 1px 10px; border-radius: 10px; font-size: 9pt; font-weight: 700; white-space: nowrap; }
  .badge.done { background: #e8f5e9; color: #2e7d32; }
  .badge.next { background: #e3f2fd; color: #1565c0; }
  .badge.available { background: #fffde7; color: #8d6e00; }
  .badge.locked { background: #f5f5f5; color: #757575; }
  .badge.notneeded { background: #eceff1; color: #78909c; }
  .mock { border: 2px solid #90a4ae; border-radius: 12px; overflow: hidden; font-size: 9pt; margin: 8px 0; page-break-inside: avoid; }
  .mock-title { background: #eceff1; padding: 6px 12px; font-weight: 700; border-bottom: 1px solid #cfd8dc; }
  .mock-body { display: flex; gap: 10px; padding: 10px; }
  .mock-lots { width: 30%; }
  .mock-lots-h { font-size: 7.5pt; color: #7b8794; font-weight: 700; margin-bottom: 4px; }
  .mock-lot { border: 1px solid #cfd8dc; border-radius: 8px; padding: 5px 8px; margin-bottom: 5px; display: flex; flex-direction: column; }
  .mock-lot.sel { border-color: #1565c0; background: #e3f2fd; }
  .mock-lot small { color: #52606d; }
  .mock-steps { flex: 1; }
  .mock-lot-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 10pt; }
  .mock-step { border: 1px solid #cfd8dc; border-radius: 8px; padding: 4px 8px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
  .mock-step i { display: block; color: #757575; font-size: 8pt; font-style: normal; }
  .mock-step.open { border-color: #1565c0; background: #fafcff; }
  .mock-form { border: 1px dashed #1565c0; border-radius: 6px; padding: 8px; margin: 0 0 4px 12px; color: #1565c0; }
  .mock-foot { display: flex; justify-content: flex-end; gap: 14px; padding: 6px 12px; border-top: 1px solid #cfd8dc; background: #fafafa; }
  .mock-close { background: #1565c0; color: #fff; border-radius: 4px; padding: 0 10px; }
  .checklist { page-break-before: always; }
  .checklist table { font-size: 9pt; }
  .checklist th { text-align: center; padding: 6px 2px; font-size: 8.5pt; }
  .lotcell { width: 14%; height: 34px; }
  td.box { text-align: center; }
  td.box span { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #52606d; border-radius: 3px; }
  </style></head><body>
  <header class="cover">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo">` : ''}
    <div><h1>${esc(TITLE)}</h1><p>${esc(SUBTITLE)}</p></div>
  </header>
  <div class="updated">Last updated: ${esc(today)}</div>

  <h3>Read this first</h3>
  <ul class="readfirst">${readFirst.map((r) => `<li>${inline(r)}</li>`).join('')}</ul>

  <h3>The journey in four parts</h3>
  <div class="phases">${phaseCards}</div>

  <h3>How the app guides you, lot by lot</h3>
  <ol class="guide-list">${howItWorks.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>
  ${mock}
  <table><tr><th style="width:18%">Label</th><th>Meaning</th></tr>${legend}</table>

  <h3>Which screen do I use?</h3>
  <table><tr><th style="width:36%">I want to…</th><th>Go to</th></tr>${rows(whichScreen)}</table>

  ${stageHtml}

  <h3>Common questions</h3>
  <table><tr><th style="width:36%">Question</th><th>Answer</th></tr>${rows(faq)}</table>
  <h3>If something is locked or blocked</h3>
  <table><tr><th style="width:38%">Message</th><th>What to do</th></tr>${rows(troubleshooting)}</table>
  <h3>Words used in the app</h3>
  <table><tr><th style="width:24%">Word</th><th>Meaning</th></tr>${rows(glossary)}</table>

  <section class="checklist">
    <h3>Lot checklist</h3>
    <p>Print this page. Write the lot name on the left and tick each box when the step is done.</p>
    <table><tr><th>Lot</th>${checklistColumns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${checklistRows}</table>
  </section>
  </body></html>`;
}

/* ---------- run ---------- */
fs.mkdirSync(path.dirname(mdOut), { recursive: true });
fs.writeFileSync(mdOut, buildMarkdown());
console.log('Wrote', path.relative(process.cwd(), mdOut));

const logoDataUrl = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

fs.mkdirSync(path.dirname(pdfOut), { recursive: true });
// Prefer an explicit path, then the Puppeteer-managed Chrome, then a locally installed Chrome.
const localChromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].filter(Boolean);
let executablePath;
try {
  executablePath = fs.existsSync(puppeteer.executablePath())
    ? puppeteer.executablePath()
    : undefined;
} catch {
  executablePath = undefined;
}
executablePath = executablePath || localChromeCandidates.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setContent(buildHtml(logoDataUrl), { waitUntil: 'load' });
  await page.pdf({
    path: pdfOut,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#7b8794;text-align:center;font-family:Arial">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
  });
  console.log('Wrote', path.relative(process.cwd(), pdfOut));
  if (process.env.GUIDE_PREVIEW_PNG) {
    await page.setViewport({ width: 794, height: 1123 });
    await page.screenshot({ path: process.env.GUIDE_PREVIEW_PNG, fullPage: true });
  }
} finally {
  await browser.close();
}
