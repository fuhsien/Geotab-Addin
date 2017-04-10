/********************************************************************************

Blue: 6495ED
Red: A00C23


New algorithm:
**Refill can use back old algorithm 

---> get different driving session
---> loop hold Volt, only remain those session falls outside of driving session (indicate vehicle not moving)
---> check remaining data, for constant dropping


Need to reduce computational need! 
 - Eliminate nested for loop (data points x driving sessions)
 - Change driving sessions into a plain array (no object). 
 - Duplicate rawFuel :::> processedFuel
 - loop through driving sessions, for only once. 
    Find where the Beginning/ end of driving session fits in processedFuel. 
    Make a marking (by adding new element) at transition 
 - Loop through processedFuel,
    at every transition, change flag (drivingFlag) status
    check flag status, do different things accordingly


type of flagging:
 1) use typeof (data is in object), can store extra info about transition
 2) use empty cell, trigger by if(null)





https://www.google.com/maps/place/3.18730235,101.676445
"3.18730235,101.676445"

https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.css








*********************************************************************************/
geotab.addin.geotabFuelSensor = function(api, state) {
    // Your private functions and variables go here
    var startDate,
        endDate,
        vehicles,
        fromSheet,
        vFlag = 0, //Check if vehicle selected
        sFlag = 0, //check if start date selected
        eFlag = 0, //check if end date selected
        avgPoints = 25,
        fuelThreshold = 5,
        sessionThreshold = 5, //in minutes
        tankSize = 80,
        selectedOpt,
        startPicker,
        endPicker,
        averager = 0,
        holdTimeAux = [],
        holdTimeSpeed = [],
        holdVolt = [],
        holdSpeed = [],
        holdLitre = [],
        output = [];

    /*startDate.setDate(startDate.getDate() - 7);
    console.log("Start Date:", startDate);*/
    //console.log("End Date:", endDate);

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

    var getAux1 = function(vehicleID, vehicleSN, callback1, callback2) {
        //Get tank size
        var chosen = fromSheet.filter(function(obj) {
            return obj.Serial_Number == vehicleSN;
        })[0];
        tankSize = chosen.Tank_Size;
        // Get the correct Diagnostic info for Aux1
        api.call("Get", {
            "typeName": "Diagnostic",
            "search": {
                "name": "Analog aux 1"
            },
        }, function(result) {
            var auxID = result[0].id; //Assign specific ID to variable

            api.multiCall([
                ["Get", {
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
                    }
                }],
                ["Get", {
                    "typeName": "LogRecord",
                    "search": {
                        deviceSearch: {
                            "id": vehicleID
                        },
                        fromDate: startDate,
                        toDate: endDate
                    }
                }]
            ], function(results) {
                var rawFuel = results[0];
                var rawSpeed = results[1];
                var fuelSessions = rawFuel;         //Add in breaks to indicate different driving sessions
                var firstRecord = null;
                var lastRecord = null;
                var timeCurrent = null, timeOld = null;
                var drivingSessions = [];
                var temp = null;


                for (var i = 0; i < rawSpeed.length; i++) {
                    if(rawSpeed[i].speed > 5){
                        if(firstRecord == null){        //initialization
                            firstRecord = rawSpeed[i];
                            lastRecord = rawSpeed[i];
                        }
                        timeCurrent = new Date(rawSpeed[i].dateTime).getTime();
                        timeOld = new Date(lastRecord.dateTime).getTime();
                        if ( (timeCurrent - timeOld)/(1000*60) >= sessionThreshold){
                            //current point is a new session already!
                            temp = new Date(firstRecord.dateTime);
                            temp.setMinutes(temp.getMinutes()-2);
                            drivingSessions.push(temp,new Date(lastRecord.dateTime));
                            firstRecord = rawSpeed[i];
                        }
                        lastRecord = rawSpeed[i];
                    }
                }
                if (firstRecord){
                    temp = new Date(firstRecord.dateTime);
                    temp.setMinutes(temp.getMinutes()-2);
                    drivingSessions.push(temp, new Date(lastRecord.dateTime));
                    //console.log("All sessions",drivingSessions);
                }
                
                //Double check time is in ascending order, if there's points not in order, merge two sessions
                for(i=1; i<drivingSessions.length;i++){
                    var NOW = new Date(drivingSessions[i]).getTime();
                    var LAST = new Date(drivingSessions[i-1]).getTime();
                    if (NOW - LAST < 0){
                        console.log("MERGING TWO SESSIONS!");
                        var tempArray=[];
                        tempArray.push(i-1);
                    }
                }
                if (tempArray){
                    for (i=0;i<tempArray.length;i++){
                        drivingSessions.splice(tempArray[i],2);
                    }
                }

                // Adding sessions into fuel array
                console.log("Length before appending", fuelSessions.length, drivingSessions.length);
                var comparator = drivingSessions[1].getTime();
                console.log("TIME TYPE",typeof drivingSessions[1]);
                for (i=0,j=1;(i<fuelSessions.length) && (j<drivingSessions.length);i++){
                    var fuelTime = new Date(fuelSessions[i].dateTime).getTime();
                    if(comparator - fuelTime<0){
                        fuelSessions.splice(i++,0,null);
                        console.log("iteration j",j);
                        comparator = drivingSessions[j++].getTime();
                    }
                }
                console.log("After appending",fuelSessions.length);
                callback1(results, callback2, vehicleID); //plotData,callback2:createtable

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
        });
        /*$.getJSON(url, function(data) {
            // loop to build html output for each row
            var entry = data.feed.entry;
            var line = entry[0]['gsx$device']['$t'];
            var test = entry[0].content;
        });*/
        console.log("Loaded Google Sheet");
    };

    var plotData = function(results, callback, vehicleID) {
        /*======================================================================================*/
        //Reset points before plotting to prevent accumulation
        averager = 0;
        holdTimeAux = [];
        holdTimeSpeed = [];
        holdVolt = [];
        holdSpeed = [];
        holdLitre = [];
        output = [];
        /*======================================================================================*/

        var data = [];
        var data2 = [];
        var dataSeries = [{
            name: "Fuel Level",
            type: "line",
            xValueFormatString: "DD MMM HH:mm",
            lineThickness: 3,
            color: "#A00C23", //red
            showInLegend: true
        }, {
            name: "Speed",
            type: "line",
            xValueFormatString: "DD MMM HH:mm",
            lineThickness: 1,
            color: "#6495ED", //blue
            axisYIndex: 1,
            showInLegend: true
        }];
        var dataSeries2 = {
            type: "splineArea"
        };
        var dataPointsAux = [];
        var dataPointsSpeed = [];
        var dataPoints2 = [];
        console.log("Selected Vehicle Aux:", results); //results return aux values
        

        for (var i = 0; i < results[0].length - 1; i++) {
            holdTimeAux[i] = results[0][i].dateTime;
            holdVolt[i] = results[0][i].data;
            holdLitre[i] = tankSize * holdVolt[i] / (4-0.05);
            if (i >= avgPoints) {
                averager = averager + holdLitre[i] - holdLitre[i - avgPoints]; //50 points onwards, add new data, delete first data
                output[i] = averager / avgPoints;
            } else {
                output[i] = null;
                averager += holdLitre[i];
            }
            //console.log("Avg", typeof(averager));
            //console.log("hold", typeof(holdVolt[i]));
            dataPointsAux.push({
                x: new Date(holdTimeAux[i]),
                //x: i,
                //y: output[i]
                y: holdVolt[i]
            });
            dataPoints2.push({
                x: i,
                y: output[i]
            });
        }

        for (var j = 0; j < results[1].length - 1; j++) {
            holdTimeSpeed[j] = results[1][j].dateTime;
            holdSpeed[j] = results[1][j].speed;
            dataPointsSpeed.push({
                x: new Date(holdTimeSpeed[j]),
                y: holdSpeed[j]
            });
        }
        /*for (var j = 0; j < filtered.length - 1; j++) {
            holdTimeSpeed[j] = filtered[j].dateTime;
            holdSpeed[j] = filtered[j].speed;
            dataPointsSpeed.push({
                x: new Date(holdTimeSpeed[j]),
                y: holdSpeed[j]
            });
        }*/

        dataSeries[0].dataPoints = dataPointsAux;
        dataSeries[1].dataPoints = dataPointsSpeed;
        dataSeries2.dataPoints = dataPoints2;
        data.push(dataSeries[1]);
        data.push(dataSeries[0]);
        data2.push(dataSeries2);

        var options = {
            zoomEnabled: true,
            animationEnabled: true,
            title: {
                text: "Fuel Graph"
            },
            axisX: {
                intervalType: "day",
                valueFormatString: "MMM DD| h TT",
                //labelAngle: -20
            },
            axisY: [{
                title: "Litres",
                lineColor: "#A00C23",
                tickColor: "#A00C23",
                gridThickness: 2,
                interlacedColor: "#F7F9F9",
                labelFontColor: "#A00C23",
                titleFontColor: "#A00C23",
                lineThickness: 2,
                includeZero: false,
            }, {
                title: "km/h",
                lineColor: "#6495ED",
                tickColor: "#6495ED",
                gridThickness: 0,
                labelFontColor: "#6495ED",
                titleFontColor: "#6495ED",
                lineThickness: 2,
                includeZero: false,
            }],
            data: data,
            legend: {
                cursor: "pointer",
                itemclick: function(e) {
                    if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                        e.dataSeries.visible = false;
                    } else {
                        e.dataSeries.visible = true;
                    }
                    $("#chartContainer").CanvasJSChart().render();
                }
            }
        };

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
                gridThickness: 0,
                includeZero: false
            },
            data: data2
        };

        $("#chartContainer").CanvasJSChart(options);
        $("#chartContainer2").CanvasJSChart(options2);
        callback(holdTimeAux, output, vehicleID);
    };

    var createTable = function(time, fuel, vehicleID) {
        //Create table here: result return as Array of array [Array[80], Array[230]] -> [Aux 1, Speed]
        //Table will include: Thead, Columns:[Date, fuel level, Device?, location?]

        /*****************************************************************************/
        //Removing previous table before plotting
        if (document.getElementById("theft-table")) {
            $("#theft-table").remove();
            $('#deviceLocation').attr('src', '');
            status = null;
        }
        
        //document.getElementById("deviceLocation").setAttribute("src", locationUrl);
        

        /*****************************************************************************/
        var body = document.getElementById("for-table");
        var table = document.createElement('table');
        var tbody = document.createElement('tbody');
        var tr, td;
        var activityCounter=0;
        var theftCount = [];
        var theftLocation = [];
        var multiCallArray = [];

        table.id = "theft-table";
        table.className = "table is-striped";

        //header
        var header = table.createTHead();
        var Hrow = header.insertRow(0);

        var th = document.createElement('th');
        th.innerHTML = "Date";
        Hrow.appendChild(th);

        th = document.createElement('th');
        th.innerHTML = "Type of activity";
        Hrow.appendChild(th);

        th = document.createElement('th');
        th.innerHTML = "Fuel Amount (Litres)";
        Hrow.appendChild(th);        

        th = document.createElement('th');
        th.innerHTML = "Before (Litres)";
        Hrow.appendChild(th);

        th = document.createElement('th');
        th.innerHTML = "After (Litres)";
        Hrow.appendChild(th);


        /*****************************************************************************/
        // Algorithm for Fuel theft/refill detection
        var fuelChange;
        for (var i = 2 * avgPoints, j = 0; i < fuel.length; i++) {
            fuelChange = fuel[i] - fuel[i - avgPoints];
            if (Math.abs(fuelChange) > fuelThreshold) {
                theftCount[j++] = [i, new Date(time[i]), fuel[i], fuelChange];
            }
        }
        console.log("Refill/Theft", theftCount);

        //sorting theftCount into activities
        if (theftCount.length>0){
            for(var i=0,newflag=1,counter=0,index=0 ;i<theftCount.length-1;i++){
                if (theftCount[i+1][0]-theftCount[i][0] <= 5){
                    if (newflag == 1){
                        //indicates new activity
                        index = theftCount[i][0]-avgPoints;     // minus avgPoints to remove time delayed by averaging
                        newflag = 0;
                    }       //no new activity found
                    counter++;
                }
                else{
                    //indicates next point is the new activity

                    index += Math.floor(counter/2);
                    tr = tbody.insertRow();
                    td = tr.insertCell(0);
                    td.innerHTML =moment(time[index]).format('dddd, MMM DD, h:mm a');

                    td = tr.insertCell(1);
                    if(Math.sign( theftCount[Math.ceil(i-counter/2)][3] ) == -1){
                        td.innerHTML = "Possible Fuel Theft";
                    }else {
                        td.innerHTML = "Refill";
                    }
                    td = tr.insertCell(2);
                    td.innerHTML = (theftCount[Math.ceil(i-counter/2)][3]).toFixed(4);

                    td = tr.insertCell(3);
                    td.innerHTML = fuel[index].toFixed(4);

                    td = tr.insertCell(4);
                    td.innerHTML = fuel[index+avgPoints].toFixed(4);

                    //get location here
                    var theftStart = new Date(time[index]);
                    var theftEnd = new Date(time[index]);
                    theftStart.setMinutes(theftStart.getMinutes()-2);

                    //put info into multiCallArray
                    multiCallArray.push(
                        ["Get", {
                            "typeName": "LogRecord",
                            "search": {
                                deviceSearch: {
                                    "id": vehicleID
                                },
                                fromDate: theftStart,
                                toDate: theftEnd
                            }
                        }]
                    )

                    newflag = 1;
                    counter = 0;
                }
            }
            
            index += Math.floor(counter/2);
            tr = tbody.insertRow();
            td = tr.insertCell(0);
            td.innerHTML =moment(time[index]).format('dddd, MMM DD, h:mm a');
            td = tr.insertCell(1);
            if(Math.sign( theftCount[Math.ceil(i-counter/2)][3] ) == -1){
                td.innerHTML = "Possible Fuel Theft";
            }else {
                td.innerHTML = "Refill";
            }
            td = tr.insertCell(2);
            td.innerHTML = theftCount[Math.ceil(i-counter/2)][3].toFixed(4);

            td = tr.insertCell(3);
            td.innerHTML = fuel[index].toFixed(4);

            td = tr.insertCell(4);
            td.innerHTML = fuel[index+avgPoints].toFixed(4);

            //get location here
            var theftStart = new Date(time[index]);
            var theftEnd = new Date(time[index]);
            theftStart.setMinutes(theftStart.getMinutes()-2);

            multiCallArray.push(
                ["Get", {
                    "typeName": "LogRecord",
                    "search": {
                        deviceSearch: {
                            "id": vehicleID
                        },
                        fromDate: theftStart,
                        toDate: theftEnd
                    }
                }]
            )

            console.log("AMAZING ARRAY, NO JOKE",multiCallArray);
            api.multiCall(multiCallArray, function(results) {
                console.log("LESS O-SOME BUT STILL CHECKIT AAAUT", results);
                for (i=0;i<results.length;i++){
                    var status = results[i];
                    if (status[0]){
                        status = status[status.length-1];
                        theftLocation.push(status.latitude + "," + status.longitude);
                    }else{
                        theftLocation.push(null);
                    }

                }
            });
            console.log("TIME FOR OVERVIEW",theftLocation);

            document.getElementById("disclaimer").innerHTML = '<span style="color:red"><b>**Disclaimer: </b></span> The following table is only meant to be a pointer. Please further investigate before making conclusion.';
            table.appendChild(tbody);
            body.appendChild(table);

            $("tbody tr").click(function(){
                $('.selected').removeClass('selected');
                $(this).addClass('selected');
                console.log("Row index is ",this.rowIndex);
                var coords = theftLocation[this.rowIndex-1],
                    locationUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + coords + "&zoom=15&scale=false&size=300x300&maptype=roadmap&format=png&visual_refresh=true&markers=color:red%7C" + coords;
                $('#deviceLocation').attr('src', locationUrl);
                $('#activity-maps').attr('href',"http://www.google.com/maps/place/" + coords);
            });
        }
    };

    var reset = function() {
        document.getElementById("mapreplay-options-vehicle").innerHTML = "";
        document.getElementById("chartContainer").innerHTML = "";
        document.getElementById("chartContainer2").innerHTML = "";
        document.getElementById("disclaimer").innerHTML = "";
        document.getElementById("render").disabled = true;
        selectedOpt = null;

        if (startPicker || endPicker) {
            startPicker.clear();
            endPicker.clear();
        }
        if (document.getElementById("theft-table")) {
            $("#theft-table").remove();
            $('#deviceLocation').attr('src', '');
        }

        vFlag = false;
        sFlag = false;
        eFlag = false;

        $('#mapreplay-options-vehicle').unbind();
        $('#render').unbind();

    };

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
        var button = document.getElementById("render");
        var $inputStart = $("#startDate").pickadate({
            closeOnSelect: false,
            closeOnClear: true,
            min: new Date(2017, 0, 1),
            max: new Date()
        });
        var $inputEnd = $("#endDate").pickadate({
            closeOnSelect: true,
            closeOnClear: false,
            min: new Date(2017, 0, 1),
            max: new Date()
        });

        startPicker = $inputStart.pickadate('picker');
        endPicker = $inputEnd.pickadate('picker');

        var s = document.getElementById("startDate"); //to force the css to look the same
        var e = document.getElementById("endDate");
        s.readOnly = false;
        e.readOnly = false;

        $("#mapreplay-options-vehicle").change(function() {
            selectedOpt = this.value;
            if (selectedOpt) {
                selectedOpt = $.parseJSON(selectedOpt.replace(/'/g, '"'));
                vFlag = true;
            } else {
                vFlag = false;
            }
            if (vFlag && sFlag && eFlag) {
                button.disabled = false;
            } else {
                button.disabled = true;
            }
        });

        //After vehicle selected
        $('#render').click(function() {
            var selectedVehicleId = selectedOpt.id;
            var selectedVehicleSN = selectedOpt.serialNumber;
            if (selectedVehicleId) {
                //Get Aux Data for this vehicle
                getAux1(selectedVehicleId, selectedVehicleSN, plotData, createTable); //rawData is results from getAux1
                button.disabled = true;
            }
        });

        //Event handler for Date picker
        $('#startDate').change(function() {
            if (startPicker.get('select')) {
                startDate = new Date(startPicker.get('select').pick);
                //console.log("startPicker", startPicker.get('select').pick);
                endPicker.set({
                    min: startDate
                });
                e.disabled = false;
                sFlag = true;
            } else {
                endPicker.clear();
                e.disabled = true;
                sFlag = false;
            }
            if (vFlag && sFlag && eFlag) {
                button.disabled = false;
            } else {
                button.disabled = true;
            }
        });

        $('#endDate').change(function() {
            if (endPicker.get('select')) {
                endDate = new Date(endPicker.get('select').pick);
                endDate.setHours(23);
                endDate.setMinutes(59);
                console.log("Start Date:", startDate);
                console.log("End Date:", endDate);
                startPicker.set({
                    max: endDate
                });
                eFlag = true;
            } else {
                startPicker.set({
                    max: new Date()
                });
                eFlag = false;
            }
            if (vFlag && sFlag && eFlag) {
                button.disabled = false;
            } else {
                button.disabled = true;
            }
        });
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
