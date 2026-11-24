# Auction to Dismantling Guide

_How to take a vehicle from auction win to parts sale, one clear step at a time._

Last updated: 24 November 2026

## The journey at a glance

1. Create the auction
2. Update the lot status
3. Record the payment
4. Add delivery details
5. Upload the gate pass
6. RCM details (only if applicable)
7. Park the vehicles in the yard
8. Start dismantling
9. Add parts to inventory
10. Track the COD
11. Sell the parts

## Three rules to remember

- **Work in order.** The app shows your **Next step** for every auction. Finish it and the following step opens.
- **Locked is not broken.** A locked step always shows the reason (for example "Needs full payment"). Complete the step before it.
- **A vehicle can enter the yard only when its lot is Deal Done, fully paid, and the gate pass is uploaded.**

## Step 1. Create the auction

**Where:** Auctions → Auctions → the + (Add New) button

**Goal:** Record the auction, its lots and the vehicles in each lot.

1. **Auction details:** auctioner, auction number, buyer reference number, auction date, start and end time, inspection dates and vehicle location. Click **Next**.
2. **Lots:** add every lot you are bidding on (lot name, lot number, pre-EMD amount, description and number of vehicles).
3. **Vehicles & photos:** enter each vehicle (type, make, model, variant, vehicle number, colour, chassis last 5, year) and add photos. Save.

**You can move on when:** The auction appears in the Auctions list with the Next step **Update lot status**.

## Step 2. Update the lot status

**Where:** Auctions list → click the **Next step** chip, or ⋮ → **Manage lot steps**

**Goal:** Tell the system what happened to each lot after bidding.

1. For each lot choose the **Outcome status**: **Pending** (waiting), **STA** (subject to approval), **Deal Done** (you won it), **Rejected** or **Left**.
2. For **Deal Done** enter the **Total amount**, **Pre-EMD amount**, **Closing date & time** and **Payment due date**. The balance to pay is calculated for you.
3. Click **Save changes**.

**You can move on when:** The lot is **Deal Done**. Rejected and Left lots stop here and need no further steps.

> Tip: Only Pending and STA lots can still be edited. After you save Deal Done, Rejected or Left, the lot is read-only.

## Step 3. Record the payment

**Where:** Manage lot steps → **Payment** (or the Next step chip **Record payment**)

**Goal:** Pay the full amount for each Deal Done lot.

1. Open the lot and click **Add payment**. Enter the amount, transaction number, bank and remark.
2. If a penalty applies, click **Add penalty**.
3. Watch the summary: **Total due**, **Penalty**, **Paid** and **Left to pay**.
4. When nothing is left to pay, record whether the **acceptance letter** has been received (letter number and received date).

**You can move on when:** Payment status shows **Paid** (Left to pay is 0).

> Tip: Payment status moves Not paid → Partially paid → Paid as you add payments.

## Step 4. Add delivery details

**Where:** Manage lot steps → **Delivery**

**Goal:** Record how and until when the vehicles can be lifted.

1. Enter the **Delivery order number**.
2. Enter the **Last date of lifting**.
3. Set **Final approval for lifting** to Yes once you have it, then save.
4. On this screen you can also create the **authorization letter** once every Deal Done lot is paid and has final approval and a last lifting date.

**You can move on when:** Delivery order, last lifting date and final approval are saved.

> Tip: Delivery is available only after the lot is fully paid.

## Step 5. Upload the gate pass

**Where:** Manage lot steps → **Gate pass**

**Goal:** Keep the gate pass on file. It is what lets the vehicle into your yard.

1. Enter the **Date of gate pass**.
2. Upload the gate pass as an image or PDF (within the size limit shown on screen).
3. Click **Save gate pass**. A **View gate pass** link confirms it is stored.

**You can move on when:** The lot shows **Park in yard** as ready, with a green **Go to Yard** button.

> Tip: The gate pass is available only after the lot is fully paid.

## Step 6. RCM details (only if applicable)

**Where:** Manage lot steps → **RCM detail**

**Goal:** Record the reverse-charge (RCM) GST challan if it applies to your purchase.

