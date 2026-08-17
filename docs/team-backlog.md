# FRA team backlog (issues)

_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._

## Active (developer approved — build queue)

_Developer-approved, open or in progress. Agents should implement these._

## #16 Update ETA

- **Type:** feature · high · open
- **Reporter:** Benjamin Rowe

**Original report:**

For all flights, we need the ability to enter an updated ETA.  If you are flying a regular schedule and experience a substantial delay, we need a way to record this info and new ETA.  

Similarly, if a flight will terminate in a village due to mechanical for example, we need a way to record completion time, location, and reason in the flight release and or takeflite or new solution.  Once again, a streamlined "one entry per user" focus to make gathering and recording this data easy and complete.

**Progress (changed, not resolved):**

Andy Smircich: - In flight Release Modal, an updated ETA input near the bottom where other post-departure comments live
- A flight terminated away from base checkbox can reveal inputs for the other requested data points
- Data persists on flight row

**Comments:**
- Andy Smircich: - In flight Release Modal, an updated ETA input near the bottom where other post-departure comments live
- A flight terminated away from base checkbox can reveal inputs for the other requested data points
- Data persists on flight row

## #15 Ground Services View

- **Type:** bug · high · open
- **Reporter:** Benjamin Rowe

**Original report:**

I think we can delete the Loads Available view and simply rename the Fuel Request page "Ground Services" view.  Loads Available are already displayed on the main Flight Status board view, as well as on the Fuel Request view.  

Also, please enhance the Fuel Request/Ground Services view for optimal use on a phone.  Tail numbers should be large.  FILL TO lbs. and ADD gal. numbers should be large, clear and easy to read.  

Add a fuel truck name selector (ask Adam for Fuel truck names at bases with more than one truck) and then provide a space to enter a meter start/stop entry, which after entered will automatically calculate the actual uplifted amount for pilot review, plus will eventually help us migrate away from a paper/pencil fuel log.

**Progress (changed, not resolved):**

Andy Smircich: - Loads Available - A little renaming is fine, but for now I want to keep it available and separate form fueling, it is the home of the C212 andC408 load sheets online, not sure if we will get any more interest in that, but I'd like to keep it up just in case.
- We need a mobile pass on the fuel view. Details as described by reporter
- Start with AVGAS Truck,  Truck 1, and Truck 2 for both OME and OTZ, only Truck 1 in UNK.  We can change that if we need to  as we go
- Meter stop and Meter Stop entry, we had something like this before, create this before the mobile pass wo it gets included. Persist on flight row.
- Stated goal is building towards a fuel log replacement

**Comments:**
- Benjamin Rowe: On the Fuel Request middle section, I think a clean, complete display would be to show, for example:
FOB: 600lbs                (from previous block in)
Fill To: 1200lbs          (from pilot entered Flight Report START Fuel)
ADD: 90gal                 (calculated from 1200-600 = 600/6.7)

Currently the FOB or the word "Add" are not displayed, so ti could lead to confusion.  The above would clarify it.
- Andy Smircich: - Loads Available - A little renaming is fine, but for now I want to keep it available and separate form fueling, it is the home of the C212 andC408 load sheets online, not sure if we will get any more interest in that, but I'd like to keep it up just in case.
- We need a mobile pass on the fuel view. Details as described by reporter
- Start with AVGAS Truck,  Truck 1, and Truck 2 for both OME and OTZ, only Truck 1 in UNK.  We can change that if we need to  as we go
- Meter stop and Meter Stop entry, we had something like this before, create this before the mobile pass wo it gets included. Persist on flight row.
- Stated goal is building towards a fuel log replacement

## #10 Move ROT into FRAT app

- **Type:** feature · low · in_progress
- **Reporter:** Andy Smircich

**Original report:**

Lets begin the process of moving a separate app, ~/ROT into ~/fraBering.  Both apps use node 12.22.12 and AngularJS so hopefully refactoring will be minimized.  ROT uses firebase login, lets have it use the existing auth from fraBering instead.  Accessing the views will be through the Management dropdown navbar item list.

**Progress (changed, not resolved):**

Andy Smircich: ROT uses a pilot selector in its navbar (possibly other items too) lets not add those to fraBering navbar, but add the necessary selector to the top of the views that need them and wire them in to the controllers.  They will use firebase storage still where it is currently, local pdf storage for the uploaded documents same as now, and new postgres tables/sequelize modeles in metars database when necessary.  We can export ROT postgres records too it once set up.

**Comments:**
- Andy Smircich: ROT uses a pilot selector in its navbar (possibly other items too) lets not add those to fraBering navbar, but add the necessary selector to the top of the views that need them and wire them in to the controllers.  They will use firebase storage still where it is currently, local pdf storage for the uploaded documents same as now, and new postgres tables/sequelize modeles in metars database when necessary.  We can export ROT postgres records too it once set up.

## Ready for review (shipped — reporter verify, do not build)

_Waiting for reporter sign-off in the app._

## #14 Helicopter fuel request

- **Type:** feature · high · ready_for_review
- **Reporter:** Benjamin Rowe
- **Status:** ready for review

**Original report:**

Please import the helicopter fuel requests from Flight Report to the Fuel page and put in chronological order. When the flight has a departure location of Nome (Nome, PAOM, OME) the request should land on the Nome page and same logic for the OTZ and UNK pages.  If the departure location is elsewhere, no electronic fuel requests is needed in Flight Release, but the amount will show in Flight Report for pilot planning.

