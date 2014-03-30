// Remember, you can use 'iit' or 'ddescribe' to isolate tests this gets heavy

describe('Testing a controller', function() {
  var $scope, ctrl, $timeout, sessionData;
  
  /* declare our mocks out here
   * so we can use them through the scope 
   * of this describe block.
   */
  var DataServiceMock;
  
  beforeEach(function (){
    
    // Create a "spy object" for our someService.
    // This will isolate the controller we're testing from
    // any other code.
    // we'll set up the returns for this later 
    DataServiceMock = jasmine.createSpyObj('DataServiceMock', ['getGoal', 'getSessions', 'getLastDuration']);
    
    // load the module you're testing.
    module('meditationApp');
    
    // INJECT! This part is critical
    // $rootScope - injected to create a new $scope instance.
    // $controller - injected to create an instance of our controller.
    // $q - injected so we can create promises for our mocks.
    // _$timeout_ - injected to we can flush unresolved promises.
    inject(function($rootScope, $controller, $q, _$timeout_) {
      // create a scope object for us to use.
      $scope = $rootScope.$new();

      // Example session data
      sessionData = [
        {"date":1395693446554,"duration":6,"goal":600,"reachedGoal":false},
        {"date":1395693465769,"duration":6,"goal":2,"reachedGoal":true}
      ];
  
      // set up the returns for our service mock
      DataServiceMock.getGoal.andReturn($q.when(630));
      DataServiceMock.getSessions.andReturn($q.when(sessionData));
      DataServiceMock.getLastDuration.andReturn(120);
      
      // assign $timeout to a scoped variable so we can use 
      // $timeout.flush() later. Notice the _underscore_ trick
      // so we can keep our names clean in the tests.
      $timeout = _$timeout_;
      
      // now run that scope through the controller function,
      // injecting any services or other injectables we need.
      // **NOTE**: this is the only time the controller function
      // will be run, so anything that occurs inside of that
      // will already be done before the first spec.
      ctrl = $controller('ClockCtrl', {
        $scope: $scope,
        DataService: DataServiceMock
      });
    });
  });
 
 
  /* Test 1: The simplest of the simple.
   * here we're going to test that some things were 
   * populated when the controller function whas evaluated. */
  it('should initialize result to an empty string', function() {
    expect($scope.result).toEqual("");
  });
  
  
  // Test 2: Is the DataService returning session data properly 
  // onto $scope.pastActivity??
  it('should pull past session and goal data successfully', function (){
    
    // DataService runs automatically upon controller instantiation
    // So step 1 is to flush out the promise object to return the data
    $timeout.flush();

    expect(DataServiceMock.getSessions).toHaveBeenCalled();
    
    expect($scope.pastActivity.length).toEqual(2); // Mock object has 2 entries
    expect($scope.goal).toEqual(630); // Goal duration defined in beforeEach
    expect($scope.goalChange).toEqual({ minutes: 10, seconds: 30 });

  });

  it('should be able to get and set last used meditation duration', function (){
    
    // DataService runs automatically upon controller instantiation
    // So step 1 is to flush out the promise object to return the data
    $timeout.flush();

    expect(DataServiceMock.getLastDuration).toHaveBeenCalled(); 
    expect($scope.duration).toEqual(120); // Goal duration defined in beforeEach

  });

  
  /* Test 3: Testing a $watch()
   * The important thing here is to call $apply() 
   * and THEN test the value it's supposed to update. */
  // it('should update baz when bar is changed', function (){
  //   //change bar
  //   $scope.bar = 'test';
    
  //   //$apply the change to trigger the $watch.
  //   $scope.$apply();
    
  //   //assert
  //   expect($scope.baz).toEqual('testbaz');
  // });
  
  
  /* Test 4: Testing an asynchronous service call.
     Since we've mocked the service to return a promise
     (just like the original service did), we need to do a little
     trick with $timeout.flush() here to resolve our promise so the
     `then()` clause in our controller function fires. 
     
     This will test to see if the `then()` from the promise is wired up
     properly. */
  // it('should update fizz asynchronously when test2() is called', function (){
  //   // just make the call
  //   $scope.test2();
    
  //   // asser that it called the service method.
  //   expect(someServiceMock.someAsyncCall).toHaveBeenCalled();  
    
  //   // call $timeout.flush() to flush the unresolved dependency from our
  //   // someServiceMock.
  //   $timeout.flush();
    
  //   // assert that it set $scope.fizz
  //   expect($scope.fizz).toEqual('weee');    
  // });
});