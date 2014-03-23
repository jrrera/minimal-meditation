var app = angular.module('meditationApp', []);

app.filter('minutes', function(){
	return function(val) {
		var minutes = Math.floor(val / 60),
			secondsRemainder = parseInt(val % 60);

		if (secondsRemainder && minutes) {
			return minutes + ' minutes and ' + secondsRemainder + ' seconds';
		} else if (minutes) {
			return minutes + ' minutes';
		} else {
			return secondsRemainder + ' seconds';
		}
	}
});

app.factory('DataService', function(){
	// Uses localStorage for now
	// This API will eventually move to AppEngine
	return {
		saveSession: function(session) {
			var sessions = JSON.parse(localStorage['meditationData']);
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
			var sessions = JSON.parse(localStorage['meditationData']);
			sessions.splice(index, 1);

			localStorage['meditationData'] = JSON.stringify(sessions);
		},

		saveGoal: function(duration) {
			localStorage['meditationGoal'] = duration;
		}, 

		getGoal: function() {
			var duration = parseInt(localStorage['meditationGoal']);
			// Return 540 seconds by default if no valid data to pull
			return duration ? duration : 600;
		}
	};
});

app.controller('ClockCtrl', ['$scope', '$timeout', 'DataService', function($scope, $timeout, DataService){
	$scope.begin = false;
	$scope.result = "";

	// Default values for changing your meditation goal
	$scope.goalChange = {
		minutes: 0,
		seconds: 0
	};

	// Seconds per day of meditation that is your goal
	// This will eventually be part of onboarding onto the app
	$scope.goal = DataService.getGoal(); 

	// Get past activity
	$scope.pastActivity = DataService.getSessions();

	/**
	 * Converts minutes to seconds for displaying in the view
	 * @param {integer} minutes The amount of minutes to convert to seconds
	 */
	$scope.convertDurationToSeconds = function(minutes) {
		console.log('lets convert');
		$scope.duration = isNaN(minutes) ? 0 : (minutes * 60);
	};

	/**
	 * This function is executed by the timer clock at completion
	 * @param {integer} duration The duration of the session in seconds
	 */
	$scope.trackTime = function(duration) {

		var reachedGoal, sessionData;

		// First, check to see if we met our goal for the day
		reachedGoal = (duration > $scope.goal ? true : false); 

		console.log('Did you reach your goal?', reachedGoal);

		// Create the session object
		sessionData = {
			date: new Date().getTime(),
			duration: duration,
			goal: $scope.goal,
			reachedGoal: reachedGoal
		}; 

		// Announce your accomplishment
		$scope.result = 'Congrats! You meditated for ' + duration + ' seconds!'
		
		// Remove the results message after 5 seconds
		$timeout(function(){
			$scope.result = "";
		}, 5000);

		// Save the data on model and in db
		$scope.pastActivity.push(sessionData);
		DataService.saveSession(sessionData);
	};

	/**
	 * Deletes are particular session when the 'Delete' button is clicked
	 * @param {object} session The session you're deleting
	 * @param {integer} index The position of this session in the sessions array
	 * @returns {boolean} Returns true if successful
	 */	
	$scope.deleteSession = function(session, index) {
		if (confirm('Are you sure? There\'s no undoing this action.')) {
			$scope.pastActivity.splice(index,1);
			DataService.deleteSession(session, index);	
		}
		return true;
	};

	/**
	 * Changes your goal time
	 * @param {integer} minutes The number of minutes of the new goal
	 * @param {integer} seconds Number of seconds of the new goal
	 * @returns {boolean} Returns true if successful
	 */	
	$scope.changeGoal = function(minutes, seconds) {
		// If either isn't a number, return false immediately
		if (isNaN(minutes) || isNaN(seconds)) return false;
		

		// Convert both values to total seconds
		$scope.goal = parseInt(seconds) + parseInt(minutes * 60);
		
		// Save the data and hide the goal changer menu
		DataService.saveGoal($scope.goal);
		$scope.showGoalChanger = false; //Reset display of goal changer
		return true;
	}
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
		} // end link function
	};
});

