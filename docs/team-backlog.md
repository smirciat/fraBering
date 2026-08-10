# FRA team backlog (issues)

_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._

## Active (developer approved — build queue)

_Developer-approved, open or in progress. Agents should implement these._

## #11 Blue flight after release

- **Type:** bug · medium · open
- **Reporter:** Andy Smircich

**Original report:**

Both airports were green when signed, flight stayed blue 844 8/8/26

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
