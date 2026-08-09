# FRA team backlog (issues)

_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._

## Active (developer approved — build queue)

_Developer-approved, open or in progress. Agents should implement these._

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

## #8 Smircich ❤️

- **Type:** feature · high · ready_for_review
- **Reporter:** MATTHEW FRECKLETON
- **Status:** ready for review

**Original report:**

Would like to make an intuitive way when we deselect FIKI box an automatic message appears “planned flight altitude below Icing forecast.”   🤓

**Comments:**
- Andy Smircich: - When icing shows up in the forecast, dispatch or OC selects FIKI box for the flight requiring a closer look
- Much of the year we avoid the entire area of forecast icing by staying below the freezing level, but we have to enter a comment when removing FIKI checkbox
- A few common snippets to paste in might be helpful, Matt's suggestion is a good one, another would be "Recent PIREP indicates no icing"
- Andy Smircich: In the flight release modal, unchecking FIKI now:

Auto-fills the remark with "Planned flight altitude below icing forecast." (if empty)
Shows that message as a blue hint
Offers two quick-insert buttons: Below icing forecast and Recent PIREP — no icing
The FIKI view on /status does the same auto-fill when unchecking (and on bulk Clear All).

## #9 Seasonal Airports

- **Type:** feature · medium · ready_for_review
- **Reporter:** Benjamin Rowe
- **Status:** ready for review

**Original report:**

Is it possible to seasonally add airports such as Navigator (NAV) to the sidebar list, where runway data and pireps can be updated like system airports?  It could be added now if possible and removed in November or as directed by the DO.

**Comments:**
- Andy Smircich: - Lets start with Navigator and we can add to it if we need to
- airports in the side list of status view are identified in AirportRequirements by their base
- a tag like "OMESeasonal" could cause an airport like Navigator to display there with the possibility of adding NOTAMS and PIREPS like the other airports, lets say May thru September to start
- Further enhancements to this starting point are welcome
- Andy Smircich: #9 Seasonal airports (Navigator)
Airports with baseGroup: 'OMESeasonal' appear in the Nome status sidebar May–September only
Navigator included in airport sort order
Hazard-report airport picker includes OMESeasonal under Nome

## Needs clarification (radar — do not build)

_Waiting on reporter answers in comments._

_None._

## Out of scope for agents

- **Done** / **closed** — not listed here.
- Items without **Developer approved** — triage in `/issues` first.
