'use strict';

import {mergeFlightReleaseFields, isIntentionalReleaseClear} from './releaseMerge';

describe('mergeFlightReleaseFields', function() {
  it('keeps an existing dispatch signature when a stale save omits it', function() {
    const existing = {
      pilotAgree: null,
      dispatchRelease: 'Pat Dispatcher',
      dispatchReleaseTimestamp: new Date('2026-09-16T12:00:00Z'),
      ocRelease: null,
      releaseTimestamp: null,
      ocReleaseTimestamp: null
    };
    const incoming = {
      pilotAgree: 'Capt Smith',
      releaseTimestamp: new Date('2026-09-16T12:05:00Z'),
      dispatchRelease: null,
      dispatchReleaseTimestamp: null,
      ocRelease: null,
      ocReleaseTimestamp: null
    };
    const merged = mergeFlightReleaseFields(existing, incoming);
    expect(merged.pilotAgree).to.equal('Capt Smith');
    expect(merged.dispatchRelease).to.equal('Pat Dispatcher');
    expect(merged.dispatchReleaseTimestamp).to.eql(existing.dispatchReleaseTimestamp);
  });

  it('allows admin Remove Release to clear all signatures', function() {
    const existing = {
      pilotAgree: 'Capt Smith',
      dispatchRelease: 'Pat Dispatcher',
      ocRelease: 'OC Boss',
      releaseTimestamp: new Date(),
      dispatchReleaseTimestamp: new Date(),
      ocReleaseTimestamp: new Date()
    };
    const incoming = {
      pilotAgree: null,
      dispatchRelease: null,
      ocRelease: null,
      releaseTimestamp: null,
      dispatchReleaseTimestamp: null,
      ocReleaseTimestamp: null
    };
    expect(isIntentionalReleaseClear(existing, incoming)).to.equal(true);
    const merged = mergeFlightReleaseFields(existing, incoming);
    expect(merged.pilotAgree).to.equal(null);
    expect(merged.dispatchRelease).to.equal(null);
    expect(merged.ocRelease).to.equal(null);
  });
});
