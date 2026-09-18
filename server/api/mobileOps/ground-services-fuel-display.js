'use strict';

function twinTankFuelLimits(equipment) {
  if (!equipment) return null;
  let maxMain = equipment.maxMain;
  let maxAux = equipment.maxAux;
  if ((!maxMain || !maxAux) && equipment.name) {
    const fallback = { Casa: { maxMain: 1323, maxAux: 289 } };
    if (fallback[equipment.name]) {
      maxMain = fallback[equipment.name].maxMain;
      maxAux = fallback[equipment.name].maxAux;
    }
  }
  if (!maxMain || !maxAux) return null;
  return { maxMain: maxMain * 1, maxAux: maxAux * 1, galFactor: 6.7 };
}

function computeTwinTankAdd(fillTo, fob, maxMain, maxAux, galFactor) {
  fillTo = fillTo * 1;
  fob = fob * 1;
  maxMain = maxMain * 1;
  maxAux = maxAux * 1;
  galFactor = galFactor || 6.7;
  if (fillTo - fob < 0) return { error: 'DOUBLE CHECK FUEL REQUEST' };
  if (fillTo > maxMain * 2 + maxAux * 2) {
    return { error: 'Main + Aux request exceeds capacity' };
  }
  const fobPerSide = fob / 2;
  const mainsCurrentPerSide = Math.min(fobPerSide, maxMain);
  const auxCurrentPerSide = Math.min(Math.max(0, fobPerSide - maxMain), maxAux);
  const mainsTotalTarget = Math.min(fillTo, maxMain * 2);
  const auxTotalTarget = Math.min(Math.max(0, fillTo - maxMain * 2), maxAux * 2);
  const mainsTargetPerSide = mainsTotalTarget / 2;
  const auxTargetPerSide = auxTotalTarget / 2;
  const mainsAddPerSide = mainsTargetPerSide - mainsCurrentPerSide;
  const auxAddPerSide = auxTargetPerSide - auxCurrentPerSide;
  if (mainsAddPerSide < 0 || auxAddPerSide < 0) {
    return { error: 'Main + Aux request exceeds capacity' };
  }
  return {
    mainsAddGalPerSide: Math.round(mainsAddPerSide / galFactor),
    auxAddGalPerSide: Math.round(auxAddPerSide / galFactor),
  };
}

function formatTwinTankAddValue(addResult) {
  if (!addResult || addResult.error) return addResult;
  const parts = [];
  if (addResult.mainsAddGalPerSide > 0) {
    parts.push(`${addResult.mainsAddGalPerSide}gal/side MAINS`);
  }
  if (addResult.auxAddGalPerSide > 0) {
    parts.push(`${addResult.auxAddGalPerSide}gal/side AUX`);
  }
  if (!parts.length) parts.push('0 gal');
  return parts.join(' + ');
}

function computeFuelDisplay(flight) {
  if (flight.isHeli) {
    return { ready: false };
  }
  if (
    !flight.pfr ||
    !flight.pfr.legArray ||
    !flight.pfr.legArray[0] ||
    !flight.pfr.legArray[0].fuel ||
    flight.pfr.legArray[0].fuel < 100
  ) {
    return { ready: false };
  }
  const fillTo = Math.round(flight.pfr.legArray[0].fuel * 1);
  const fob = Math.round((flight.fuelPreviouslyOnboard || flight.autoOnboard || 0) * 1);
  const twinLimits = twinTankFuelLimits(flight.equipment);
  const rows = [];
  if (twinLimits) {
    const addResult = computeTwinTankAdd(
      fillTo,
      fob,
      twinLimits.maxMain,
      twinLimits.maxAux,
      twinLimits.galFactor
    );
    if (addResult.error) {
      return { ready: true, rows: [{ label: '', value: addResult.error, error: true }] };
    }
    rows.push({ label: 'FOB', value: `${fob} lbs`, hint: 'previous block in' });
    rows.push({
      label: 'Fill To',
      value: `${fillTo} lbs`,
      highlight: true,
      hint: 'Flight Report start fuel',
    });
    rows.push({
      label: 'ADD',
      value: formatTwinTankAddValue(addResult),
      highlight: true,
    });
  } else {
    rows.push({ label: 'FOB', value: `${fob} lbs`, hint: 'previous block in' });
    rows.push({
      label: 'Fill To',
      value: `${fillTo} lbs`,
      highlight: true,
      hint: 'Flight Report start fuel',
    });
    const addGal = Math.round((fillTo - fob) / 6.7);
    if (addGal < 0) {
      rows.push({ label: '', value: 'DOUBLE CHECK FUEL REQUEST', error: true });
    } else {
      rows.push({ label: 'ADD', value: `${addGal} gal`, highlight: true });
    }
  }
  return { ready: true, rows };
}

function computeLoadAvailable(flight) {
  if (flight.isHeli) return null;
  if (!flight.pfr || !flight.pfr.legArray || !flight.pfr.legArray[0]) return null;
  const leg = flight.pfr.legArray[0];
  const mgtow = leg.mgtow * 1;
  const owe = leg.operatingWeightEmpty * 1;
  const fuel = leg.fuel * 1;
  let taxiFuel = leg.taxiFuel * 1 || 0;
  let tks = 0;
  if (leg.tksGallons) {
    tks = leg.tksGallons;
    if (leg.tksGallons > 20.8) tks = 20.8;
    tks = tks * 9.2308;
  }
  return Math.round(mgtow - owe - fuel + taxiFuel - tks);
}

function displayFlightNum(flight) {
  if (!flight.flightNum) return flight.aircraft || '';
  if (flight.flightNum.length === 3 || flight.flightNum.length === 4) {
    return `BRG${flight.flightNum}`;
  }
  if (flight.pfr && flight.pfr.flightNumber) {
    return `BRG${flight.pfr.flightNumber}`;
  }
  return `ID# ${flight.flightNum}`;
}

function fuelTruckOptionsForBase(base) {
  const code = String(base || '').trim().toUpperCase();
  if (code === 'UNK') return ['Truck 1'];
  if (code === 'OME' || code === 'OTZ') {
    return ['AVGAS Truck', 'Truck 1', 'Truck 2'];
  }
  return [];
}

function updateFuelMeterGallons(flight) {
  const start = parseFloat(String(flight.startFuel || '').replace(/[^\d.]/g, ''));
  const stop = parseFloat(String(flight.stopFuel || '').replace(/[^\d.]/g, ''));
  if (!isNaN(start) && !isNaN(stop) && stop >= start) {
    flight.gallonsUplifted = String(Math.round((stop - start) * 10) / 10);
  } else if (!flight.startFuel && !flight.stopFuel) {
    flight.gallonsUplifted = null;
  }
}

module.exports = {
  computeFuelDisplay,
  computeLoadAvailable,
  displayFlightNum,
  fuelTruckOptionsForBase,
  updateFuelMeterGallons,
};
