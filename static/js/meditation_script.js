/* Uses Google Closure compiler JDSoc syntax */

var app = app || angular.module('meditationApp', []);

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

app.factory('ChartService', function(DataService) {
    return {
        
        /**
         * Loads the visualization module from the Google Charts API 
         * if available
         * @returns {boolean} - Returns true is successful, or false 
         * if not available
         */
        loadGoogleVisualization: function() {
            
            // Using a try/catch block to guard against unanticipated 
            // errors when loading the visualization lib
            try {

                // Arbitrary callback required in google.load() to 
                // support loading after initial page rendering
                google.load('visualization', '1', {
                    'callback':'console.log(\'success\');', 
                    'packages':['corechart']
                });
               
                return true;
            
            } catch(e) {
                console.log('Could not load Google lib', e);
                return false;  
            }
        },

        /**
         * Populates the rows of the column chart using past activity
         * @param {object} dataTable - The dataTable object
         * @param {array} pastActivity - The array of session objects
         * @param {days} days - The number of days to go back to
         */
        populateRows: function(dataTable, pastActivity, days) {
        	var datesArray = [], // Will hold the last X days of dates
				theDate, // Will hold whatever date we're processing
				dd = new Date().getDate(), // For convenience
				i;

        	// Cycle through the last X days, based on parameter passed in
        	for (i = days; i > 0; i--) {

        		// Subtract 'i' days from the current date
        		theDate = new Date(new Date().setDate(dd-i));

        		// Conver to the proper format
        		theDate = DataService.convertDateFormat(theDate);

        		// Push the array
        		datesArray.push(theDate);
        	}

        	// Loop through our past activity. If the date is within range
        	// add it to the returned array
        	$.each(datesArray, function(i, date){
        		var match = false;

        		angular.forEach(pastActivity, function(session, i) {
        			var sessionDate,
        				sessionDuration;

        			// Convert the session.date integer into proper format
        			sessionDate = DataService.convertDateFormat(new Date(session.date));

        			// If a match, convert duration to minutes and add row
        			if (date === sessionDate) {
        				sessionDuration = parseInt(session.duration) / 60;
        				dataTable.addRow([sessionDate, sessionDuration]);
        				match = true;
        			}
        		});	

        		if (!match) dataTable.addRow([date, 0]);
        	});
        }
    };
});

app.factory('DataService', ['$q', '$http', function($q, $http){
	// Uses localStorage for now, wrapped in $q.when() so that it is 
	// handled as a promise. This API will eventually move to $http 
	// calls (also a promise)
	return {
		saveSession: function(session) {
			// var sessions;
			
			// try {
			// 	sessions = JSON.parse(localStorage['meditationData']);	
			// } catch(e) {
			// 	sessions = [];
			// }
			
			// sessions.push(session);
			// localStorage['meditationData'] = JSON.stringify(sessions);

			var request = $http.post('/submit', session).then(function(response){
				console.log('Response from server', response.data);
				return response.data;
			});

			// Return promise object
			return request;
		},

		getSessions: function() {
			// try {
			// 	// Try returning the parsed meditation data wrapped in a promise
			// 	return $q.when(JSON.parse(localStorage['meditationData']));
			// } catch(e) {
			// 	console.log('Error: Unable to retrieve session data.', e);
			// 	return $q.when([]); // Return a promise with an empty array
			// }

			var request = $http.get('/getsessions').then(function(response){
				console.log('Response from server', response.data);
				return response.data;
			});

			return request; //promise object
		},

		deleteSession: function(session, index) {
			// var sessions = JSON.parse(localStorage['meditationData']);
			// sessions.splice(index, 1);

			// localStorage['meditationData'] = JSON.stringify(sessions);
			console.log('Not a feature yet. Stay tuned!');
		},

		saveGoal: function(duration) {
			// localStorage['meditationGoal'] = duration;

			// Don't save anything if duration is invalid
			if (!duration || isNaN(duration)) return false;

			var request = $http.post('/updateuser', {"goal": duration}).then(function(response){
				console.log('Response from server', response.data);
				return response.data;
			});

			// Return promise object
			return request;
		}, 

		/**
		 * Save last used meditation duration if available
		 * @param {number} seconds - The amount of seconds to add into conversion
		 * @returns {boolean}
		 */
		setLastDuration: function(seconds) {
			// Don't save anything if seconds are invalid
			if (!seconds || isNaN(seconds)) return false;

			var request = $http.post('/updateuser', {"duration": seconds}).then(function(response){
				console.log('Response from server', response.data);
				return response.data;
			});

			// Return promise object
			return request;
		},

		getUserData: function() {
			var request = $http.get('/getuser').then(function(response){
				console.log('Response from server', response.data);
				return response.data;
			});

			return request; //promise object
		},

		// getGoal: function() {
		// 	var duration = parseInt(localStorage['meditationGoal']);
		// 	// Return 600 seconds by default if no valid data to pull
		// 	// wrapped in a $q promise
		// 	return $q.when(duration ? duration : 600);
		// },

		// /*
		//  * Call upon last used meditation duration if available
		//  * @returns {number|null} - Returns null if no number value can be found
		//	*/
		 
		// getLastDuration: function() {
		// 	var lastDuration = localStorage['meditationLastDuration'];

		// 	if (!lastDuration || isNaN(lastDuration)) {
		// 		return null;
		// 	} else {
		// 		return lastDuration;
		// 	}
		// },
		convertDateFormat: function (dateObj) {
    		var dd = dateObj.getDate();
    		var mm = dateObj.getMonth()+1; //January is 0!
    		var yyyy = dateObj.getFullYear();
    		var formattedDate = mm+'/'+dd+'/'+yyyy;
    		
    		return formattedDate;
    	},

		calculateStreak: function(pastActivity) {
			var today = new Date(),
				dd = today.getDate(),
				unbrokenStreak = true,
				streakLength = 0,
				self = this; // Maintain reference to 'this'

			// Cycle through the last X days, based on parameter passed in
			while (unbrokenStreak) {

				// We assume the streak will be broken until we find a match
				unbrokenStreak = false; 
				
				// Subtract 'i' days from the current date
				theDate = new Date(new Date().setDate(dd-streakLength));

				// Conver to the proper format
				theDate = self.convertDateFormat(theDate);

				angular.forEach(pastActivity, function(session, i) {
					var sessionDate;

					// Convert the session.date integer into proper format
					sessionDate = self.convertDateFormat(new Date(session.date));

					// If a match, convert duration to minutes and add row
					if (theDate === sessionDate) {
						console.log('found another streak day! Now at', streakLength, 'days');
						streakLength += 1;
						unbrokenStreak = true;
					}
				});	
			}

			return streakLength;
		}
	};
}]);

