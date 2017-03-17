/**
 * Your Add-In code goes inside the addinTemplate function. This is the constructor for your Add-In.
 *
 * This function will automatically get called to construct your Add-In by MyGeotab at the right time.  You need to
 * return a function  that contains three methods: initialize(), focus() and blur(). These will be called at the
 * appropriate times during the life of the Add-In.
 *
 * @param api The GeotabApi object for making calls to MyGeotab.
 * @param state The state object allows access to URL, page navigation and global group filter.
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.geotabFuelSensor = function(api) {
	"use strict";
	// Your private functions and variables go here
	var startDate = new Date(),
    endDate = new Date(),
    vehicles;

	startDate.setDate(startDate.getDate()-3);
	endDate.setDate(endDate.getDate());
	console.log("Start Date:",startDate);
	console.log("End Date:",endDate);

	/*****************************Get Data from Geotab***********************************/
	var getVehicles = function () {
	    api.call("Get", {
	        typeName: "Device"
	    }, function (results) {
	        vehicles = results.map(function (vehicle) {
	            return {
	                name: vehicle.name,
	                id: vehicle.id
	            };
	        });
	        console.log("Initializing page");
	        console.log("Vehicles loaded");
	    }, function (errorString) {
	        alert(errorString);
	    });
	};

	var getAux1 = function(vehicleID){
		api.call("Get", {                           // Get the correct Diagnostic info for Aux1
		    "typeName": "Diagnostic",
		    "search": { "name": "Analog aux 1"},
		}, function(result) {
		    //console.log("Result:",result);
		    var auxID = result[0].id;                 //Assign specific ID to variable
		  
		    api.call("Get",{
		        "typeName":"StatusData",
		        "search": {
		            diagnosticSearch:{ 
		                "id": auxID
		            },
		            deviceSearch:{ 
		                "id": vehicleID
		            },
		            fromDate: startDate,
		            toDate: endDate
		        },
		        //resultsLimit: 10,
		        }, function(results) {
		        console.log("Selected Vehicle Aux:",results);
		        });
		}, function(e) {
		    console.error("Failed:", e);
		});
	};	

	/*****************************HTML functionality***********************************/
	var populateVehicleSelect = function () {
		console.log("Populated Vehicle");
	    var vehicleSelect = document.getElementById("mapreplay-options-vehicle");
	    vehicleSelect.appendChild((function () {
	        var defaultOption = document.createElement("option");
	        defaultOption.default = true;
	        defaultOption.selected = true;
	        defaultOption.value = "";
	        defaultOption.textContent = "Select a vehicle...";
	        return defaultOption;
	    })());
	    if (vehicles) {
	        vehicles.forEach(function (vehicle) {
	            var opt = document.createElement("option");
	            opt.value = vehicle.id;
	            opt.textContent = vehicle.name;
	            vehicleSelect.appendChild(opt);
	        });
	    }
	};

	var initializeEventHandler = function(){
		var vehicleSelect = document.getElementById("mapreplay-options-vehicle");
		console.log("Focusing");
		//After vehicle selected
		vehicleSelect.addEventListener("change", function(evt){
			var selectedVehicleId = this.value;
			if (selectedVehicleId){

				//loading
				tripsSelect.appendChild((function () {
					var loadingOpt = document.createElement("option");
					loadingOpt.textContent = "Loading...";
					return loadingOpt;
				})());
				tripsSelect.style.display = "block";

				//Get Aux Data for this vehicle
				getAux1(selectedVehicleId);
			}
		},true);
	};

	return {
        /**
         * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
         * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
         * is ready for the user.
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param state The page state object allows access to URL, page navigation and global group filter.
         * @param initializeCallback Call this when your initialize route is complete. Since your initialize routine
         *        might be doing asynchronous operations, you must call this method when the Add-In is ready
         *        for display to the user.
         */
	    initialize: function(api, state, initializeCallback) {

			// The api object exposes a method we can call to get the current user identity. This is useful for
			// determining user context, such as regional settings, language preference and name. Use the api
			// to retrieve the currently logged on user object.
			
			getVehicles();
	    },

        /**
         * focus() is called whenever the Add-In receives focus.
         *
         * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
         * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
         * the global state of the MyGeotab application changes, for example, if the user changes the global group
         * filter in the UI.
         *
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param page The page state object allows access to URL, page navigation and global group filter.
         */
	    focus: function(api, state) {
			
	    	initializeEventHandler();
	    	populateVehicleSelect();
			
		},
		
		/**
		 * blur() is called whenever the user navigates away from the Add-In.
		 *
		 * Use this function to save the page state or commit changes to a data store or release memory.
		 *
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param page The page state object allows access to URL, page navigation and global group filter.
		 */
		blur: function(api, state) {
			
		}
	};
};

/*****************************Start Running***********************************/