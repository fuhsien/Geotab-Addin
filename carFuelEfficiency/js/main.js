/**
	========================================
	Add in name: Fuel Efficiency Report
	Owner: Pro ICE
	Created: 25 April 2017
	Created by: Fu Hsien Ng 
 	Contact email: fuhsienng@proice.com
	========================================














 */
geotab.addin.addinTemplate = function(api, state) {

	/*********************************Global variables***********************************/
	var fromSheet;
	/************************************************************************************/


	/**********************************Retrieve data*************************************/
	//API call for fuel data
	//Pull JSON from Google Sheet
    var initializeJSON = function() {
        var spreadsheetID = "1VBDZZoYqCSWV3ABO7-eBqb21WQjgPLkO3uOBtAQsnr8";
        //var url = "https://spreadsheets.google.com/feeds/list/" + spreadsheetID + "/od6/public/values?alt=json";
        var url = "https://script.google.com/macros/s/AKfycbygukdW3tt8sCPcFDlkMnMuNu9bH5fpt7bKV50p2bM/exec?id=" + spreadsheetID + "&sheet=Sheet1";
        $.getJSON(url, function(data) {
            // loop to build html output for each row
            fromSheet = data.Sheet1;
            console.log("fromSheet", fromSheet);
        });
        /*$.getJSON(url, function(data) {
            // loop to build html output for each row
            var entry = data.feed.entry;
            var line = entry[0]['gsx$device']['$t'];
            var test = entry[0].content;
        });*/
        console.log("Loaded Google Sheet");
    };
	var getVehicles = function(finishedCallback) {
        api.call("Get", {
            typeName: "Device"
        }, function(results) {
            console.log("Device", results);
            vehicles = results.map(function(vehicle) {
                return {
                    name: vehicle.name,
                    id: vehicle.id,
                    serialNumber: vehicle.serialNumber
                };
            });
            console.log("Vehicles loaded", vehicles);
            finishedCallback();
        }, function(errorString) {
            alert(errorString);
        });
    };
	/************************************************************************************/


	/*******************************Results presentation*********************************/
	
	/************************************************************************************/

	return {
	    initialize: function(api, state, initializeCallback) {
			api.getSession(function (session) {
				var currentUser = session.userName;
				api.call("Get", {
					"typeName" : "User",
					"search" : {
						"name" : currentUser
					}
				}, function (result) {
					if (result.length === 0) {
						throw "Unable to find currently logged on user."
					}
					document.getElementById("template-container").style.display = "block";

				}, function (error) {
					throw "Error while trying to load currently logged on user. " + error;
				});
			});
			initializeJSON();
			getVehicles(initializeCallback);

	    },

        /**
         * focus() is called whenever the Add-In receives focus.
         */
	    focus: function(api, state) {

			totalVisits = totalVisits + 2;
			document.getElementById("template-visitCount").innerHTML = totalVisits;
			var test = state.getState();
			console.log(test);

		},
		
		/**
		 * blur() is called whenever the user navigates away from the Add-In.
		 */
		blur: function(api, state) {
			console.log('Closing testing one')
		}
	};
};
