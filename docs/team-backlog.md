# FRA team backlog (issues)

_Generated from fraBering `/api/issues`. Regenerate: `node scripts/export-team-backlog/index.js`._

## Active (developer approved — build queue)

_Developer-approved, open or in progress. Agents should implement these._

## #7 Blue Airports

- **Type:** bug · high · open
- **Reporter:** Benjamin Rowe

**Original report:**

Blue airports - no official weather.  Flights are always released with no weather recorded.  As a pilot I would expect to look in the body of my Flight Release to find the information I need.  If I click on a blue airport, there is no AWOS official weather, no WebCam OK, no agent weather estimation.  Are we collecting an agent weather report on the phone prior to departure like used to be the case?  If so, where is that recorded?  If it's still on paper, can we get that recorded in the Flight Release instead?  I know there is an entry field for the weather but it seems to remain blank.  Maybe we need an update to that entry format?  Additonally maybe a CAVOK button?  I've added that definition to the GOM to mean weather better than 5000'/5sm.

**Progress (changed, not resolved):**

Andy Smircich: Blue airports are most often checked as webcam vfr which does not record an observation.  When Asos is available over phone but not internet, dispatchers have been filing the form in with official reported weather.  Haven't seen agent reports, but I assume its same form just unofficial, which leads to the orange border. OC input needed if we need to change any of this flow.

**Latest screenshot:**

![screenshot-1785101213802.png](team-backlog/attachments/issue-7-att-7-screenshot-1785101213802.png)

**Comments:**
- Benjamin Rowe: For example, I like the single click on an airport in the left column to edit a runway report.  Seems like it could be on that same screen, as a dispatcher is probably going to collect an Agent weather observation at the same time as an Agent runway report.  So this form could simply have a weather section as well, with possible checkboxes for type (Webcam, Agent Obs, PIREP, AWOS va phone) and for conditions (>500/2, >1000/3, >5000/5 (CAVOK), CLEAR) and spot to enter regular details.  New reports could be entered anytime and would stack like PIREP's.  Weather reports would expire after some time, maybe 6hrs, so you can see a trend but not too much clutter.
- Andy Smircich: The rule in code is if an airport is blue, it requires OC to release, not dispatch..  This encourages dispatchers to provide some sort of observation before their sign off.  Not sure if this block is simply broken, or if it is not keeping the manual observation in the permament release record properly.  One other possibility is it was "green" when dispatch signed it but turned "blue" before pilot signed.  We need to paoosibly block pilot from blue or purple unless OC has already signed. I will investigate,
Done when:
1. Airports cannot be signed off by dispatchers when red, orange, blue, or purple.  A permament storage of color at release time is accurately kept.
- Andy Smircich: Blue airports are most often checked as webcam vfr which does not record an observation.  When Asos is available over phone but not internet, dispatchers have been filing the form in with official reported weather.  Haven't seen agent reports, but I assume its same form just unofficial, which leads to the orange border. OC input needed if we need to change any of this flow.

**Attachments:**
- ![screenshot-1785101213802.png](team-backlog/attachments/issue-7-att-7-screenshot-1785101213802.png)

## Ready for review (shipped — reporter verify, do not build)

_Waiting for reporter sign-off in the app._

## #6 Crew ID check

- **Type:** feature · medium · ready_for_review
- **Reporter:** Benjamin Rowe
- **Status:** ready for review

**Original report:**

Can the crew id's line up vertically in same placeholder instead of moving left/right depending on length of person's name?  

Remove ID Checked line from CREW section.  Instead, modify the Dispatch/OC signoff statement to read "I certify that the requirements of GOM 05.29 Flight Release have been met and crew ID's checked."

**Comments:**
- Andy Smircich: I understand there is now more information on checking crew IDs on the  flight release Modal.  A few changes are needed to align with Ben's expectation.  The Crew ID line above the pilot names is now a header, so the input to its right can be removed. The modeal that had been assigned to that input should be applied to the new input or inputs to the right of the pilot names just below.  The employee number detail included should be spaced over as done in table columns to keep them aligned.  The phrase "CHECKED" in the input whould display whenever pilotAgree results in truthy, and blank if falsy.
Done when:
1.  The flight release Modal appears as described
2.  This section is neat and readable and does not contain any inaccuracies or broken formatting

**Attachments:**
- ![screenshot-1785100805859.png](team-backlog/attachments/issue-6-att-6-screenshot-1785100805859.png)

## Needs clarification (radar — do not build)

_Waiting on reporter answers in comments._

_None._

## Out of scope for agents

- **Done** / **closed** — not listed here.
- Items without **Developer approved** — triage in `/issues` first.
