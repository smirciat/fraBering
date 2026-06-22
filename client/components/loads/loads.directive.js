'use strict';

angular.module('workspaceApp')
  .directive('loads', function($compile, $http) {

  return {

    templateUrl: 'components/loads/files/sheet002.htm',
      scope: {
        flight: '=' 
      },
    link: function(scope, element, attrs) {
      console.log(scope.flight);//two way binding comfirmed working
      scope.load = {
        pallets: []
      };

      angular.forEach(
        element[0].querySelectorAll('[data-field]'),
        function(td) {

          var field = td.getAttribute('data-field');
          var type = td.getAttribute('data-type');
          if (type === 'input') {
            td.innerHTML =
              '<input ' +
              'class="load-input" ' +
              'ng-model="load.' + field + '">' ;
          }

          $compile(td)(scope);
        }
      );

    }
  };
});
