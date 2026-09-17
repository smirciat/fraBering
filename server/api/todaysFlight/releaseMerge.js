'use strict';

/**
 * Flight Release modal saves the full flight document. Concurrent signers can
 * POST stale nulls and wipe an earlier signature (#41). Preserve DB release
 * fields when the incoming body would clear them; allow admin Remove Release.
 */

export function releaseFieldSet(val) {
  return val != null && String(val).trim() !== '';
}

function releasePlain(entity) {
  if (!entity) return {};
  if (typeof entity.get === 'function') {
    return entity.get({plain: true});
  }
  return entity;
}

export function isIntentionalReleaseClear(existing, incoming) {
  const had = releaseFieldSet(existing.pilotAgree) ||
    releaseFieldSet(existing.dispatchRelease) ||
    releaseFieldSet(existing.ocRelease);
  if (!had) return false;
  if (releaseFieldSet(incoming.pilotAgree) ||
      releaseFieldSet(incoming.dispatchRelease) ||
      releaseFieldSet(incoming.ocRelease)) {
    return false;
  }
  return !incoming.releaseTimestamp &&
    !incoming.ocReleaseTimestamp &&
    !incoming.dispatchReleaseTimestamp;
}

export function mergeFlightReleaseFields(existingEntity, incoming) {
  const existing = releasePlain(existingEntity);
  const merged = Object.assign({}, incoming);
  if (isIntentionalReleaseClear(existing, incoming)) {
    return merged;
  }
  const pairs = [
    ['pilotAgree', 'releaseTimestamp'],
    ['dispatchRelease', 'dispatchReleaseTimestamp'],
    ['ocRelease', 'ocReleaseTimestamp']
  ];
  pairs.forEach(function(pair) {
    const nameKey = pair[0];
    const tsKey = pair[1];
    if (releaseFieldSet(existing[nameKey]) && !releaseFieldSet(incoming[nameKey])) {
      merged[nameKey] = existing[nameKey];
      if (existing[tsKey] && !incoming[tsKey]) {
        merged[tsKey] = existing[tsKey];
      }
    }
  });
  return merged;
}
