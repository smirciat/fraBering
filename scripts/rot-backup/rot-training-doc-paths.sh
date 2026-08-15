# Shared path list for ROT training-document backup, restore, and migration.
# Source paths are relative to standalone ROT server root (~/ROT/server).
#
# Scope (critical training PDFs only):
#   - fileserver/attachments  — Pilot Eval PDFs (linked from RotEvaluations)
#   - records                 — per-pilot training record uploads
#   - pdfs                    — form templates (ROT.pdf, FlightTest.pdf, SIC_LOG.pdf, …)
#
# Not included: general fileserver browser files (misc docs, installers, course
# folders at ~/ROT/server/fileserver/*). Those live in other places; fraBering
# /rot/files is for new uploads only.

# shellcheck disable=SC2034
ROT_TRAINING_SOURCE_PATHS=(
  fileserver/attachments
  records
  pdfs
)

# Map ROT source rel path → fraBering rot/ subdir (for --layout frabering restore/migrate)
# shellcheck disable=SC2034
ROT_TRAINING_FRABERING_MAP=(
  "fileserver/attachments:attachments"
  "records:records"
  "pdfs:pdfs"
)