**Comments:**
- Andy Smircich: - Fixed wing flights enter the system through interval activity in TodaysFlights api
- Helicopter flights enter through the pilot starting a PFR in flight report, which is noted by the firebase observer
- Combine the two streams in the fuel view, make it clear which flights are helicopters to the fueler reading the view, and stack in order of estimated departure time
- Fuel request for either fixed or helicopter originates in firebase, the firebase for fixed wing is grabbed during the interval, it that helps simplify build the algorithm
- Andy Smircich: Shipped for review — helicopter PFR fuel requests merged into the Fuel view with fixed-wing flights.

**Fuel page**
- Fixed-wing and helicopter fuel requests are combined into one list, sorted by estimated departure time.
- Helicopter rows are labeled **HELICOPTER** and show aircraft type; fixed-wing layout unchanged.
- Load section remains fixed-wing only.

**Hub routing**
- **OME / OTZ / UNK** fuel views: helicopter rows appear when departure matches that hub (aliases included, e.g. PAOM/Nome, PAOT/Kotzebue, PAUN/Unalakleet, and common spelling variants).
- **HEL** fuel view: all helicopter fuel requests for the day (no departure filter).
- Departures elsewhere: no row on hub fuel pages (pilot planning still in Flight Report as before).

**Data / fueled checkbox**
- Helicopters come from Firebase (pilot-started PFR in Flight Report); fixed-wing from today’s flights + existing Firebase interval.
- Fueled checkbox for helicopters writes back to Firebase `release` (same as Flight Report behavior).

**Please verify**
1. OME fuel page: Nome-departing heli PFR appears in time order with fixed-wing flights.
2. OTZ and UNK pages: same for Kotzebue and Unalakleet departures.
3. HEL fuel page: all helis for the day visible.
4. Heli with non-hub departure: not on OME/OTZ/UNK pages.
5. Fueled checkbox on a heli row updates and persists.
6. Sort order matches departure time across fixed-wing and heli rows.
- Benjamin Rowe: Thank you for adding this.  I see a couple helicopter flights in there as NOT READY.  May be an issue with Flight Report fuel or user input.

## #13 standby flights

- **Type:** feature · high · ready_for_review
- **Reporter:** Benjamin Rowe
- **Status:** ready for review

**Original report:**

Flights with long standby time such as BRG703 8/14/26 need a method to record more detail.  
1.  In the flight info section, it is a charter, but it should say "Standby Charter" or similar.  
2.  In the amendments after release, dispatchers should note the arrival time and departure times.  For example on this flight, we need to have the UNK arrival time recorded somewhere, and the UNK departure time recorded somewhere, if we are going to keep the flight plan open on a round-robin, standby charter.

**Comments:**
- Andy Smircich: - How to identify a standby charter: Number of flight legs times 30 minutes per leg is reasonable standby time. If the ETA for the flight is more than calculated flight time (from the routing and estimated aircraft speed for type)  for the route added to this reasonable standby time, it is a standby charter.
- Internal flag that turns true when this condition is met
- Flight Info section reflects type of flight in accordance with the flag
- Notice to dispatchers help them annotate arrival and departure times for standby charters in the amendments area
- Andy Smircich: Shipped for review — standby charter detection, intermediate time fields, and dispatcher nag.

**Standby charter detection**
Charter flights are flagged as Standby Charter when either:
- Scheduled block time exceeds estimated route time + (flight legs × 30 min), using aircraft-type cruise speed for route estimate, OR
- The route has more than 5 flight legs (e.g. OME-WMO-GLV-ELI-KKA-SKK-OME).

**Flight release UI**
- Flight Info shows **Standby Charter** instead of Charter when flagged.
- After dispatch or OC release, the amendments area shows arrival/departure time fields (HH:MM, local) for each intermediate stop.
- Times are saved on the flight in `miscObject.standbyLegTimes` via the existing flight save/PATCH.

**Dispatcher nag (admin / superadmin only)**
- On today’s status board, if a standby charter is released, has an actual departure logged, and an intermediate arrival or departure is still blank 30+ minutes after the estimated time (plan times adjusted for actual vs planned first departure), a warning modal appears.
- **Open Flight Release** opens the flight to enter times; **Dismiss** hides that specific nag for the browser session.

**Please verify**
1. BRG703-style round-robin (e.g. Nome → UNK → Nome): shows Standby Charter, intermediate fields appear after release, times save and reload.
2. Long multi-leg charter (6+ legs): flags as Standby Charter even if block time is normal.
3. Short charter that does not meet either rule: still shows Charter only; no intermediate fields.
4. As admin/superadmin on a live standby flight past an overdue intermediate time: nag appears; Open Flight Release works; Dismiss does not re-nag that stop this session.
5. Non-admin users do not see the nag.
- Benjamin Rowe: I entered UNK arrival and departure times on BRG703/14th, UI seems to work good. Suggest moving the field down into the Amendments After Release section, since that is what it is.  

Since the flight was already completed, I could not test this:  If a UNK departure time is entered while the flight plan is still open (Enroute), will that update the final ETA?

**Attachments:**
- ![screenshot-1786747288808.png](team-backlog/attachments/issue-13-att-10-screenshot-1786747288808.png)

## Needs clarification (radar — do not build)

_Waiting on reporter answers in comments._

_None._

## Out of scope for agents

- **Done** / **closed** — not listed here.
- Items without **Developer approved** — triage in `/issues` first.
