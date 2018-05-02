module.exports = function (socket_io) {
    var express = require('express');
    var router = express.Router();
    var plugs = require('../plugs');
    var Persons = [];
    var Events = [];

    var timeThresholdToIgnoreRequests = 1; // Time in seconds while requests from the same source are ignored.

    // Default colors used in the LEDs
    var default_colors_study = [
        {red: 0, green: 0, blue: 255},
        {red: 0, green: 255, blue: 0},
        {red: 0, green: 255, blue: 255},
        {red: 255, green: 0, blue: 0},
        {red: 255, green: 0, blue: 255},
        {red: 255, green: 255, blue: 0},
        {red: 255, green: 255, blue: 255}
    ];
    // Default colors to be used by the LEDs (changed to display only one red for our study case)
    var default_colors = [
        {red: 255, green: 0, blue: 0},
        {red: 255, green: 255, blue: 255},
        {red: 255, green: 255, blue: 255},
        {red: 255, green: 255, blue: 255},
        {red: 255, green: 255, blue: 255},
        {red: 255, green: 255, blue: 255},
        {red: 255, green: 255, blue: 255}
    ];

    // Index used to select the next color to be associated to the LED
    var actual_color_position = Math.floor(Math.random() * default_colors.length);

    // Randomly generates a LED to start the movement
    var initial_led_position = Math.floor(Math.random() * plugs.LED_NUM);

    // Default value for velocity (delay between LED transition)
    var default_velocity = 200;

    // Default Number of Targets
    var num_targets = 6;

    // Variable to control if the plugs are making the initial movement or not
    var initialMovementStarted = false;

    var ActualRelay = 0;

    // Variable used to identify if all leds' info are meant to be sent
    // (true - send all leds' info)
    // (false - send only blue leds' info)
    var multiTarget = true;

    /**
     * Returns an array with all LEDs moving and it's corresponding plug name.
     */
    router.get('/', function (req, res) {
        var m_plugs = [];
        for (var i = 0; i < plugs.activePlugs.length; i++) {
            if (typeof plugs.activePlugs[i].leds !== "undefined") {
            	 var allLeds = calculatePosition(plugs.activePlugs[i]);
            	 for( var j = 0; j < allLeds.length ; j++)
            	 {
            	 	if(multiTarget || allLeds[j].blue == 255)
            	 	{
            	 		var targetLed = allLeds[j];
            	 		targetLed.name = plugs.activePlugs[i].name;
            	 		m_plugs.push(targetLed);
            	 	}
            	 }
            } else {
                m_plugs.push({name: plugs.activePlugs[i].name});
            }
        }
        res.json(m_plugs);
    });

    router.get('/AvailablePlugs', function (req,res){
        var m_plugs = [];
        for (var i = 0; i < plugs.activePlugs.length; i++) {
            m_plugs.push({name: plugs.activePlugs[i].name});
        }
        res.json(m_plugs);
    });

    /**
     * Starts the movement of a LED in all active plugs.
     */
    router.get('/start/:numtarget', function (req, res) {
        num_targets = req.params.numtarget;
        if (plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                stopLeds(plugs.activePlugs[i]);
                var velocity = 200;
                var leds = [{}];

                //leds[0].position = (Math.floor(Math.random() * 12) + 6) % 12; This can't ensure that every single plug will have a different initial position

                leds[0].position = initial_led_position % plugs.LED_NUM;
                initial_led_position += 2;

                //This ensure that each plug will rotate to different sides and starts in different positions
                if (i % 2 === 0) { // Odd or even
                    leds[0].orientation = 1;//Math.floor(Math.random() * 2) + 1;
                } else {
                    leds[0].orientation = 2;
                }
                randomizeColor(leds[0]);

                var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
                if (plugs.activePlugs[i].socketVariable) {
                    var initialization = initializeLeds(plugs.activePlugs[i], initconfigs, leds, false);
                    if (initialization.status !== 200) {
                        res.status(initialization.status).send(initialization.send);
                        break;
                    }
                }
            }
            initialMovementStarted = true;
            res.sendStatus(200);
        } else {
            //The request should be ignored no socket is on
            res.status(500).send("There are no sockets available");
        }
    });

    router.get('/StopMoving/', function (req,res) {
        if (plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                plugs.activePlugs[i].socketVariable.emit('StopMovement');
                plugs.activePlugs[i].lastRequest = Date.now() / 1000;
                res.sendStatus(200);
            }
        } else {
            res.status(500).send("There are no sockets available");
        }
    });

    router.get('/SelectedTime/:time', function (req, res) {
        var time =  req.params.time;
        var stringTime = time.split("-");
        var leds = [{},{}];
        if (plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                stopLeds(plugs.activePlugs[i]);
                var velocity = default_velocity;

                //leds[0].position = (Math.floor(Math.random() * 12) + 6) % 12; This can't ensure that every single plug will have a different initial position
                leds[0].position = parseInt(stringTime[0]);
                leds[0].red = 255;
                leds[0].green = 0;
                leds[0].blue = 0;
                if (i % 2 === 0) { // Odd or even
                    leds[0].orientation = 1;//Math.floor(Math.random() * 2) + 1;
                } else {
                    leds[0].orientation = 2;
                }

                leds[1].position = parseInt(stringTime[1]);
                leds[1].red = 0;
                leds[1].green = 255;
                leds[1].blue = 0;
                if (i % 2 === 0) { // Odd or even
                    leds[1].orientation = 1;//Math.floor(Math.random() * 2) + 1;
                } else {
                    leds[1].orientation = 2;
                }


                var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
                if (plugs.activePlugs[i].socketVariable) {
                    var initialization = SelectedLeds(plugs.activePlugs[i], initconfigs, leds, false);
                    if (initialization.status !== 200) {
                        res.status(initialization.status).send(initialization.send);
                        break;
                    }
                }
            }
            initialMovementStarted = true;
            res.sendStatus(200);
        } else {
            //The request should be ignored no socket is on
            res.status(500).send("There are no sockets available");
        }
    });

    router.get('/energy/:value', function (req, res) {
        var renew_energy_value = req.params.value;
        var REInt = parseInt(renew_energy_value, 10);
        var numLedSpinRight = 0;
        var numLedSpinLeft = 0;
        var importantLedPosition = 0;
        var difference = plugs.LED_NUM/plugs.activePlugs.length;
        plugs.activePlugs.forEach(function (element, index) {
            stopLeds(element);
            reviewRenewEnergy(REInt, element);
            leds = [];
            for (var i = 0; i < num_targets; i++) {
                led = {};
                led.orientation = Math.floor(Math.random() * 2) + 1;
                if( i !== 0){
                    renewableEnergyColor(led, REInt);
                    if(i * 4 + importantLedPosition > 11){
                        led.position = ( i * 4 + importantLedPosition ) - 12;
                    }else{
                        led.position = ( i * 4 + importantLedPosition );
                    }
                }else{
                    led.position = importantLedPosition;
                    led.red = 0;
                    led.green = 0;
                    led.blue = 255;

                }
                if (led.orientation === 1) {
                    numLedSpinRight += 1;
                    //Avoid Overlaping Leds
                    for (k = 0; k < leds.length; k++) {
                        if ((leds[k].position === led.position && leds[k].orientation === led.orientation )) {
                            led.orientation = 2;
                            numLedSpinLeft += 1;
                            numLedSpinRight -= 1;
                        }
                    }
                    //Num targets excedded?
                    if (numLedSpinRight > Math.ceil(num_targets / 2)) {
                        led.orientation = 2;
                        numLedSpinRight -= 1;
                        numLedSpinLeft += 1;
                    }
                } else if (led.orientation === 2) {
                    numLedSpinLeft += 1;
                    for (k = 0; k < leds.length; k++) {
                        if ((leds[k].position === led.position && leds[k].orientation === led.orientation )) {
                            led.orientation = 1;
                            numLedSpinRight += 1;
                            numLedSpinLeft -= 1;
                        }
                    }
                    if (numLedSpinLeft > Math.ceil(num_targets / 2)) {
                        led.orientation = 1;
                        numLedSpinRight += 1;
                        numLedSpinLeft -= 1;
                    }
                }
                leds.push(led);
            }
            var initconfigs = plugs.initConfig(leds, default_velocity, ActualRelay);
            initializeLeds(element, initconfigs, leds, true);
            importantLedPosition += difference;
        });
        res.status(200).send("Plug initialized with " + num_targets + " targets.");
        multiTarget = false;        
    });

    router.get('/:plug/Power', function (req,res) {
        var plugId = req.params.plug;
        var plugName = 'plug' + plugId + '.local';
        try{
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                var plugPower = plugState.data;
                if(typeof plugPower === "undefined"){
                    res.status(404).send("Im not receving any value, so you are doing wrong shit! Dumbass!     "+ JSON.stringify(plugPower));
                }else{
                    res.status(200).send(JSON.stringify(plugPower));
                }
            } else {
                res.status(404).send("The selected plug does not exist");
            }
        }catch (ex) {
            res.status(500).send(ex);
        }
    });

    router.get('/Power/', function (req,res) {
        var total = 0.0;
        var Power = [];
        if(Persons.length == 0){
            res.status(200).send("No data");
        }else{
            for(var i =0; i < Persons.length; i++){
                var totalPessoal = 0.0;
                var personPlugs = Persons[i].plugs;
                for(var j = 0; j < personPlugs.length; j++){
                    var plugState = plugs.getPlug(personPlugs[j]);
                    var plugData = plugState.data;
                    var power = plugData.power;
                    var FloatPower = parseFloat(power);
                    totalPessoal += FloatPower;
                }
                total += totalPessoal;
                var dados = {};
                dados.id = Persons[i].id;
                dados.power = totalPessoal;
                dados.total = total;
                dados.NumberPlugs = plugs.length;
                Power.push(dados);
            }
            res.status(200).send(Power);
        }
    });

    router.get('/InsertNewPerson/:PersonDetails', function (req,res) {
        var PersonDetails = req.params.PersonDetails;
        var PersonData = PersonDetails.split('-');
        var plugName = 'plug' + PersonData[1] + '.local';
        if(Persons.length === 0){
            var Person = {};
            Person.id = PersonData[0];
            var plugs = [];
            plugs.push(plugName);
            Person.plugs = plugs;
            Persons.push(Person);
            res.status(200).send(Person);
        }else{
            var existe = false;
            var indice;
            for(var i = 0; i < Persons.length; i++){
                if(Persons[i].id === PersonData[0]){
                    existe = true;
                    indice = i;
                }
            }
            if(existe === false){
                var Person = {};
                Person.id = PersonData[0];
                var plugs = [];
                plugs.push(plugName);
                Person.plugs = plugs;
                Persons.push(Person);
            }else{
                var availablePlugs = Persons[indice].plugs;
                availablePlugs.push(plugName);
                Persons[indice].plugs = availablePlugs;
            }
            res.status(200).send(Persons);
        }
        var Event = {};
        Event.id = PersonData[0];
        Event.plug = plugName;
        Event.event = "Turn On";
        Event.time = Date.now();
        Events.push(Event);
    });

    router.get('/RemovePerson/:plug', function (req,res) {
        var plugId = req.params.plug;
        var plugName = 'plug' + plugId + '.local';
        if(Persons.length === 0){
            res.status(200).send("Nao ha ninguem na lista");
        }else{
            var indiceX;
            var indiceY;
            for(var i = 0; i < Persons.length; i++){
                var availablePlugs = Persons[i].plugs;
                var validation = 0;
                for(var j = 0; j < availablePlugs.length; j++){
                    if(availablePlugs[j] === plugName){
                        indiceX = i;
                        indiceY = j;
                        validation = 1;
                    }
                }
            }
            if(validation){
                var Event = {};
                Event.id = Persons[indiceX].id;
                Event.plug = plugName;
                Event.event = "Turn Off";
                Event.time = Date.now();
                Events.push(Event);
                var plugs = Persons[indiceX].plugs;
                plugs.splice(indiceY,1);
                if(plugs.length == 0){
                    Persons.splice(indiceX,1);
                }else{
                    Persons[indiceX].plugs = plugs;
                    res.status(200).send("Removida!");
                }
            }else{
                res.status(200).send("Nao existe essa plug");
            }
        }
    });

    router.get('/Events/:id', function (req,res) {
        var Id = req.params.id;
        if(Events.length === 0){
            res.status(200).send("Nao ha eventos na lista");
        }else{
            var IdEvent = [];
            for(var i = 0; i < Events.length; i++){
                if(Events[i].id === Id){
                    IdEvent.push(Events[i]);
                }
            }
            if(IdEvent.length === 0){
                res.status(200).send("Nao existe eventos com esse id");
            }else{
                res.status(200).send(IdEvent);
            }
        }
    });

    router.get('/Events', function (req,res) {
        if(Events.length === 0){
            res.status(200).send("Nao ha eventos na lista");
        }else{
            res.status(200).send(Events);
        }
    });

    router.get('/Persons', function (req,res) {
        if(Persons.length == 0){
            res.status(200).send("Nao há pessoas a utilizar");
        }else{
            res.status(200).send(Persons);
        }
    });

    router.get('/Demo3/:numero',function (req,res)  {
        var NumeroPlugs = req.params.numero;
        var leds = [];
        if (plugs.activePlugs.length > 0) {
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                stopLeds(plugs.activePlugs[i]);
                var velocity = 200;
                if(NumeroPlugs > 3){
                    NumeroPlugs = 3;
                }
                var difference = 12 / NumeroPlugs;
                var led = {};
                if(NumeroPlugs > 0){
                    led.position = 0;
                    led.red = 0;
                    led.green = 0;
                    led.blue = 255;
                    led.orientation = 1;
                    leds.push(led);
                    if(NumeroPlugs > 1){
                        led = {};
                        led.position = difference;
                        led.red = 255;
                        led.green = 255;
                        led.blue = 255;
                        led.orientation = 1;
                        leds.push(led);
                        if(NumeroPlugs > 2){
                            led = {};
                            led.position = 2*difference;
                            led.red = 255;
                            led.green = 0;
                            led.blue = 0;
                            led.orientation = 1;
                            leds.push(led);
                        }
                    }
                }
                var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
                if (plugs.activePlugs[i].socketVariable) {
                    var initialization = initializeLeds(plugs.activePlugs[i], initconfigs, leds, false);
                    if (initialization.status !== 200) {
                        res.status(initialization.status).send(initialization.send);
                        break;
                    }
                }
            }
            initialMovementStarted = true;
            res.status(200).send("DEMO3");
        } else {
            //The request should be ignored no socket is on
            res.status(500).send("There are no sockets available");
        }
    });

    /**
     * Returns an array with all the LEDs turned on on the given plug
     */
    router.get('/:plugid(\\d+)', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        if (plugs.activePlugs.length > 0) {
            var selectedPlug = plugs.getPlug(plugName);
            console.log(selectedPlug.leds);
            if (selectedPlug.leds !== undefined) {
                var leds = calculatePosition(selectedPlug);
                res.json(leds);
            }
            else {
                res.json("The plug has no leds turned on");
            }
        } else {
            res.json("The Plug is disconnected .");
        }
    });

    /**
     * Changes Relay State of the plug
     */
    router.get('/:plugid/relay/:on', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var relayState = parseInt(req.params.on);
        ActualRelay = relayState;
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changeRelayState', {"relayState": relayState});
                    plugState.relayState = relayState;
                    res.Status(200).send("I just send ChangeRelayState to edison and she didnt reply. So rude.");
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    router.get('/ScheduleMode', function (req, res) {
        if (plugs.activePlugs.length > 0) {
            var difference = plugs.LED_NUM/plugs.activePlugs.length;
            for (var i = 0; i < plugs.activePlugs.length; i++) {
                stopLeds(plugs.activePlugs[i]);
                var velocity = 200;
                var leds = [{}];

                //leds[0].position = (Math.floor(Math.random() * 12) + 6) % 12; This can't ensure that every single plug will have a different initial position

                leds[0].position = initial_led_position % plugs.LED_NUM;
                initial_led_position += difference;

                //This ensure that each plug will rotate to different sides and starts in different positions
                if (i % 2 === 0) { // Odd or even
                    leds[0].orientation = 1;//Math.floor(Math.random() * 2) + 1;
                } else {
                    leds[0].orientation = 2;
                }
                randomizeColor(leds[0]);

                var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
                if (plugs.activePlugs[i].socketVariable) {
                    var initialization = initializeLeds(plugs.activePlugs[i], initconfigs, leds, false);
                    if (initialization.status !== 200) {
                        res.status(initialization.status).send(initialization.send);
                        break;
                    }
                }
            }
            initialMovementStarted = true;
            res.sendStatus(200);
        } else {
            //The request should be ignored no socket is on
            res.status(500).send("There are no sockets available");
        }
    });

    /**
     * Changes Orientation
     * NOT USED RIGHT NOW
     */
    /*router.post('/:plugid/orientation', function (req, res) {
     var plugId = req.params.plugid;
     var plugName = 'plug' + plugId + '.local';
     var orientation = parseInt(req.body.orientation);
     try {
     var plugState = plugs.getPlug(plugName);
     if(plugState) {
     if (plugState.socketVariable.connected) {
     plugState.socketVariable.emit('changeOrientation', {"orientation": orientation});
     plugState.orientation = orientation;
     plugState.initTime = Date.now() / 1000;
     res.sendStatus(200);
     } else {
     res.status(500).send("Websocket not open");
     }
     } else {
     res.status(404).send("The selected plug does not exist")
     }
     }
     catch (ex) {
     res.status(500).send(ex);
     }
 });*/

    /**
     * Changes Person Near
     */
    router.post('/:plugid/personNear', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var personNear = parseInt(req.body.personNear);
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changePersonNear', {"personNear": personNear});
                    plugState.personNear = personNear;
                    console.log("Value for person near" + personNear);
                    res.sendStatus(200);
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Changes Velocity
     */
    router.get('/:plugid/delay/:value', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        //var delay = parseInt(req.body.delay);
        var value = req.params.value;
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                if (plugState.socketVariable.connected) {
                    plugState.socketVariable.emit('changeDelay', {"delay": value});
                    plugState.delay = value;
                    res.status(200).send("WORK!!!" + value);
                } else {
                    res.status(500).send("Websocket not open");
                }
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Initializes LEDs with the configurations present in post parameters
     */
    router.post('/:plugid/', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        var initConfigs = plugs.initConfig(req.body.leds, req.body.velocity, ActualRelay);
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                var initialization = initializeLeds(plugState, initConfigs, req.body.leds, false);
                res.status(initialization.status).send(initialization.message);
            } else {
                res.status(404).send("The selected plug does not exist")
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });

    /**
     * Stop LEDs
     */
    router.post('/:plugid/stopLeds', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                var stopResult = stopLeds(plugState);
                res.status(stopResult.status).send(stopResult.message);
            } else {
                res.status(404).send("The selected plug does not exist");
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });
    /**
     * Get to Stop LEDs (added by Filipe to simplify the android implementation
     */
    router.get('/:plugid/stopLeds', function (req, res) {
        var plugId = req.params.plugid;
        var plugName = 'plug' + plugId + '.local';
        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState) {
                var stopResult = stopLeds(plugState);
                res.status(stopResult.status).send(stopResult.message);
            } else {
                res.status(404).send("The selected plug does not exist");
            }
        }
        catch (ex) {
            res.status(500).send(ex);
        }
    });


    /**
     * Used when a plug is selected
     * Turns off all other plugs LEDs and randomly starts a movement of leds in the selected plug
     */
    router.get('/:plugId/selected/', function (req,res) {
        var plugId = req.params.plugId;
        var plugName = 'plug' + plugId + '.local';
        var plugState = plugs.getPlug(plugName);
        if(plugState) {
            if (initialMovementStarted) {
                initialMovementStarted = false;
                var numLedSpinRight = 0;
                var numLedSpinLeft = 0;
                var localLedStandartPosition = Math.floor(Math.random() * 12);
                console.log("Initial Position is: " + localLedStandartPosition);
                plugs.activePlugs.forEach(function (element, index) {
                    stopLeds(element);
                    if (element.name === "plug" + plugId + ".local") {
                        var velocity = default_velocity;
                        leds = [];
                        for (i = 0; i < num_targets; i++) {
                            led = {};
                            led.position = localLedStandartPosition % 12;
                            led.orientation = Math.floor(Math.random() * 2) + 1;
                            randomizeColorStudy(led,i);

                            if (led.orientation === 1) {
                                numLedSpinRight += 1;
                                //Avoid Overlaping Leds
                                for(k  = 0; k < leds.length; k++){
                                    if((leds[k].position === led.position && leds[k].orientation === led.orientation )){
                                        led.orientation = 2;
                                        numLedSpinLeft += 1;
                                        numLedSpinRight -= 1;
                                    }
                                }
                                //Num targets excedded?
                                if (numLedSpinRight > Math.ceil(num_targets/2)) {
                                    led.orientation = 2;
                                    numLedSpinRight -= 1;
                                    numLedSpinLeft += 1;
                                }
                            } else if (led.orientation === 2) {
                                numLedSpinLeft +=1;
                                for(k  = 0; k < leds.length; k++){
                                    if((leds[k].position === led.position && leds[k].orientation === led.orientation )){
                                        led.orientation = 1;
                                        numLedSpinRight += 1;
                                        numLedSpinLeft -= 1;
                                    }
                                }
                                if (numLedSpinLeft > Math.ceil(num_targets/2)) {
                                    led.orientation = 1;
                                    numLedSpinRight += 1;
                                    numLedSpinLeft -= 1;
                                }
                            }
                            leds.push(led);
                            localLedStandartPosition += 4;
                        }
                        var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
                        initializeLeds(element, initconfigs, leds, true);
                    }
                });
                res.status(200).send("Plug initialized with " + num_targets + " targets.");
            } else {
                res.status(500).send("You can't select a socket without starting them first. Go to /plug/start.")
            }
        } else {
            res.status(404).send("The selected plug does not exist");
        }
    });

    /**
     * Turns all the LEDs to the color of the selected LED
     */
    router.get('/:plugId/selected/:ledId', function (req, res) {
        var plugId = req.params.plugId;
        var plugName = 'plug' + plugId + '.local';
        var ledId = req.params.ledId;

        try {
            var plugState = plugs.getPlug(plugName);
            if (plugState.selected) {
                var returnCode = selectedLed(plugState, ledId);
                res.status(returnCode.status).send(returnCode.message);
            } else {
                res.status(500).send("You're trying to access a plug that is not selected");
            }
        }
        catch (ex) {
            res.status(500).send(ex);

        }

    });

    router.get('/:plugId/refresh', function (req, res) {
        //res.status(200).send("Refreshing the plug");
        var plugId = req.params.plugId;
        var plugName = 'plug' + plugId + '.local'
        //var plugState = plugs.getPlug(plugName);
        var result = '';
        var selected_element;
        plugs.activePlugs.forEach(function (element, index) {
            selected_element = element;

        });

        //stopLeds(selected_element);
        initialMovementStarted = false;
        var numLedSpinRight = 0;
        var numLedSpinLeft = 0;
        var localLedStandartPosition = Math.floor(Math.random() * 12);
        //res.status(200).send(result);

        if (selected_element.name === "plug" + plugId + ".local") {
            var velocity = default_velocity;
            leds = [];
            for (i = 0; i < num_targets; i++) {
                led = {};
                led.position = localLedStandartPosition % 12;
                led.orientation = Math.floor(Math.random() * 2) + 1;
                randomizeColorStudy(led, i);

                if (led.orientation === 1) {
                    numLedSpinRight += 1;
                    //Avoid Overlaping Leds
                    for (k = 0; k < leds.length; k++) {
                        if ((leds[k].position === led.position && leds[k].orientation === led.orientation )) {
                            led.orientation = 2;
                            numLedSpinLeft += 1;
                            numLedSpinRight -= 1;
                        }
                    }
                    //Num targets excedded?
                    if (numLedSpinRight > Math.ceil(num_targets / 2)) {
                        led.orientation = 2;
                        numLedSpinRight -= 1;
                        numLedSpinLeft += 1;
                    }
                } else if (led.orientation === 2) {
                    numLedSpinLeft += 1;
                    for (k = 0; k < leds.length; k++) {
                        if ((leds[k].position === led.position && leds[k].orientation === led.orientation )) {
                            led.orientation = 1;
                            numLedSpinRight += 1;
                            numLedSpinLeft -= 1;
                        }
                    }
                    if (numLedSpinLeft > Math.ceil(num_targets / 2)) {
                        led.orientation = 1;
                        numLedSpinRight += 1;
                        numLedSpinLeft -= 1;
                    }
                }
                leds.push(led);
                localLedStandartPosition += 4;
            }
            var initconfigs = plugs.initConfig(leds, velocity, ActualRelay);
            var returnCode = refreshLeds(selected_element, initconfigs, leds, true);
            res.status(returnCode.status).send(returnCode.message);
        }
        res.status(500).send("Error refreshing the leds, the plug is on?");

    });


    /**
     * Add a new fake plug
     * FOR TEST PURPOSES ONLY
     */
   /* router.get('/new', function (req, res) {
     var plugName = "plug" + plugs.activePlugs.length + ".local";
     var plugObject = {name:plugName,connected:true};
     console.log("The length before adding" + plugs.activePlugs.length);
     socket_io.emit("new_plug", plugObject);
     plugs.activePlugs.push(plugObject);
     console.log("The length after adding " + plugs.activePlugs.length);
     res.sendStatus(200);
 }); */

    return router; 

    /**
     * Initializes the plug LEDs with the given configurations
     * @param plugState an Object with all the plug information
     * @param initConfigs configs to be sent to the plug
     * @param leds  array of leds that is going to be turned on
     * @param isSelected (boolean) true if the plug the plug is now selected
     * @returns {*} with status code and message
     */
    function initializeLeds(plugState, initConfigs, leds, isSelected) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('initConfig', initConfigs);         //Send startUp Data
            Object.assign(plugState, plugState, initConfigs);
            plugState.selected = isSelected;
            plugState.initTime = Date.now() / 1000;
            plugState.lastRequest = Date.now() / 1000;
            plugState.leds = leds;
            return {status: 200, message: "Plug initialized with " + leds.length + " targets."}
        } else {
            return {status: 500, message: "WebSocket is not Open"};
        }
    }

    function SelectedLeds(plugState, initConfigs, leds, isSelected) {
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('selectedLeds', initConfigs);         //Send startUp Data
            Object.assign(plugState, plugState, initConfigs);
            plugState.selected = isSelected;
            plugState.initTime = Date.now() / 1000;
            plugState.lastRequest = Date.now() / 1000;
            plugState.leds = leds;
            return {status: 200, message: "Plug initialized with " + leds.length + " targets."}
        } else {
            return {status: 500, message: "WebSocket is not Open"};
        }
    }

    function refreshLeds(plugState, configs, leds, isSelected) {
        if (plugState.socketVariable.connected) {
            if (Date.now() / 1000 - plugState.lastRequest < timeThresholdToIgnoreRequests) {
                return {status: 200, message: "Ignoring Requests"};
            } else {
                stopLeds(plugState);
                plugState.socketVariable.emit('initConfig', configs);         //Send startUp Data
                Object.assign(plugState, plugState, configs);
                plugState.selected = isSelected;
                plugState.initTime = Date.now() / 1000;
                plugState.lastRequest = Date.now() / 1000;
                plugState.leds = leds;
            }

            return {status: 200, message: "Plug initialized with " + leds.length + " targets."}
        } else {
            return {status: 500, message: "WebSocket is not Open"};
        }
    }

    /**
     * Stops the led movements
     * @param plugState
     * @returns {*}
     */
    function stopLeds(plugState) {
        multiTarget = true;    	
        if (plugState.socketVariable.connected) {
            plugState.socketVariable.emit('stop', {"stop": true});
            delete plugState.leds;
            return {status: 200, message: "OK"};
        } else {
            return {status: 500, message: "WebSocket is not Open"};
        }
    }

    /**
     * Handles the the event of selecting on LED
     * @param plugState
     * @param ledId
     * @returns {*}
     */
    function selectedLed(plugState, ledId) {
        if (ledId > num_targets) {
            return {status: 404, message: "The selected Led does not exist."};
        }
        if (Date.now() / 1000 - plugState.lastRequest < timeThresholdToIgnoreRequests) {
            return {status: 200, message: "Ignoring Requests"};
        } else {
            if (plugState.socketVariable.connected) {
                plugState.socketVariable.emit('selected', {"led": ledId});
                plugState.lastRequest = Date.now() / 1000;
                return {status: 200, message: "OK"};
            } else {
                return {status: 500, message: "WebSocket is not Open"};
            }
        }
    }

    function Randomize(led,indice) {
        if(indice === 0){
            led.red == 0;
            led.green = 0;
            led.blue = 255;
        }
        if(indice === 1){
            led.red = 0;
            led.green = 255;
            led.blue = 0;
        }
        if(indice === 2){
            led.red = 255;
            led.green = 0;
            led.blue = 0;
        }
        if(indice === 3){
            led.red = 255;
            led.green = 255;
            led.blue = 0;
        }
        if(indice === 4){
            led.red = 255;
            led.green = 0;
            led.blue = 255;
        }
        if(indice === 5) {
            led.red = 0;
            led.green = 255;
            led.blue = 255;
        }
    }

    /**
     * Select the color to be used on the LED
     * @param led
     */
    function randomizeColor(led) {
        var color = default_colors_study[actual_color_position % default_colors.length];
        actual_color_position++;
        led.red = color.red;
        led.green = color.green;
        led.blue = color.blue;
    }

    /**
     * Select the color to be used on the LED
     * @param led
     */
    function randomizeColorStudy(led, pos) {
        var color = default_colors_study[pos];
        actual_color_position++;
        led.red = color.red;
        led.green = color.green;
        led.blue = color.blue;
    }

    function reviewRenewEnergy(renew_energy_value, plugState) {
        if (renew_energy_value >= 26) {
            plugState.delay = 300;
            default_velocity = 300;
        } else if (renew_energy_value >= 24) {
            plugState.delay = 290;
            default_velocity = 290;
        } else if (renew_energy_value >= 22) {
            plugState.delay = 280;
            default_velocity = 280;
        } else if (renew_energy_value >= 20) {
            plugState.delay = 270;
            default_velocity = 270;
        } else if (renew_energy_value >= 18) {
            plugState.delay = 260;
            default_velocity = 260;
        } else if (renew_energy_value >= 16) {
            plugState.delay = 240;
            default_velocity = 240;
        } else if (renew_energy_value >= 14) {
            plugState.delay = 230;
            default_velocity = 230;
        } else if (renew_energy_value >= 12) {
            plugState.delay = 220;
            default_velocity = 220;
        } else if (renew_energy_value >= 10) {
            plugState.delay = 210;
            default_velocity = 210;
        } else if (renew_energy_value >= 8) {
            plugState.delay = 200;
            default_velocity = 200;
        } else if (renew_energy_value >= 6) {
            plugState.delay = 190;
            default_velocity = 190;
        } else if (renew_energy_value >= 4) {
            plugState.delay = 180;
            default_velocity = 180;
        } else if (renew_energy_value >= 2) {
            plugState.delay = 170;
            default_velocity = 170;
        } else {
            plugState.delay = 160;
            default_velocity = 160;
        }
    }

    function renewableEnergyColor(led, renew_energy_value) {
        if (renew_energy_value >= 26) {
            led.red = 0;
            led.green = 255;
            led.blue = 0;
        } else if (renew_energy_value >= 24) {
            led.red = 30;
            led.green = 255;
            led.blue = 30;
        } else if (renew_energy_value >= 22) {
            led.red = 60;
            led.green = 255;
            led.blue = 60;
        } else if (renew_energy_value >= 20) {
            led.red = 90;
            led.green = 255;
            led.blue = 90;
        } else if (renew_energy_value >= 18) {
            led.red = 120;
            led.green = 255;
            led.blue = 120;
        } else if (renew_energy_value >= 16) {
            led.red = 150;
            led.green = 255;
            led.blue = 150;
        } else if (renew_energy_value >= 14) {
            led.red = 180;
            led.green = 255;
            led.blue = 180;
        } else if (renew_energy_value >= 12) {
            led.red = 210;
            led.green = 255;
            led.blue = 210;
        } else if (renew_energy_value >= 10) {
            led.red = 255;
            led.green = 210;
            led.blue = 210;
        } else if (renew_energy_value >= 8) {
            led.red = 255;
            led.green = 168;
            led.blue = 168;
        } else if (renew_energy_value >= 6) {
            led.red = 255;
            led.green = 126;
            led.blue = 126;
        } else if (renew_energy_value >= 4) {
            led.red = 255;
            led.green = 84;
            led.blue = 84;
        } else if (renew_energy_value >= 2) {
            led.red = 255;
            led.green = 42;
            led.blue = 42;
        } else {
            led.red = 255;
            led.green = 0;
            led.blue = 0;
        }
    }

    /**
     * Simulates and calculates the actual position of the LEDs using the elapsed time.
     * @param selectedPlug
     * @returns {Array}
     */
    function calculatePosition(selectedPlug) {
        var velocity = selectedPlug.delay;
        var initTime = selectedPlug.initTime * 1000; //conversion to seconds
        var leds = [];
        var firstLEDPosition = parseInt(selectedPlug.leds[0].position);
        selectedPlug.leds.forEach(function (result, index) {
            var offset = result.position - firstLEDPosition;
            var baseActualPosition = 0;
            if (result.orientation == 1) {
                baseActualPosition = Math.floor(((Date.now() - initTime) % (velocity * plugs.LED_NUM )) / (velocity));
            }
            else {
                baseActualPosition = (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity) === 0) ? 0 : (plugs.LED_NUM - (Math.floor(((Date.now() - initTime) % (velocity * 12)) / velocity)));
            }
            var actualPosition = (firstLEDPosition + offset + baseActualPosition) % plugs.LED_NUM;
            leds.push({
                'position': actualPosition,
                'velocity': parseInt(velocity),
                'orientation': parseInt(result.orientation),
                'red': parseInt(result.red),
                'green': parseInt(result.green),
                'blue': parseInt(result.blue)
            })

        });
        return leds;
    }
};
