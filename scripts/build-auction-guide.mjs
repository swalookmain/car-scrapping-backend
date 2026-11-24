/**
 * Builds the customer "Auction to Dismantling" guide from ONE source (the data below):
 *   - docs/AUCTION_FLOW.md                                             (markdown copy)
 *   - ../car-scrapping-frontend/public/guides/Auction-Flow-Guide.pdf   (downloaded from Account Settings)
 *
 * Run from car-scrapping-backend after changing the content or the app flow:
 *   node scripts/build-auction-guide.mjs
 *
 * Uses the Puppeteer already installed for authorization letters. No network needed.
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
  'How to take a vehicle from auction win to parts sale, one clear step at a time.';

const goldenRules = [
  '**Work in order.** The app shows your **Next step** for every auction. Finish it and the following step opens.',
  '**Locked is not broken.** A locked step always shows the reason (for example "Needs full payment"). Complete the step before it.',
  '**A vehicle can enter the yard only when its lot is Deal Done, fully paid, and the gate pass is uploaded.**',
];

const stages = [
  {
    title: 'Create the auction',
    where: 'Auctions → Auctions → the + (Add New) button',
    goal: 'Record the auction, its lots and the vehicles in each lot.',
    steps: [
      '**Auction details:** auctioner, auction number, buyer reference number, auction date, start and end time, inspection dates and vehicle location. Click **Next**.',
      '**Lots:** add every lot you are bidding on (lot name, lot number, pre-EMD amount, description and number of vehicles).',
      '**Vehicles & photos:** enter each vehicle (type, make, model, variant, vehicle number, colour, chassis last 5, year) and add photos. Save.',
    ],
    done: 'The auction appears in the Auctions list with the Next step **Update lot status**.',
  },
  {
    title: 'Update the lot status',
    where: 'Auctions list → click the **Next step** chip, or ⋮ → **Manage lot steps**',
    goal: 'Tell the system what happened to each lot after bidding.',
    steps: [
      'For each lot choose the **Outcome status**: **Pending** (waiting), **STA** (subject to approval), **Deal Done** (you won it), **Rejected** or **Left**.',
      'For **Deal Done** enter the **Total amount**, **Pre-EMD amount**, **Closing date & time** and **Payment due date**. The balance to pay is calculated for you.',
      'Click **Save changes**.',
    ],
    done: 'The lot is **Deal Done**. Rejected and Left lots stop here and need no further steps.',
    tips: [
      'Only Pending and STA lots can still be edited. After you save Deal Done, Rejected or Left, the lot is read-only.',
    ],
  },
  {
    title: 'Record the payment',
    where: 'Manage lot steps → **Payment** (or the Next step chip **Record payment**)',
    goal: 'Pay the full amount for each Deal Done lot.',
    steps: [
      'Open the lot and click **Add payment**. Enter the amount, transaction number, bank and remark.',
      'If a penalty applies, click **Add penalty**.',
      'Watch the summary: **Total due**, **Penalty**, **Paid** and **Left to pay**.',
      'When nothing is left to pay, record whether the **acceptance letter** has been received (letter number and received date).',
    ],
    done: 'Payment status shows **Paid** (Left to pay is 0).',
    tips: ['Payment status moves Not paid → Partially paid → Paid as you add payments.'],
  },
  {
    title: 'Add delivery details',
    where: 'Manage lot steps → **Delivery**',
    goal: 'Record how and until when the vehicles can be lifted.',
    steps: [
      'Enter the **Delivery order number**.',
      'Enter the **Last date of lifting**.',
      'Set **Final approval for lifting** to Yes once you have it, then save.',
      'On this screen you can also create the **authorization letter** once every Deal Done lot is paid and has final approval and a last lifting date.',
    ],
    done: 'Delivery order, last lifting date and final approval are saved.',
    tips: ['Delivery is available only after the lot is fully paid.'],
  },
  {
    title: 'Upload the gate pass',
    where: 'Manage lot steps → **Gate pass**',
    goal: 'Keep the gate pass on file. It is what lets the vehicle into your yard.',
    steps: [
      'Enter the **Date of gate pass**.',
      'Upload the gate pass as an image or PDF (within the size limit shown on screen).',
      'Click **Save gate pass**. A **View gate pass** link confirms it is stored.',
    ],
    done: 'The lot shows **Park in yard** as ready, with a green **Go to Yard** button.',
    tips: ['The gate pass is available only after the lot is fully paid.'],
  },
  {
    title: 'RCM details (only if applicable)',
    where: 'Manage lot steps → **RCM detail**',
    goal: 'Record the reverse-charge (RCM) GST challan if it applies to your purchase.',
    steps: ['Enter the **Challan number**, **Transaction date** and **Amount**, then save.'],
    done: 'This step is optional. It never blocks parking in the yard.',
  },
  {
    title: 'Park the vehicles in the yard',
    where: 'Yard Management → the + (Add New) button → **Add auction vehicles to yard**',
    goal: 'Bring the won vehicles into your yard records.',
    steps: [
      'Choose the **Auction** and the **Confirmed lot**. Lots that are not ready are greyed out with the reason.',
      'All vehicles of the lot are ticked. Untick any you are not parking now.',
      'Choose the **Zone** (required). Add a **Slot** and **Notes** if you wish.',
      'Click **Park selected**.',
    ],
    done: 'Each vehicle shows the status **Parked** in Yard Management.',
    tips: [
      'If a lot is locked here, go back to Auctions → Manage lot steps and finish payment and the gate pass.',
      'A zone must exist first. Your admin sets up zones in Yard Management.',
    ],
  },
  {
    title: 'Start dismantling',
    where: 'Yard Management → open the vehicle (eye icon) → **Start dismantling**',
    goal: 'Mark the vehicle as being taken apart so you can record its parts.',
    steps: [
      'Open the parked vehicle and click **Start dismantling**. Its status becomes **Dismantling**.',
      'You can also start it from the inventory form when you pick the vehicle.',
    ],
    done: 'The vehicle status is **Dismantling**.',
  },
  {
    title: 'Add parts to inventory',
    where: 'Inventory → Parts Inventory → the + (Add New) button',
    goal: 'Record every part recovered from the vehicle.',
    steps: [
      'Choose the yard vehicle. It must be in Dismantling.',
      'Save the vehicle weight (KG) if asked.',
      'Pick the parts from the checklist, fill in their details and click **Create**.',
    ],
    done: 'Parts appear in Parts Inventory. The vehicle is marked **Dismantled** and you can add more parts later.',
    tips: ['If you see "Start dismantling to add parts", go back to the previous step.'],
  },
  {
    title: 'Track the COD',
    where: 'COD Tracking → Add record',
    goal: 'Record the Certificate of Deposit (COD) for the vehicle.',
    steps: [
      'Choose the vehicle and switch on **COD Generated**.',
      'Enter the **COD Inward Number** and **COD Issue Date** (both are required).',
      'Add the **COD Document** and save.',
    ],
    done: 'The vehicle shows COD as generated.',
    tips: ['Parts of a vehicle can be sold only after its COD is generated.'],
  },
  {
    title: 'Sell the parts',
    where: 'Sales → Buyers, then Sales → Sales Invoices',
    goal: 'Invoice your buyer and reduce stock.',
    steps: [
      'Add the buyer under **Buyers** if they are new.',
      'Under **Sales Invoices** create an invoice with the parts being sold. It is saved as a draft.',
      'Review and **Confirm** the invoice. Stock is deducted automatically.',
    ],
    done: 'The invoice is confirmed and inventory is reduced.',
    tips: [
      'Confirmation is blocked if the vehicle has no COD generated.',
      'Cancelling a confirmed invoice puts the stock back.',
    ],
  },
];

const troubleshooting = [
  ['Lot must be marked Deal Done first', 'Open Manage lot steps and save the lot as Deal Done.'],
  ['Needs full payment / Lot must be fully paid before parking in yard', 'Add payments until **Left to pay** is 0.'],
  ['Upload the gate pass before parking in yard', 'Open the Gate pass step, add the date and upload the file.'],
  ['Available after payment is complete', 'Finish the payment step. Delivery and Gate pass unlock afterwards.'],
  ['Start dismantling to add parts', 'Open the vehicle in Yard Management and click **Start dismantling**.'],
  ['COD not generated for vehicle', 'Open COD Tracking and mark COD generated with the inward number and issue date.'],
];

const glossary = [
  ['STA', 'Subject to approval. The bid is not final yet.'],
  ['Deal Done', 'You won the lot. Payment and the next steps now apply.'],
  ['Pre-EMD', 'Earnest money deposited before the auction. It reduces the balance you pay.'],
  ['Gate pass', 'The document that lets the vehicle leave the auction site.'],
  ['RCM', 'Reverse charge mechanism, a GST payment made through a challan.'],
  ['COD', 'Certificate of Deposit for the vehicle.'],
  ['Parked', 'The vehicle is in the yard and ready to be dismantled.'],
  ['Dismantling / Dismantled', 'Parts are being or have been recovered from the vehicle.'],
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

/* ---------- markdown ---------- */
function buildMarkdown() {
  const lines = [];
  lines.push(`# ${TITLE}`, '', `_${SUBTITLE}_`, '', `Last updated: ${today}`, '');
  lines.push('## The journey at a glance', '');
  lines.push(
    stages.map((s, i) => `${i + 1}. ${s.title}`).join('\n'),
    '',
  );
  lines.push('## Three rules to remember', '');
  goldenRules.forEach((r) => lines.push(`- ${r}`));
  lines.push('');
  stages.forEach((s, i) => {
    lines.push(`## Step ${i + 1}. ${s.title}`, '');
    lines.push(`**Where:** ${s.where}`, '', `**Goal:** ${s.goal}`, '');
    s.steps.forEach((t, n) => lines.push(`${n + 1}. ${t}`));
    lines.push('', `**You can move on when:** ${s.done}`, '');
    (s.tips || []).forEach((t) => lines.push(`> Tip: ${t}`));
    if (s.tips?.length) lines.push('');
  });
  lines.push('## If something is locked or blocked', '');
  lines.push('| Message | What to do |', '| --- | --- |');
  troubleshooting.forEach(([m, f]) => lines.push(`| ${m} | ${f} |`));
  lines.push('', '## Words used in the app', '');
  lines.push('| Term | Meaning |', '| --- | --- |');
  glossary.forEach(([t, d]) => lines.push(`| ${t} | ${d} |`));
  lines.push('');
  return lines.join('\n');
}

