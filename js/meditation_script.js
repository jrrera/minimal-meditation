/* Uses Google Closure compiler JDSoc syntax */

var app = app || angular.module('meditationApp', []);

// Callback for initializing Google charts
// Source: http://gavindraper.com/2013/07/30/google-charts-in-angularjs/
google.setOnLoadCallback(function () {    
    angular.bootstrap(document.body, ['meditationApp']);
});

google.load('visualization', '1', {packages: ['corechart']});


// Angular filters
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

//Angular services
app.factory('DataService', ['$q', function($q){
	// Uses localStorage for now, wrapped in $q.when() so that it is 
	// handled as a promise. This API will eventually move to $http 
	// calls (also a promise)
	return {
		saveSession: function(session) {
			var sessions;
			
			try {
				sessions = JSON.parse(localStorage['meditationData']);	
			} catch(e) {
				sessions = [];
			}
			
			sessions.push(session);
			localStorage['meditationData'] = JSON.stringify(sessions);
		},
		getSessions: function() {
			try {
				// Try returning the parsed meditation data wrapped in a promise
				return $q.when(JSON.parse(localStorage['meditationData']));
			} catch(e) {
				console.log('Error: Unable to retrieve session data.', e);
				return $q.when([]); // Return a promise with an empty array
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
			// Return 600 seconds by default if no valid data to pull
			// wrapped in a $q promise
			return $q.when(duration ? duration : 600);
		},

		/**
		 * Call upon last used meditation duration if available
		 * @returns {number|null} - Returns null if no number value can be found
		 */
		getLastDuration: function() {
			var lastDuration = localStorage['meditationLastDuration'];

			if (!lastDuration || isNaN(lastDuration)) {
				return null;
			} else {
				return lastDuration;
			}
		},

		/**
		 * Save last used meditation duration if available
		 * @param {number} seconds - The amount of seconds to add into conversion
		 * @returns {boolean}
		 */
		setLastDuration: function(seconds) {
			// Don't save anything if seconds are invalid
			if (!seconds || isNaN(seconds)) return false;

			localStorage['meditationLastDuration'] = seconds;
			return true;
		}
	};
}]);

// Angular controllers
app.controller('ClockCtrl', ['$scope', '$timeout', 'DataService', function($scope, $timeout, DataService){
	$scope.begin = false;
	$scope.result = "";

	// Get past activity
	DataService.getSessions().then(function(data){
		$scope.pastActivity = data;

		// Seconds per day of meditation that is your goal
		// This will eventually be part of onboarding onto the app
		DataService.getGoal().then(function(goalVal){
			$scope.goal = goalVal;

			// Default values for changing your meditation goal
			$scope.goalChange = {
				minutes: Math.floor($scope.goal / 60),
				seconds: $scope.goal % 60
			};

			$scope.duration = DataService.getLastDuration();

			// If we have a duration pulled from localStorage, convert
			// to minutes for the input box
			if ($scope.duration) {
				$scope.minutes = ($scope.duration / 60).toFixed(1);
			}
		}); 

		// Example model. Will eventually come from
		// DataService.calculateStreak(data);
		$scope.streakData = {
			streakDays: 4, 
			visual: {}
		}; 

		$scope.streakData.visual.dataTable = new google.visualization.DataTable();
		$scope.streakData.visual.dataTable.addColumn("string","Date")
		$scope.streakData.visual.dataTable.addColumn("number","Minutes")
		$scope.streakData.visual.dataTable.addRow(["3/1/14",5]);
		$scope.streakData.visual.dataTable.addRow(["3/2/14",0]);
		$scope.streakData.visual.dataTable.addRow(["3/3/14",0]);
		$scope.streakData.visual.dataTable.addRow(["3/4/14",8]);
		$scope.streakData.visual.dataTable.addRow(["3/5/14",15]);
		$scope.streakData.visual.dataTable.addRow(["3/6/14",12]);
		$scope.streakData.visual.dataTable.addRow(["3/7/14",5]);
		$scope.streakData.visual.dataTable.addRow(["3/8/14",0]);
		$scope.streakData.visual.dataTable.addRow(["3/9/14",0]);
		$scope.streakData.visual.dataTable.addRow(["3/10/14",8]);
		$scope.streakData.visual.dataTable.addRow(["3/11/14",15]);
		$scope.streakData.visual.dataTable.addRow(["3/12/14",12]);
		$scope.streakData.visual.dataTable.addRow(["3/13/14",5]);
		$scope.streakData.visual.dataTable.addRow(["3/14/14",4]);
		$scope.streakData.visual.title="Last 14 Days"

	});
	
	/**
	 * Initializes timer and saves the duration chosen for the next app use
	 */
	$scope.begin = function() {
		$scope.begin = !$scope.begin; // Toggle begin switch
		DataService.setLastDuration($scope.duration);
	};

	/**
	 * Converts minutes to seconds for displaying in the view
	 * @param {Number} minutes - The amount of minutes to convert to seconds
	 * @param {Number=} seconds - The amount of seconds to add into conversion
	 * @returns {Number}
	 */
	$scope.convertDurationToSeconds = function(minutes, seconds) {
		// If seconds is missing or invalid, assign 0
		if (!seconds || isNaN(seconds)) seconds = 0; 
		
		// Set duration on scope in seconds, and return that value
		$scope.duration = (isNaN(minutes) ? 0 + seconds : (minutes * 60) + seconds);
		return $scope.duration;
	};

	/**
	 * This function is executed by the timer clock at completion
	 * @param {number} duration The duration of the session in seconds
	 */
	$scope.trackTime = function(duration) {

		var reachedGoal, sessionData;

		// First, check to see if we met our goal for the day
		reachedGoal = (duration >= $scope.goal ? true : false); 

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
	 * @param {number} index The position of this session in the sessions array
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
	 * @param {number} minutes The number of minutes of the new goal
	 * @param {number} seconds Number of seconds of the new goal
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

// Directive for google charts, modified from
// gavindraper.com/2013/07/30/google-charts-in-angularjs/
// It better handles async data and data models that are more
// than one level deep via $scope.$eval
// Note: Draws itself once to scale by device. So resizing doesn't work
app.directive("googleChart",function($timeout){  
    return{
        restrict : "A",
        link: function($scope, $elem, $attr){
        	var model,

        	// Recursive function, check X times for data before
        	// giving up due to lack of data available on model
        	initChart = function(attempts) {
        		model = $scope.$eval($attr.ngModel);

        		// If the model is undefined or empty,
        		// try X more times until quitting
        		if (!$scope.$eval($attr.ngModel)) {
        			
        			$timeout(function(){
        				console.log('trying again');
        				if (attempts) initChart(attempts - 1);
        			}, 1000)

        		} else {
        			// If we found data, move forward with creating chart
        			var dt = model.dataTable;

        			var options = {};
        			if(model.title)
        			    options.title = model.title;

        			var googleChart = new google.visualization[$attr.googleChart]($elem[0]);
        			googleChart.draw(dt,options)
        		}
        	}

        	initChart(4); // Begin attempts to init chart
        }
    }
});

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

