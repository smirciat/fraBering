'use strict';

(function(){

class RotPilotBoardComponent {
  constructor($http, $timeout, $scope, moment, Auth) {
    this.http = $http;
    this.timeout = $timeout;
    this.scope = $scope;
    this.moment = moment;
    this.Auth = Auth;
    this.data = [];
    this.today = new Date();
    this.shortMonths = [];
    for (let m = 1; m < 13; m++) {
      this.shortMonths.push(new Date(m + '/1/2024').toLocaleString('default', {month: 'short'}));
    }
    this.gridOptions = {
      rowHeight: 22,
      enableCellEdit: false,
      columnDefs: [
        {name: 'pilot', field: 'name', minWidth: 150},
        {name: 'd.O.H.', field: 'dateOfHireShort', width: 90},
        {name: 'emp', field: '_id', enableCellEdit: false, width: 70},
        {name: 'cert', field: 'cert', width: 80},
        {name: 'med', field: 'medicalExp', enableCellEdit: false, width: 90, cellClass: this.medicalCellClass},
        {name: 'oAS Card', field: 'oasShort', minWidth: 90},
        {name: 'passport', field: 'passportShort', width: 90},
        {name: 'russianVisa', field: 'rusShort', minWidth: 90},
        {name: 'basicIndoc', field: 'BasicIndocExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '293(a)1,4-8', field: 'BasicIndocExpShort', enableCellEdit: false, minWidth: 90, cellClass: this.cellClass},
        {name: 'hazmat', field: 'HazmatExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '208Ground', field: 'C208GroundExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '208TKS', field: 'C208TKSExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'kingAirGround', field: 'BE20GroundExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'b190Ground', field: 'B190GroundExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'casaGround', field: 'C212GroundExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '408Ground', field: 'C408GroundExpShort', minWidth: 90, cellClass: this.cellClass}
      ],
      enableGridMenu: true,
      enableSelectAll: true,
      exporterPdfDefaultStyle: {fontSize: 5},
      exporterPdfTableStyle: {margin: [10, 10, 10, 10]},
      exporterPdfTableHeaderStyle: {fontSize: 6, bold: true, italics: true, color: 'red'},
      exporterPdfHeader: {text: 'Pilot Board', style: 'headerStyle'},
      exporterPdfCustomFormatter: function(docDefinition) {
        docDefinition.styles.headerStyle = {fontSize: 15, bold: true};
        docDefinition.styles.footerStyle = {fontSize: 10, bold: true};
        return docDefinition;
      },
      exporterPdfOrientation: 'landscape',
      exporterPdfPageSize: 'LETTER',
      exporterPdfMaxGridWidth: 550,
      exporterCsvFilename: 'pilot-board.csv',
      exporterCsvLinkElement: angular.element(document.querySelectorAll('.custom-csv-link-location')),
      exporterExcelFilename: 'pilot-board.xlsx',
      exporterExcelSheetName: 'Sheet1',
      data: this.data
    };
    this.gridOptions2 = {
      rowHeight: 22,
      enableCellEdit: false,
      columnDefs: [
        {name: 'pilot', field: 'name', minWidth: 150},
        {name: 'd.O.H.', field: 'dateOfHireShort', width: 90},
        {name: 'emp', field: '_id', enableCellEdit: false, width: 70},
        {name: 'cert', field: 'cert', width: 80},
        {name: 'med', field: 'medicalExp', enableCellEdit: false, width: 90, cellClass: this.medicalCellClass},
        {name: '297', field: 'far297ExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'Autopilot', field: 'far297gExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '299', field: 'far299ExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '208', field: 'C208PICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'kingAir', field: 'BE20PICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'b190Pic', field: 'B190PICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'b190Sic', field: 'B190SICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'casaPic', field: 'C212PICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'casaSic', field: 'C212SICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '408Pic', field: 'C408PICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: '408Sic', field: 'C408SICExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'chkAmn', field: 'CheckAirmanObsExpShort', minWidth: 90, cellClass: this.cellClass},
        {name: 'fltInst', field: 'FlightInstructorObsExpShort', minWidth: 90, cellClass: this.cellClass}
      ],
      data: this.data
    };
    this.gridOptions.onRegisterApi = (gridApi) => {
      let scope = this.scope;
      gridApi.cellNav.on.navigate(scope, (newRowcol, oldRowcol) => {
        if (newRowcol && newRowcol.col.field === 'medicalExp') return;
        if (oldRowcol && oldRowcol.row.entity[oldRowcol.col.field] !== this.tempCellValue) {
          let field = oldRowcol.col.field;
          let value = oldRowcol.row.entity[field];
          if (field.length > 5 && field.slice(-5) === 'Short') {
            field = field.slice(0, -5);
            let arr = [];
            if (value) arr = value.split('-');
            if (arr.length === 2) {
              let month = arr[0];
              if (this.shortMonths.indexOf(month) > -1) {
                month = this.shortMonths.indexOf(month);
                month++;
              }
              if (arr[1].length === 2) arr[1] = '20' + arr[1];
              value = month + '/1/' + arr[1];
            } else if (value && new Date(value).getTime && !isNaN(new Date(value).getTime())) {
              value = new Date(value).toLocaleDateString();
            }
          }
          let document = {_id: oldRowcol.row.entity._id};
          document[field] = value;
          if (field !== 'medicalExp') this.updateRecord(document);
        }
        scope.$broadcast('uiGridEventEndCellEdit');
        this.tempCellValue = angular.copy(newRowcol.row.entity[newRowcol.col.field]);
      });
    };
    this.gridOptions2.onRegisterApi = this.gridOptions.onRegisterApi;
  }

  $onInit() {
    window.moment = this.moment;
    window.medicalShortDate = this.medicalShortDate.bind(this);
    this.bootstrapped = false;
    this.Auth.getCurrentUser(user => {
      if (!user || !user.role) return;
      this.user = user;
      this.bootstrapped = true;
      this.init();
    });
  }

  init() {
    if (!this.bootstrapped) return;
    this.http.post('/api/rot/firebaseQuery', {
      collection: 'pilots',
      parameter: 'pilotBase',
      value: this.baseCode,
      limit: 3000
    }).then(res => {
      this.pilots = this.processPilots(res.data || []);
      this.sortPilots(this.pilots);
      this.gridOptions.data = this.pilots;
      this.gridOptions2.data = this.pilots;
    });
  }

  loggedIn() {
    return !!this.bootstrapped;
  }

  processPilots(pilots) {
    pilots.forEach(pilot => {
      for (let key in pilot) {
        if (key !== 'medicalDate' && typeof pilot[key] === 'string') {
          let arr = pilot[key].split('/');
          if (arr.length === 3) {
            pilot[key + 'Short'] = this.shortDate(pilot[key]);
          }
        }
      }
      pilot.revert = false;
      pilot.medicalExp = this.medicalShortDate(pilot);
    });
    return pilots;
  }

  sortPilots(collection) {
    collection.sort((a, b) => {
      if (a.far299Exp && !b.far299Exp) return -1;
      if (!a.far299Exp && b.far299Exp) return 1;
      return new Date(a.dateOfHire) - new Date(b.dateOfHire);
    });
  }

  updateRecord(document) {
    if (!document || !document._id) return;
    return this.http.post('/api/rot/updateFirebase', {
      collection: 'pilots',
      doc: document
    });
  }

  cellClass(grid, row, col) {
    if (!grid) return;
    if (!grid.getCellValue(row, col) || grid.getCellValue(row, col) === '') return;
    let base = window.moment(new Date(grid.getCellValue(row, col)));
    let baseMonth = base.month();
    let baseYear = base.year();
    let today = window.moment();
    let thisMonth = today.month();
    let thisYear = today.year();
    if (thisYear - baseYear === 1) baseMonth -= 12;
    if (thisYear - baseYear === -1) baseMonth += 12;
    if (thisYear - baseYear > 1) return 'black';
    if (thisYear - baseYear < -1) return;
    if ((thisMonth - baseMonth) > 1) return 'black';
    if ((thisMonth - baseMonth) === 1) return 'red';
    if ((thisMonth - baseMonth) === 0) return 'yellow';
    if ((thisMonth - baseMonth) === -1) return 'green';
  }

  medicalCellClass(grid, row, col) {
    if (!grid || !window.moment || !window.medicalShortDate || !row) return;
    let expDate;
    let revert;
    let index = grid.options.data.map(e => e._id).indexOf(row.entity._id);
    if (index > -1) {
      expDate = grid.options.data[index].medicalExp;
      revert = grid.options.data[index].revert;
    }
    if (!expDate || expDate === '') return;
    let base = window.moment(new Date(expDate)).endOf('month');
    let baseMonth = base.month();
    let baseYear = base.year();
    let today = window.moment();
    let thisMonth = today.month();
    let thisYear = today.year();
    if (thisYear - baseYear === 1) baseMonth -= 12;
    if (thisYear - baseYear === -1) baseMonth += 12;
    if (thisYear - baseYear > 1) return 'black';
    if (revert) {
      if ((thisYear - baseYear > 1) || (thisYear - baseYear < -1)) return 'blue';
      if ((thisMonth - baseMonth) >= 1) return 'black';
      if ((thisMonth - baseMonth) === 0) return 'red';
      if ((thisMonth - baseMonth) === -1) return 'yellow';
      if ((thisMonth - baseMonth) === -2) return 'green';
      return 'blue';
    }
    if ((thisYear - baseYear > 1) || (thisYear - baseYear < -1)) return;
    if ((thisMonth - baseMonth) >= 1) return 'black';
    if ((thisMonth - baseMonth) === 0) return 'red';
    if ((thisMonth - baseMonth) === -1) return 'yellow';
    if ((thisMonth - baseMonth) === -2) return 'green';
  }

  shortDate(dateString) {
    if (dateString) {
      let arr = dateString.split('/');
      if (arr.length >= 3) {
        if (arr[2].length === 2) arr[2] = '20' + arr[2];
        return this.shortMonths[parseInt(arr[0], 10) - 1] + '-' + arr[2];
      }
    }
    return dateString;
  }

  medicalShortDate(row) {
    let pilot = row;
    let dateString = row.medicalDate;
    let medClass = row.medicalClass;
    if (row.entity) {
      pilot = row.entity;
      dateString = row.entity.medicalDate;
      medClass = row.entity.medicalClass;
    }
    let duration = 6;
    if (medClass === 'SECOND') duration = 12;
    let age = 50;
    if (pilot.dateOfBirth && pilot.dateOfBirth !== '') {
      age = this.moment(dateString).diff(new Date(pilot.dateOfBirth), 'years', true);
    }
    if (age && age < 40 && age !== 0) {
      duration = 12;
      if (medClass === 'SECOND') duration = 12;
    }
    if (row.medicalInterval && Number.isInteger(row.medicalInterval * 1)) duration = row.medicalInterval;
    let expDate = this.moment(new Date(dateString)).add(duration, 'M').format('MM/DD/YYYY');
    if (expDate) {
      let arr = expDate.split('/');
      if (arr.length >= 3) {
        expDate = this.shortMonths[parseInt(arr[0], 10) - 1] + '-' + arr[2];
      }
    }
    let base = this.moment(new Date(expDate)).endOf('month');
    let baseMonth = base.month();
    let baseYear = base.year();
    let today = window.moment();
    let thisMonth = today.month();
    let thisYear = today.year();
    if (thisYear - baseYear === 1) {
      baseMonth -= 12;
      baseYear++;
    }
    if (thisYear - baseYear === -1) {
      baseMonth += 12;
      baseYear--;
    }
    if (row.entity) {
      let index = this.gridOptions.data.map(e => e._id).indexOf(pilot._id);
      if (index > -1) this.gridOptions.data[index].medicalExp = expDate;
    }
    if (baseMonth < thisMonth && baseYear === thisYear && medClass === 'FIRST') {
      row.revert = true;
      row.medicalClass = 'SECOND';
      expDate = this.medicalShortDate(row);
    }
    return expDate;
  }
}

angular.module('workspaceApp')
  .component('rotPilotBoard', {
    bindings: {
      baseCode: '@',
      boardTitle: '@',
      gridHeight: '@',
      splitPages: '<'
    },
    templateUrl: 'app/rot/pilotBoard/pilotBoard.html',
    controller: RotPilotBoardComponent,
    controllerAs: 'rotPilotBoard'
  });

})();
