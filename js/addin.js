/**
21 March 2017
To do list:
1) Add time selection
3) Convertion to percentage/ litres
- km/litres 
-> get distance info for specific time range

 */


geotab.addin.geotabFuelSensor = function(api, state) {
    // Your private functions and variables go here
    var startDate = new Date(),
        endDate = new Date(),
        vehicles,
        rawData,
        fromSheet,
        avgPoints = 20,
        averager = 0,
        tankSize = 80,
        holdDevice = [],
        holdTank = [],
        holdTime = [],
        holdVolt = [],
        holdLitre = [],
        output = [];

    startDate.setDate(startDate.getDate() - 7);
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    /*****************************Get Data from Geotab***********************************/
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

    var getAux1 = function(vehicleID, vehicleSN) {
        //Get tank size
        var chosen = fromSheet.filter(function(obj) {
            return obj.Serial_Number == vehicleSN;
        })[0];
        tankSize = chosen.Tank_Size;
        console.log("CHECK", tankSize);
        // Get the correct Diagnostic info for Aux1
        api.call("Get", {
            "typeName": "Diagnostic",
            "search": {
                "name": "Analog aux 1"
            },
        }, function(result) {
            var auxID = result[0].id; //Assign specific ID to variable

            api.call("Get", {
                "typeName": "StatusData",
                "search": {
                    diagnosticSearch: {
                        "id": auxID
                    },
                    deviceSearch: {
                        "id": vehicleID
                    },
                    fromDate: startDate,
                    toDate: endDate
                },
            }, function(results) {
                var data = [];

                var options = {
                    zoomEnabled: true,
                    animationEnabled: true,
                    title: {
                        text: "Fuel Graph (Past 7 Days)"
                    },
                    axisX: {
                        intervalType: "day",
                        valueFormatString: "DD MMM HH:mm"
                            //labelAngle: -20
                    },
                    axisY: {
                        includeZero: false
                    },
                    data: data
                };
                
                var data2 = [];
                var dataSeries = {
                    type: "line"
                };
                var dataSeries2 = {
                    type: "splineArea"
                }
                var dataPoints = [];
                var dataPoints2 = [];
                console.log("Selected Vehicle Aux:", results); //results return aux values

                for (var i = 0; i < results.length; i++) {
                    holdTime[i] = results[i].dateTime;
                    holdVolt[i] = results[i].data;
                    holdLitre[i] = tankSize * holdVolt[i] / 5;
                    if (i >= avgPoints) {
                        averager = averager + holdLitre[i] - holdLitre[i - avgPoints]; //50 points onwards, add new data, delete first data
                        output[i] = averager / avgPoints;
                    } else {
                        output[i] = null;
                        averager += holdLitre[i];
                    }
                    //console.log("Avg", typeof(averager));
                    //console.log("hold", typeof(holdVolt[i]));
                    dataPoints.push({
                        x: new Date(holdTime[i]),
                        //x: i,
                        y: output[i]
                            //y: holdVolt[i]
                    });
                    dataPoints2.push({
                        x: i,
                        y: output[i]
                    })
                }


                dataSeries.dataPoints = dataPoints;
                dataSeries2.dataPoints = dataPoints2;
                data.push(dataSeries);
                data2.push(dataSeries2);



                var options2 = {
                    zoomEnabled: true,
                    animationEnabled: true,
                    title: {
                        text: "Fuel Trend"
                    },
                    axisX: {
                        labelAngle: 30
                    },
                    axisY: {
                        includeZero: false
                    },
                    data: data2
                };

                $("#chartContainer").CanvasJSChart(options);
                $("#chartContainer2").CanvasJSChart(options2);

            });
        }, function(e) {
            console.error("Failed:", e);
        });
    };
    /*****************************Additional functions***********************************/
    //Pull JSON from Google Sheet
    var initializeJSON = function() {
        var spreadsheetID = "1VBDZZoYqCSWV3ABO7-eBqb21WQjgPLkO3uOBtAQsnr8";
        //var url = "https://spreadsheets.google.com/feeds/list/" + spreadsheetID + "/od6/public/values?alt=json";
        var url = "https://script.google.com/macros/s/AKfycbygukdW3tt8sCPcFDlkMnMuNu9bH5fpt7bKV50p2bM/exec?id=" + spreadsheetID + "&sheet=Sheet1";
        $.getJSON(url, function(data) {
            // loop to build html output for each row
            fromSheet = data.Sheet1;
            console.log("fromSheet", fromSheet);
            for (var i = 0; i < fromSheet.length; i++) {
                holdDevice[i] = fromSheet[i]['Device'];
                holdTank[i] = fromSheet[i]['Tank_Size'];
                //console.log("raw",entry[i]['Device'],holdDevice[i]);
            }
        });
        /*$.getJSON(url, function(data) {
            // loop to build html output for each row
            var entry = data.feed.entry;
            console.log("Raw", data);
            console.log("Processed", entry);
            var line = entry[0]['gsx$device']['$t'];
            var test = entry[0].content;
            console.log("Line 1",line,test);
        });*/
        console.log("Loaded Google Sheet");
    }

    var reset = function() {
        var oldVehicles = document.getElementById("mapreplay-options-vehicle");
        oldVehicles.innerHTML = "";
        var oldChart = document.getElementById("chartContainer");
        oldChart.innerHTML = "";

        averager = 0;
    }

    var plotData = function(type, input, option, chartId) { //Eg. type = "line"/"spline" , input = results  option = object , chartID = "#chartContainer"
        var data = [];
        var dataSeries = {
            type: type
        };
        var dataPoints = [];
        for (var i = 0; i < input.length; i++) {
            holdTime[i] = input[i].dateTime;
            holdVolt[i] = input[i].data;
            holdLitre[i] = tankSize * holdVolt[i] / 5;
            if (i >= avgPoints) {
                averager = averager + holdLitre[i] - holdLitre[i - avgPoints]; //50 points onwards, add new data, delete first data
                output[i] = averager / avgPoints;
            } else {
                output[i] = null;
                averager += holdLitre[i];
            }

            dataPoints.push({
                x: new Date(holdTime[i]),
                //x: i,
                y: output[i]
                    //y: holdVolt[i]
            });
            dataPoints2.push({
                x: i,
                y: output[i]
            })
        }
    }

    /*****************************HTML functionality***********************************/
    var populateVehicleSelect = function() {
        var vehicleSelect = document.getElementById("mapreplay-options-vehicle");
        vehicleSelect.appendChild((function() {
            var defaultOption = document.createElement("option");
            defaultOption.default = true;
            defaultOption.selected = true;
            defaultOption.value = "";
            defaultOption.textContent = "Select a vehicle...";
            return defaultOption;
        })());
        if (vehicles) {
            vehicles.forEach(function(vehicle) {
                var opt = document.createElement("option");
                opt.value = "{'id':'" + vehicle.id + "', 'serialNumber':'" + vehicle.serialNumber + "'}";
                opt.textContent = vehicle.name;
                vehicleSelect.appendChild(opt);
            });
        }
    };

    var initializeEventHandler = function() {
        var vehicleSelect = document.getElementById("mapreplay-options-vehicle");

        //After vehicle selected
        vehicleSelect.addEventListener("change", function(evt) {
            var selectedOpt = this.value;
            selectedOpt = $.parseJSON(selectedOpt.replace(/'/g, '"'));
            var selectedVehicleId = selectedOpt.id;
            var selectedVehicleSN = selectedOpt.serialNumber;
            //console.log("after",typeof(selectedOpt),selectedOpt);
            if (selectedVehicleId) {
                //Get Aux Data for this vehicle
                getAux1(selectedVehicleId, selectedVehicleSN); //rawData is results from getAux1
            }
        }, true);
    };

    /**************************************Start the code***********************************/
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
            //console.log("Initializing page");
            initializeJSON();
            getVehicles(initializeCallback);
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
            //console.log("Focusing");
            initializeEventHandler();
            populateVehicleSelect();
            console.log("Populated Vehicle");
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
            reset();
        }
    };
};

/*****************************Start Running***********************************/
