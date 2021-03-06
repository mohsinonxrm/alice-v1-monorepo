angular.module('aliceApp')
  .controller('CharityDashboardController', ['AuthService', '$scope', '$timeout', '$http', 'API', '$stateParams', 'ProjectService', function (AuthService, $scope, $timeout, $http, API, $stateParams, ProjectService) {
    var vm = this;
    vm.auth = AuthService;
    vm.code = $stateParams.project;
    vm.loggedUser = vm.auth.getLoggedUser();
    vm.validated_outcomes = [];
    $scope.dataLoaded = false;

    if (!AuthService.getLoggedUser()) {
      AuthService.showLogInModal();
    }

    ProjectService.getProjectDetails(vm.code).then(function (projectDetails) {
      vm.projectDetails = projectDetails.data;
    });
    loadGoalsFromProject(vm.code);

    function loadGoalsFromProject(code) {
      $http.get(API + `getImpactsForProject/${code}`).then(function (result) {
        vm.projectWithGoals = result.data;
        if(vm.projectWithGoals) {
          if(vm.projectWithGoals.current_project) {
            vm.project = result.data.current_project;
          }

          vm.general_outcomes = vm.projectWithGoals.goals;


          // Here we iterate through validated goals and calculate
          // overall progress of that goal
          vm.projectWithGoals.validated.forEach((item) => {
            var match = vm.general_outcomes.find((elem) => {
              return elem._id === item._id;
            });
            match.progressInUnits = Math.min(Math.floor(item.totalValidated / (item.outcome[0].costPerUnit)),
                                            item.outcome[0].quantityOfUnits);
            match.percentage = Math.min(Math.floor(100 * item.totalValidated / (item.outcome[0].target)),
                                        100);
            match.doughnutData = [match.percentage, (100 - match.percentage)];
            if(item.outcome[0].color) {
              item.outcome[0].lightColor = convertHex(item.outcome[0].color, 0.35);
              match.doughnutColors = [item.outcome[0].color, item.outcome[0].lightColor];
            }
            match.labels = ['% Validated', '% Remaining'];
            match.doughnutOptions = {
              cutoutPercentage: 70,
              tooltips: {
                xPadding: 35,
                backgroundColor: '#FFF',
                titleFontSize: 25,
                titleFontColor: '#0066ff',
                bodyFontColor: '#000',
                bodyFontFamily: 'Source Sans Pro',
                bodyFontSize: 16,
                displayColors: false,
              }
            };
          });

          // For each outcome in the project, check whether we have a validation in progress
          // If not, initialise as: 0 it for the progress view - initialiseGoalStatus
          vm.general_outcomes.forEach((elem) => {
            if(!(_.where(vm.projectWithGoals.validated, {'_id': elem._id }).length)) {
              vm.validated_outcomes.push(initialiseGoalStatus(elem));
            } else {
              // This will always be the first value ([0]) since _id is unique.
              vm.validated_outcomes.push(_.where(vm.projectWithGoals.validated, {'_id': elem._id })[0]);
            }

            elem.validated =
              elem.claimed.filter(claim => claim.status == 'IMPACT_FETCHING_COMPLETED').length;
            elem.pendingValidations =
              elem.claimed.filter(claim => !claim.status.includes('FAILED') && claim.status != 'IMPACT_FETCHING_COMPLETED').length;
            elem.received = elem.validated * elem.costPerUnit;
          });

          // Get the total number of goals achieved/validated
          vm.totalGoalsAchieved = vm.validated_outcomes.reduce((acc, elem) => ({
            progressInUnits: acc.progressInUnits + elem.progressInUnits})).progressInUnits;

          vm.projectValidator = vm.projectWithGoals.projectValidator;
        }

        $timeout(()=> {$scope.dataLoaded = true;}, 3000);
      });

      function initialiseGoalStatus(goal) {
        let init = {};
        init._id = goal._id;
        init.outcome = [1];
        init.outcome[0] = goal;
        init.totalValidated = 0;
        init.progressInUnits = 0;
        init.percentage = 0;
        if(init.outcome[0].color) {
          init.outcome[0].lightColor = convertHex(init.outcome[0].color, 0.35);
          init.doughnutColors = [init.outcome[0].color, init.outcome[0].lightColor];
        }
        init.doughnutData = [0, 100];
        init.labels = ['Achieved', 'Yet to achieve'];
        return init;
      }

      $http.get(API + `getDonationsForProject/${code}`).then(function (result) {
        vm.donations = result.data[0].donations;
        if (vm.projectWithGoals) {
          vm.projectWithGoals.donations = vm.donations;
        } else {
          vm.projectWithGoals = result.data[0];
        };
      });

    }

    function convertHex(hex, opacity) {
      hex = hex.replace('#','');
      let r = parseInt(hex.substring(0,2), 16);
      let g = parseInt(hex.substring(2,4), 16);
      let b = parseInt(hex.substring(4,6), 16);

      let result = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      return result;
    }

    return vm;
  }])
  .directive('charityDashboardMoney', function() {
    return {
      scope: {
        donations: '=',
      },
      templateUrl: '/components/dashboard/tabs/money/charityDashboardMoney.html'
    };
  })
  .directive('charityDashboardGoals', function() {
    return {
      scope: {
        outcomesDonatedTo: '=',
        outcomesValidated: '=',
        outcomesOfProject: '=',
        projectValidator: '=',
        amountAvailable: '=',
        projectCode: '=',
      },
      templateUrl: '/components/dashboard/tabs/goals/charityDashboardGoals.html'
    };
  })
  .directive('charityDashboardPerformance', function() {
    return {
      scope: {
        people: '=',
      },
      templateUrl: '/components/dashboard/tabs/performance/charityDashboardPerformance.html'
    };
  })
  .directive('charityDashboardDonationsGraph', function() {
    return {
      templateUrl: '/components/dashboard/panels/donationsGraph.html',
      controller: 'CharityDashboardDonationsController as donCtrl',
    };
  })
  .directive('charityDashboardDonationsTable', function() {
    return {
      templateUrl: '/components/dashboard/panels/donationsTable.html',
      controller: 'CharityDashboardDonationsController as donCtrl',
    };
  })
  .directive('goalsBreakdownTable', function() {
    return {
      scope: {
        outcomes: '=',
      },
      templateUrl: '/components/dashboard/panels/goalsBreakdownTable.html'
    };
  });
