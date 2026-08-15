# FRA team backlog (issues)

_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._

## Active (developer approved — build queue)

_Developer-approved, open or in progress. Agents should implement these._

## #14 Helicopter fuel request

- **Type:** feature · high · open
- **Reporter:** Benjamin Rowe

**Original report:**

Please import the helicopter fuel requests from Flight Report to the Fuel page and put in chronological order. When the flight has a departure location of Nome (Nome, PAOM, OME) the request should land on the Nome page and same logic for the OTZ and UNK pages.  If the departure location is elsewhere, no electronic fuel requests is needed in Flight Release, but the amount will show in Flight Report for pilot planning.

**Progress (changed, not resolved):**

Andy Smircich: - Fixed wing flights enter the system through interval activity in TodaysFlights api
- Helicopter flights enter through the pilot starting a PFR in flight report, which is noted by the firebase observer
- Combine the two streams in the fuel view, make it clear which flights are helicopters to the fueler reading the view, and stack in order of estimated departure time
- Fuel request for either fixed or helicopter originates in firebase, the firebase for fixed wing is grabbed during the interval, it that helps simplify build the algorithm

**Comments:**
- Andy Smircich: - Fixed wing flights enter the system through interval activity in TodaysFlights api
- Helicopter flights enter through the pilot starting a PFR in flight report, which is noted by the firebase observer
- Combine the two streams in the fuel view, make it clear which flights are helicopters to the fueler reading the view, and stack in order of estimated departure time
- Fuel request for either fixed or helicopter originates in firebase, the firebase for fixed wing is grabbed during the interval, it that helps simplify build the algorithm

## #13 standby flights

- **Type:** feature · high · open
- **Reporter:** Benjamin Rowe

**Original report:**

Flights with long standby time such as BRG703 8/14/26 need a method to record more detail.  
1.  In the flight info section, it is a charter, but it should say "Standby Charter" or similar.  
2.  In the amendments after release, dispatchers should note the arrival time and departure times.  For example on this flight, we need to have the UNK arrival time recorded somewhere, and the UNK departure time recorded somewhere, if we are going to keep the flight plan open on a round-robin, standby charter.

**Progress (changed, not resolved):**

Andy Smircich: - How to identify a standby charter: Number of flight legs times 30 minutes per leg is reasonable standby time. If the ETA for the flight is more than calculated flight time (from the routing and estimated aircraft speed for type)  for the route added to this reasonable standby time, it is a standby charter.
- Internal flag that turns true when this condition is met
- Flight Info section reflects type of flight in accordance with the flag
- Notice to dispatchers help them annotate arrival and departure times for standby charters in the amendments area

**Latest screenshot:**

![screenshot-1786747288808.png](team-backlog/attachments/issue-13-att-10-screenshot-1786747288808.png)

**Comments:**
- Andy Smircich: - How to identify a standby charter: Number of flight legs times 30 minutes per leg is reasonable standby time. If the ETA for the flight is more than calculated flight time (from the routing and estimated aircraft speed for type)  for the route added to this reasonable standby time, it is a standby charter.
- Internal flag that turns true when this condition is met
- Flight Info section reflects type of flight in accordance with the flag
- Notice to dispatchers help them annotate arrival and departure times for standby charters in the amendments area

**Attachments:**
- ![screenshot-1786747288808.png](team-backlog/attachments/issue-13-att-10-screenshot-1786747288808.png)

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

_None._

## Needs clarification (radar — do not build)

_Waiting on reporter answers in comments._

_None._

## Out of scope for agents

- **Done** / **closed** — not listed here.
- Items without **Developer approved** — triage in `/issues` first.
