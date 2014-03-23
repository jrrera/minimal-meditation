var app = angular.module('meditationApp', []);

app.controller('ClockCtrl', ['$scope', '$timeout', function($scope, $timeout){
	$scope.begin = false;
	$scope.result = "";
	
	try {
		$scope.pastActivity = JSON.parse(localStorage['meditationData']) || [];
	} catch(e) {
		$scope.pastActivity = [];
	}
	
	console.log('pastActivity is', $scope.pastActivity)

	// Converts minutes to seconds
	$scope.convertDurationToSeconds = function(minutes) {
		console.log('lets convert');
		$scope.duration = isNaN(minutes) ? 0 : (minutes * 60);
	};

	$scope.trackTime = function(duration) {
		console.log('Done!');
		$scope.result = 'Congrats! You meditated for ' + duration + ' seconds!'
		$timeout(function(){
			$scope.result = "";
		}, 5000);

		$scope.pastActivity.push({
			date: new Date().getTime(),
			duration: duration
		});

		localStorage['meditationData'] = JSON.stringify($scope.pastActivity);
	};
}]);

/**
 * A directive to contain the clock from the 
 * jQuery-based flipclockjs.com library
 */
app.directive('clock', function(){
	return {
		restrict: 'A',
		scope: {
			countdown: '@',
			clockFace: '@',
			start: '@',
			duration: '@',
			stopFunc: '&stop'
		},
		link: function(scope, element, attrs) {
			
			console.log('An Angular clock is about to be here!');
			console.log('Clockface', scope.clockFace);

			var duration, 
				clock,
				bell = document.getElementById('bell');

			scope.$watch('start', function(val){
				
				duration = parseInt(scope.duration);

				if (!isNaN(duration) && val) {

					// If you've already started a clock, wipe
					// it out and start fresh with a new clock
					if (clock) $(element).empty();

					// Create clock using the FlipClock library
					clock = $(element).FlipClock(duration, {
						countdown: scope.countdown,
						clockFace: scope.clockFace,
						callbacks: {
							start: function() {
								console.log('Ring ring!'); // Bell sound should initiate here.
								bell.play();
							},
							stop: function() {
								console.log('Ring ring!');
								bell.play();
								scope.$apply(function(){
									scope.stopFunc(duration);
								});

							}
						}
					});
				}
			});
		}
	}
})