// Angular controllers
app.controller('ClockCtrl', ['$scope', '$timeout', 'DataService', 'ChartService', function($scope, $timeout, DataService, ChartService){
	$scope.begin = false;
	$scope.result = "";
	$scope.activateChart = false;

	// Get past activity
	DataService.getSessions().then(function(data){
		$scope.pastActivity = data.sessions;
		console.log($scope.pastActivity);

		// Next, get user data, such as last goal set and last duration used
		DataService.getUserData().then(function(data){
			console.log('used data', data);

			$scope.duration = data.lastDuration;
			$scope.goal = data.lastGoal;		

			// Convert to minutes for input box
			if ($scope.duration) {
				$scope.minutes = ($scope.duration / 60).toFixed(1);
			}

			if ($scope.goal) {
				// Default values for changing your meditation goal
				$scope.goalChange = {	
					minutes: Math.floor($scope.goal / 60),
					seconds: $scope.goal % 60
				};
			}
		});

		// Next, calculate streak data
		$scope.streakData = {
			streakDays: DataService.calculateStreak($scope.pastActivity), 
			visual: {}
		}; 

		console.log('$scope.streakData is', $scope.streakData);

		// Next, we load the Google Visualization module for charting progress
		// If successful, we flip on the switch for the chart directive
		if (ChartService.loadGoogleVisualization()) {

			// As the callback, construct the chart's data model
			google.setOnLoadCallback(function() {
				var dataTable, 
					days = 14; // Number of days to populate on the chart

				$scope.streakData.visual.dataTable = new google.visualization.DataTable();
				dataTable = $scope.streakData.visual.dataTable; // Shorthand

				dataTable.addColumn("string","Date")
				dataTable.addColumn("number","Minutes")

				// This method will go back 14 days and add rows for each
				// and populate data on those days if eligible
				ChartService.populateRows(dataTable, $scope.pastActivity, days);

				$scope.streakData.visual.title = "Last " + days + " Days";
				
				$scope.$apply(function(){
					$scope.activateChart = true;	
				});
			}); 
		}

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
app.directive("googleChart",function(){  
    return{
        restrict : "A",
        link: function($scope, $elem, $attr){
            var model;

            // Function to run when the trigger is activated
            var initChart = function() {

                // Run $eval on the $scope model passed 
                // as an HTML attribute
                model = $scope.$eval($attr.ngModel);
                
                // If the model is defined on the scope,
                // grab the dataTable that was set up
                // during the Google Loader callback
                // function, and draw the chart
                if (model) {
                    var dt = model.dataTable,
                        options = {},
                        chartType = $attr.googleChart;

                    if (model.title) {
                        options.title = model.title;
                    }
                    
                    var googleChart = new google.visualization[chartType]($elem[0]);
                    googleChart.draw(dt,options)
                }
            };

            // Watch the scope value placed on the trigger attribute
            // if it ever flips to true, activate the chart
            $scope.$watch($attr.trigger, function(val){
                if (val === true) {
                    initChart(); 
                }
            });
            
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