/* ---------- html (for PDF) ---------- */
function buildHtml(logoDataUrl) {
  const glance = stages
    .map(
      (s, i) =>
        `<div class="pill"><span class="num">${i + 1}</span><span>${esc(s.title)}</span></div>`,
    )
    .join('<div class="arrow">›</div>');

  const stageHtml = stages
    .map(
      (s, i) => `
    <section class="stage">
      <div class="stage-head"><span class="num big">${i + 1}</span><h2>${esc(s.title)}</h2></div>
      <div class="meta"><span class="tag">Where</span> ${inline(s.where)}</div>
      <div class="meta"><span class="tag goal">Goal</span> ${inline(s.goal)}</div>
      <ol>${s.steps.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>
      <div class="done">✓ ${inline(s.done)}</div>
      ${(s.tips || []).map((t) => `<div class="tip">Tip: ${inline(t)}</div>`).join('')}
    </section>`,
    )
    .join('');

  const rows = (list) =>
    list.map(([a, b]) => `<tr><td>${inline(a)}</td><td>${inline(b)}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1f2933; font-size: 11pt; line-height: 1.5; margin: 0; }
  header.cover { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1565c0; padding-bottom: 12px; margin-bottom: 18px; }
  header.cover img { height: 46px; }
  header.cover h1 { margin: 0; font-size: 22pt; color: #0d47a1; }
  header.cover p { margin: 2px 0 0; color: #52606d; font-size: 10.5pt; }
  .updated { color: #7b8794; font-size: 9pt; margin: -8px 0 14px; }
  h2 { font-size: 14pt; margin: 0; color: #0d47a1; }
  h3 { font-size: 13pt; color: #0d47a1; margin: 22px 0 8px; }
  .glance { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
  .pill { display: flex; align-items: center; gap: 6px; background: #e3f2fd; border-radius: 16px; padding: 4px 10px 4px 4px; font-size: 9.5pt; font-weight: 600; color: #0d47a1; }
  .arrow { color: #90a4ae; font-weight: 700; }
  .num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #1565c0; color: #fff; font-size: 9pt; font-weight: 700; }
  .num.big { width: 30px; height: 30px; font-size: 12pt; flex: none; }
  .rules { background: #fff8e1; border-left: 4px solid #f9a825; padding: 8px 14px 8px 32px; margin: 0; border-radius: 6px; }
  .rules li { margin: 4px 0; }
  .stage { border: 1px solid #d9e2ec; border-radius: 10px; padding: 12px 16px; margin: 14px 0; page-break-inside: avoid; }
  .stage-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .meta { margin: 3px 0; font-size: 10.5pt; }
  .tag { display: inline-block; background: #1565c0; color: #fff; border-radius: 4px; padding: 0 6px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; margin-right: 4px; }
  .tag.goal { background: #455a64; }
  ol { margin: 8px 0 8px 20px; padding: 0; }
  li { margin: 3px 0; }
  .done { background: #e8f5e9; color: #1b5e20; border-radius: 6px; padding: 5px 10px; margin-top: 6px; font-size: 10.5pt; }
  .tip { background: #f5f7fa; color: #52606d; border-radius: 6px; padding: 4px 10px; margin-top: 5px; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d9e2ec; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #0d47a1; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
  </style></head><body>
  <header class="cover">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo">` : ''}
    <div><h1>${esc(TITLE)}</h1><p>${esc(SUBTITLE)}</p></div>
  </header>
  <div class="updated">Last updated: ${esc(today)}</div>
  <h3>The journey at a glance</h3>
  <div class="glance">${glance}</div>
  <h3>Three rules to remember</h3>
  <ul class="rules">${goldenRules.map((r) => `<li>${inline(r)}</li>`).join('')}</ul>
  ${stageHtml}
  <h3>If something is locked or blocked</h3>
  <table><tr><th style="width:38%">Message</th><th>What to do</th></tr>${rows(troubleshooting)}</table>
  <h3>Words used in the app</h3>
  <table><tr><th style="width:24%">Term</th><th>Meaning</th></tr>${rows(glossary)}</table>
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
} finally {
  await browser.close();
}