1. Enter the **Challan number**, **Transaction date** and **Amount**, then save.

**You can move on when:** This step is optional. It never blocks parking in the yard.

## Step 7. Park the vehicles in the yard

**Where:** Yard Management → the + (Add New) button → **Add auction vehicles to yard**

**Goal:** Bring the won vehicles into your yard records.

1. Choose the **Auction** and the **Confirmed lot**. Lots that are not ready are greyed out with the reason.
2. All vehicles of the lot are ticked. Untick any you are not parking now.
3. Choose the **Zone** (required). Add a **Slot** and **Notes** if you wish.
4. Click **Park selected**.

**You can move on when:** Each vehicle shows the status **Parked** in Yard Management.

> Tip: If a lot is locked here, go back to Auctions → Manage lot steps and finish payment and the gate pass.
> Tip: A zone must exist first. Your admin sets up zones in Yard Management.

## Step 8. Start dismantling

**Where:** Yard Management → open the vehicle (eye icon) → **Start dismantling**

**Goal:** Mark the vehicle as being taken apart so you can record its parts.

1. Open the parked vehicle and click **Start dismantling**. Its status becomes **Dismantling**.
2. You can also start it from the inventory form when you pick the vehicle.

**You can move on when:** The vehicle status is **Dismantling**.

## Step 9. Add parts to inventory

**Where:** Inventory → Parts Inventory → the + (Add New) button

**Goal:** Record every part recovered from the vehicle.

1. Choose the yard vehicle. It must be in Dismantling.
2. Save the vehicle weight (KG) if asked.
3. Pick the parts from the checklist, fill in their details and click **Create**.

**You can move on when:** Parts appear in Parts Inventory. The vehicle is marked **Dismantled** and you can add more parts later.

> Tip: If you see "Start dismantling to add parts", go back to the previous step.

## Step 10. Track the COD

**Where:** COD Tracking → Add record

**Goal:** Record the Certificate of Deposit (COD) for the vehicle.

1. Choose the vehicle and switch on **COD Generated**.
2. Enter the **COD Inward Number** and **COD Issue Date** (both are required).
3. Add the **COD Document** and save.

**You can move on when:** The vehicle shows COD as generated.

> Tip: Parts of a vehicle can be sold only after its COD is generated.

## Step 11. Sell the parts

**Where:** Sales → Buyers, then Sales → Sales Invoices

**Goal:** Invoice your buyer and reduce stock.

1. Add the buyer under **Buyers** if they are new.
2. Under **Sales Invoices** create an invoice with the parts being sold. It is saved as a draft.
3. Review and **Confirm** the invoice. Stock is deducted automatically.

**You can move on when:** The invoice is confirmed and inventory is reduced.

> Tip: Confirmation is blocked if the vehicle has no COD generated.
> Tip: Cancelling a confirmed invoice puts the stock back.

## If something is locked or blocked

| Message | What to do |
| --- | --- |
| Lot must be marked Deal Done first | Open Manage lot steps and save the lot as Deal Done. |
| Needs full payment / Lot must be fully paid before parking in yard | Add payments until **Left to pay** is 0. |
| Upload the gate pass before parking in yard | Open the Gate pass step, add the date and upload the file. |
| Available after payment is complete | Finish the payment step. Delivery and Gate pass unlock afterwards. |
| Start dismantling to add parts | Open the vehicle in Yard Management and click **Start dismantling**. |
| COD not generated for vehicle | Open COD Tracking and mark COD generated with the inward number and issue date. |

## Words used in the app

| Term | Meaning |
| --- | --- |
| STA | Subject to approval. The bid is not final yet. |
| Deal Done | You won the lot. Payment and the next steps now apply. |
| Pre-EMD | Earnest money deposited before the auction. It reduces the balance you pay. |
| Gate pass | The document that lets the vehicle leave the auction site. |
| RCM | Reverse charge mechanism, a GST payment made through a challan. |
| COD | Certificate of Deposit for the vehicle. |
| Parked | The vehicle is in the yard and ready to be dismantled. |
| Dismantling / Dismantled | Parts are being or have been recovered from the vehicle. |
