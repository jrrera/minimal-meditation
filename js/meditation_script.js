var app = angular.module('meditationApp', []);

app.filter('minutes', function(){
	return function(val) {
		var minutes = Math.floor(val / 60),
			secondsRemainder = parseInt(val % 60);

		console.log('minutes:', minutes, 'secondsRemainder:', secondsRemainder);

		if (secondsRemainder && minutes) {
			return minutes + ' minutes and ' + secondsRemainder + ' seconds.' 
		} else if (minutes) {
			return minutes + ' minutes'
		} else {
			return secondsRemainder + ' seconds'
		}
	}
});

app.factory('DataService', function(){
	// Uses localStorage for now
	// This API will eventually move to AppEngine
	return {
		saveSession: function(session) {
			var sessions = JSON.parse(localStorage['meditationData'])
			sessions.push(session);

			localStorage['meditationData'] = JSON.stringify(sessions);
		},
		getSessions: function() {
			try {
				return JSON.parse(localStorage['meditationData']);
			} catch(e) {
				console.log('Error: Unable to retrieve session data.', e);
				return [];
			}
		},
		deleteSession: function(session, index) {
			var sessions = JSON.parse(localStorage['meditationData'])
			sessions.splice(index, 1);

			localStorage['meditationData'] = JSON.stringify(sessions);
		}
	};
});

app.controller('ClockCtrl', ['$scope', '$timeout', 'DataService', function($scope, $timeout, DataService){
	$scope.begin = false;
	$scope.result = "";

	$scope.pastActivity = DataService.getSessions();
	
	console.log('pastActivity is', $scope.pastActivity)

	// Converts minutes to seconds
	$scope.convertDurationToSeconds = function(minutes) {
		console.log('lets convert');
		$scope.duration = isNaN(minutes) ? 0 : (minutes * 60);
	};

	// This function is meant to be executed by the timer clock at completion
	// @param - duration {int}
	$scope.trackTime = function(duration) {

		var session = {
			date: new Date().getTime(),
			duration: duration
		}; 

		$scope.result = 'Congrats! You meditated for ' + duration + ' seconds!'
		
		$timeout(function(){
			$scope.result = "";
		}, 5000);


		$scope.pastActivity.push(session);

		DataService.saveSession(session);
	};

	$scope.deleteSession = function(session, index) {
		if (confirm('Are you sure? There\'s no undoing this action.')) {
			$scope.pastActivity.splice(index,1);
			DataService.deleteSession(session, index);	
		}

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
			countdown: '@', // Usually true, to indicate counting down
			clockFace: '@', // What kind of timer to display
			start: '@', // The scope property to watch for starting the timer
			duration: '@', // How long the timer should run
			stopFunc: '&stop', //Function to call upon completed timer
			sound: '@' // The ID of the audio element on the page
		},
		link: function(scope, element, attrs) {

			var duration, 
				clock,
				bell = document.getElementById(scope.sound);

			scope.$watch('start', function(val){
				
				duration = parseInt(scope.duration);

				if (!isNaN(duration) && val) {

					// If you've already started a clock, wipe
					// it out and start fresh with a new clock
					// 
					// This needs to be improved because right 
					// now it doesn't unregister the callbacks from
					// the removed clock
					if (clock) $(element).empty();

					// Create clock using the FlipClock library
					clock = $(element).FlipClock(duration, {
						countdown: scope.countdown,
						clockFace: scope.clockFace,
						callbacks: {
							start: function() {
								console.log('Ring ring!');
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

