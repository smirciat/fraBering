'use strict';

(function(){

class RotSicHoursComponent {
  constructor($http, $scope, RotPilotContext) {
    this.http = $http;
    this.scope = $scope;
    this.RotPilotContext = RotPilotContext;
    this.queryObj = {
      collection: 'flights',
      limit: 3000,
      parameter: 'coPilotEmployeeNumber',
      value: '',
      parameter2: 'pilotEmployeeNumber',
      value2: '',
      queryOr: true
    };
    this.aircraft = ['ALL', 'Caravan', 'Beech 1900', 'King Air', 'Courier', 'Casa', 'Huey', 'Robinson', 'Astar', 'MD500'];
    this.aircraftSelected = 'Courier';
    this.startDate = null;
    this.endDate = null;
    this.flights = [];
    this.fileURLs = [];
    this.loading = false;
    this.loadError = '';
  }

  $onInit() {
    this.RotPilotContext.loadPilots().then(() => {
      this.applyPilot(this.RotPilotContext.getChosenPilot());
      this.scope.$watch(
        () => this.RotPilotContext.getChosenPilot(),
        (newVal, oldVal) => {
          if (!newVal || newVal === oldVal) return;
          this.applyPilot(newVal);
        }
      );
    });
  }

  applyPilot(pilot) {
    if (!pilot) return;
    this.pilot = pilot;
    let employeeId = this.RotPilotContext.getEmployeeId();
    if (!employeeId) return;
    this.queryObj.value = employeeId;
    this.queryObj.value2 = employeeId;
    this.flights = [];
    this.init();
  }

  init() {
    if (!this.pilot) return;
    let today = new Date();
    this.startDate408 = this.pilot.C408Initial;
    if (!this.startDate408) {
      this.startDate408 = new Date();
      this.startDate408.setDate(today.getDate() + 1);
      this.startDate408 = this.startDate408.toLocaleDateString();
    }
    this.loading = true;
    this.loadError = '';
    this.http.post('/api/rot/firebaseQuery', this.queryObj).then(res => {
      this.allFlights = res.data;
      this.filterFlights();
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.loadError = 'Could not load flights (server timeout). Try again or narrow the date range.';
    });
  }

  filterFlights() {
    this.allFlights = this.allFlights || [];
    this.flights = this.allFlights.filter(f => {
      if (!f.acftNumber || f.acftNumber.substring(0, 1) !== 'N') return false;
      if (f.flightTime * 1 <= 0) return false;
      if (f.dateString && new Date(f.dateString) < new Date(2021, 3, 1)) return false;
      if (this.startDate && this.endDate) {
        if (new Date(f.dateString) < this.startDate || new Date(f.dateString) > this.endDate) return false;
      }
      if (this.aircraftSelected === 'ALL') return true;
      if (this.aircraftSelected === 'Courier') {
        return (f.acftType === 'Courier' || f.acftType === 'Sky Courier') &&
          (new Date(this.startDate408) <= new Date(f.dateString) ||
            (f.flightNumber && f.flightNumber.substring(0, 1) === '9'));
      }
      return f.acftType === this.aircraftSelected;
    });
    this.flights.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
    let cumMinutes = 0;
    this.flights.forEach(f => {
      cumMinutes += f.flightTime * 1;
      f.cumHours = (cumMinutes / 60).toFixed(1);
      f.sicTO = 0;
      f.sicLND = 0;
      f.picTO = 0;
      f.picLND = 0;
      (f.legArray || []).forEach(leg => {
        f.sicLND += (leg.sicDayLandings * 1 + leg.sicNightLandings * 1);
        f.sicTO += (leg.sicDayTO * 1 + leg.sicNightTO * 1);
        f.picLND += (leg.picDayLandings * 1 + leg.picNightLandings * 1);
        f.picTO += (leg.picDayTO * 1 + leg.picNightTO * 1);
      });
    });
  }

  onePage(flights, fields) {
    for (let i = 1; i < 21; i++) {
      if (flights[i - 1]) {
        fields['DATERow' + i] = [flights[i - 1].dateString];
        fields['FLTRow' + i] = [flights[i - 1].acftNumber];
        fields['RouteRow' + i] = [flights[i - 1].route.toString()];
        fields['TO  LDRow' + i] = [flights[i - 1].sicTO + ' / ' + flights[i - 1].sicLND];
        fields['PIC InitialsRow' + i] = [flights[i - 1].pilot];
        fields['HoursRow' + i] = [(flights[i - 1].flightTime / 60).toFixed(1)];
        fields['Cumulative HoursRow' + i] = [flights[i - 1].cumHours];
      }
    }
    return fields;
  }

  openPdf() {
    if (!this.pilot || typeof pdfform !== 'function') {
      alert('PDF form library not loaded or pilot not selected');
      return;
    }
    this.aircraftSelected = 'Courier';
    this.filterFlights();
    let rows = JSON.parse(JSON.stringify(this.flights));
    this.http({
      url: '/api/rot/files/pdfs?filename=' + encodeURIComponent('SIC_LOG.pdf'),
      method: 'GET',
      headers: {'Accept': 'application/pdf'},
      responseType: 'arraybuffer'
    }).then(response => {
      let page = 1;
      this.blobs = [];
      this.fileURLs = [];
      while (rows.length > 0) {
        let fields = {
          'Pilot Name': [this.pilot.name],
          'Certificate Number': [this.pilot.cert],
          'Page': [page],
          'of': [''],
          throughDate: [new Date().toLocaleDateString()]
        };
        page++;
        let temp = rows.splice(0, 20);
        fields = this.onePage(temp, fields);
        let filledPdf = pdfform().transform(response.data, fields);
        this.blobs[page - 2] = new Blob([filledPdf], {type: 'application/pdf'});
        this.fileURLs[page - 2] = URL.createObjectURL(this.blobs[page - 2]);
      }
    }).catch(() => {
      alert('Could not load SIC_LOG.pdf — copy to server/fileserver/rot/pdfs/ on prod');
    });
  }

  viewPage(page) {
    window.open(this.fileURLs[page], '_blank');
  }

  upDate(key, field) {
    let dateStringFormattedField = field + 'DateStringFormatted';
    let dateStringField = field + 'DateString';
    let dateField = field + 'Date';
    if (key === 'string') this[dateField] = new Date(this[dateStringFormattedField]);
    if (!this[dateField]) {
      this[dateStringField] = '';
      this[dateStringFormattedField] = '';
      this.filterFlights();
      return;
    }
    if (this.startDate > this.endDate && this.startDate && this.endDate) {
      let temp = this.endDate;
      this.endDate = this.startDate;
      this.startDate = temp;
      this.upDate('', 'start');
      this.upDate('', 'end');
      return;
    }
    this[dateStringField] = this[dateField].toLocaleDateString();
    this[dateStringFormattedField] = this[dateField].toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    this.filterFlights();
  }

  handle(event, field) {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.upDate('string', field);
    }
  }

  clearDates() {
    this.startDate = null;
    this.endDate = null;
    this.upDate('', 'start');
    this.upDate('', 'end');
  }
}

angular.module('workspaceApp')
  .component('rotSicHours', {
    templateUrl: 'app/rot/sicHours/sicHours.html',
    controller: RotSicHoursComponent,
    controllerAs: 'rotSicHours'
  });

})();
