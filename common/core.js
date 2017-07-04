(function ($, win, undefined) {
    //"use strict";

    var shield = win.shield = win.shield || {},
		extend = $.extend,
        grep = $.grep,
        proxy = $.proxy,
        userAgent = navigator.userAgent,
        doc = document,

        SHIELD = "shield",
        SHIELD_WIDGET = "shieldWidget",
		OBJECT = "object",
		STRING = "string",
		FUNCTION = "function",
        ARRAY = "array",
        NUMBER = "number",
        DATE = "date",
        BOOLEAN = "boolean",
        NULL = "null",
        UNDEFINED = "undefined",
        SUI_VC_TOP = "sui-vc-top",
        NOOP = function () {},

        idCounter = 100,
        instanceIdCounter = 1000,

        support = {},
        getCache = {},
        setCache = {},

		/** Base class that implements prototypal inheritance. */
		Class = function () { },

		// some globally-used constants
		Constants = {
			SVG_NS: "http://www.w3.org/2000/svg",
            XHTML_NS: "http://www.w3.org/1999/xhtml",

			KeyCode: {
				BACK: 8,
				TAB: 9,
				ENTER: 13,
				CTRL: 17,
				ESC: 27,
				SPACE: 32,
				PAGEUP: 33,
				PAGEDOWN: 34,
                END: 35,
                HOME: 36,
				LEFT: 37,
				UP: 38,
				RIGHT: 39,
				DOWN: 40,
                DEL: 46
			}
		};

    /**
	* Create a derived class with the provided properties and methods. The 'init' function,
	* if provided, becomes the constructor of the new class.
	* @param {Object} proto The object defining the properties and methods of the derived class.
	*/
    Class.extend = function (proto) {
        var that = this,
			subclass = proto && proto.init ? proto.init : function () {
			    //create a default constructor if one is not provided
			    that.apply(this, arguments);
			},
			fn,
			key,
			value,
			valueType;

        var BaseClass = function (){};
        BaseClass.prototype = that.prototype;
        fn = subclass.fn = subclass.prototype = new BaseClass();

        //copy properties and methods to the derived class prototype
        for (key in proto) {
            if (proto.hasOwnProperty(key)) {
                value = proto[key];
                valueType = type(value);

                //if value is an object, create a new object by merging base prototype and defined object.
                if (value && typeof value === OBJECT) {
                    fn[key] = extend(true, valueType === ARRAY ? [] : {}, that.prototype[key], value);
                }
                else {
                    fn[key] = value;
                }
            }
        }

        fn.constructor = subclass;
        subclass.extend = that.extend;

        return subclass;
    };

    /**
    * Convert a number in its base-26 string representation
    */
    function toBase26(num) {
        var str = "",
            rem;

        num = Math.abs(num);

        do {
            rem = num % 26;
            str = String.fromCharCode((rem + 97 /*'a'*/)) + str;
            num = (num - rem) / 26;
        } while (num > 0);

        return str;
    }

    /**
    * Get a unique string ID.
    */
    function strid() {
        return SHIELD + toBase26(idCounter++);
    }

    // returns a unique intance id
    function iid() {
        return instanceIdCounter++;
    }

    /**
    * Get an RFC4122-compliant globally unique identifier.
    */
    function guid() {
        var r = [8, 9, "a", "b"],
	        s = function () {
	            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	        };

        return s() + s() + "-" + s() + "-4" + s().substr(0, 3) + "-" + r[Math.floor(Math.random() * 4)] + s().substr(0, 3) + "-" + s() + s() + s();
    }

    /**
	* Parse a string to date 
	* @param {String} value The date value as string
	* @param {Array} formats The format strings
	*/
    function parseDate(value, formats) {
        if (typeof(Globalize) === FUNCTION && typeof(Globalize.format) === FUNCTION) {
            return Globalize.parseDate(value, formats);
        }
        else {
            return new Date(value);
        }
    }

    /**
    * Parse a string to number
    * @param {String} value The value string
    * Returns null if the value cannot be parsed to a number
    */
    function parseNumber(value) {
        var num;

        if (is.defined(value) && typeof(Globalize) === FUNCTION && typeof(Globalize.parseFloat) === FUNCTION) {
            num = Globalize.parseFloat(value);
        }
        else {
            num = Number(value);
        }

        return isNaN(num) ? null : num;
    }

    /**
	* Format a string with arbitrary number of placeholders in the form {0}, {1}, etc.
	* @param {String} fmt The format string
	* @param {...Object} args The arguments to replace placeholders with
	*/
    function formatString(fmt) {
        // if fmt is null or empty, return empty string
        if (!is.defined(fmt) || fmt === "") {
            return "";
        }

        var regex = /\{([\.\d\w\:\-\/\' \[\]]+)\}/g,
			args = arguments,
			ex = args && (args.length > 1) && typeof (args[1]) === OBJECT,
			globalizeOn = typeof (Globalize) === FUNCTION && typeof (Globalize.format) === FUNCTION;

        return fmt.replace(regex, function (match, value) {
            var realValue,
				formatSuffix,
				_i = value.indexOf(':');

            // split value to format argument (e.g: 0 or aa.xx.yy) 
            // and an optional formatSuffix (e.g: n1, c0 or yyyy)
            if (_i > 0) {
                var _origValue = value;
                value = _origValue.substring(0, _i);
                formatSuffix = _origValue.substring(_i + 1);
            }

            if (ex) {
                // format not a dict as the first parameter, so 
                // format placeholders are supposed to be in the 
                // property format - e.g: data.value
                if (!/^\d+$/.test(value)) {
                    // {xxx.yyy} or {xxx} or {xxx[1].zz}
                    realValue = get(args[1], value);
                }
                else {
                    // normal format - placeholders are numbers
                    realValue = args[parseInt(value, 10) + 1];
                }
            }
            else {
                // normal format - placeholders are numbers
                realValue = args[parseInt(value, 10) + 1];
            }

            // if there is a formatSuffix and we have Globalize loaded, format it
            if (formatSuffix && globalizeOn) {
                realValue = Globalize.format(realValue, formatSuffix);
            }

            return realValue;
        });
    }

    /**
    * Format string or a function
    */
    function format(fmt) {
        /*jshint validthis:true */
        if (is.func(fmt)) {
            // fmt is a function - remove the first element of the arguments 
            // and call the function with the rest of it
            var args = [].slice.call(arguments);
            args.shift();
            return fmt.apply(this, args);
        }
        else {
            // fmt is a format string
            return formatString.apply(this, arguments);
        }
    }

    /**
    * Returns the calendar info (days and months strings) taken from the current
    * Globalize.js culture or default english ones
    */
    function getCalendarInfo() {
        if (typeof(Globalize) === FUNCTION && Globalize.cultures && Globalize.cultures[Globalize.cultureSelector] && Globalize.cultures[Globalize.cultureSelector].calendar) {
            // take that from globalize and current set culture
            return Globalize.cultures[Globalize.cultureSelector].calendar;
        }
        else {
            // return english strings in the same structure as if returned by Globalize
            return {
                days: {
                    // full day names
                    names: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
                    // abbreviated day names
                    namesAbbr: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
                    // shortest day names
                    namesShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ]
                },
				firstDay: 0,
                months: {
                    // full month names (13 months for lunar calendards -- 13th month should be "" if not lunar)
                    names: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "" ],
                    // abbreviated month names
                    namesAbbr: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "" ]
                }
            };
        }
    }

    /**
    * Returns the currency info (symbol, fraction and thousand separator, etc) from the current
    * Globalize.js culture or default english ones
    */
    function getCurrencyInfo() {
        if (typeof(Globalize) === FUNCTION && Globalize.cultures && Globalize.cultures[Globalize.cultureSelector] && Globalize.cultures[Globalize.cultureSelector].numberFormat) {
            // take the currency info from the currently set culture in globalize
            return Globalize.cultures[Globalize.cultureSelector].numberFormat.currency;
        }
        else {
            // return english currency info as defined in Globalize
            return {
                // [negativePattern, positivePattern]
                //   negativePattern: one of "($n)|-$n|$-n|$n-|(n$)|-n$|n-$|n$-|-n $|-$ n|n $-|$ n-|$ -n|n- $|($ n)|(n $)"
                //   positivePattern: one of "$n|n$|$ n|n $"
                pattern: [ "($n)", "$n" ],
                // number of decimal places normally shown
                decimals: 2,
                // array of numbers indicating the size of each number group.
                // TODO: more detailed description and example
                groupSizes: [ 3 ],
                // string that separates number groups, as in 1,000,000
                ",": ",",
                // string that separates a number from the fractional portion, as in 1.99
                ".": ".",
                // symbol used to represent currency
                symbol: "$"
            };
        }
    }

    /**
    * Log (if possible) and optionally raise an error.
    * @param {String} msg The message of the error
    * @param {Boolean} stop The object which controls is the message will be shown into the console or exception will be thrown
    */
    function error(msg, die) {
        die = die !== undefined ? die : shield.dieOnError;

        if (die) {
            throw new Error(msg);
        }
        else if (win.console) {
            if (win.console.error) {
                console.error(msg);
            }
            else {
                console.log(msg);
            }
        }
    }

    /**
    * Get the type of an object as a string.
    * @param {Object} obj The object whose type to retrieve.
    */
    function type(obj) {
        var str = Object.prototype.toString.call(obj);
        return obj === null ? "null" : obj === undefined ? "undefined" : str.substr(8, str.length - 9).toLowerCase()
    }

    /*
    * Make a deep clone of an object, but copy instances of specified constructors.
    * @param {Array} constr An array containing constructors. The method will not clone, but copy instances of these constructors recursively.
    * @param {Object} to The target object that will receive the cloned members.
    * @param {...Object} args The objects to clone and add to the target object.
    */
    function extendWithCopy(constr) {
        var args = Array.apply(null, arguments),
            hasConstr = is.array(constr) && constr.length &&                        //constr is non-empty array
                !grep(constr, function (con) { return !is.func(con); }).length,   //all constr items are constructor functions
            to = args[1],
            from, 
            i,
            key, 
            target, 
            value,
            isInstanceOfFunc = function(obj, inst) { return obj instanceof inst; };

        if (!hasConstr) {
            return extend.apply($, args);
        }

        if (!is.object(to) && !is.array(to)) {
            to = {};
        }

        for (i = 2; i < args.length; i++) {
            from = args[i];

            if (from) {
                for (key in from) {
                    if (from.hasOwnProperty(key)) {
                        value = from[key];
                        target = to[key];

                        if (value && grep(constr, proxy(isInstanceOfFunc, null, value)).length) {
                            to[key] = value;
                        }
                        else if (is.object(value) || is.array(value)) {
                            if (!is.object(target)) {
                                target = to[key] = is.array(value) ? [] : {};
                            }

                            to[key] = extendWithCopy(constr, target, value);
                        }
                        else if (is.date(value)) {
                            to[key] = new Date(value.getTime());
                        }
                        else if (value !== undefined) {
                            to[key] = value;
                        }
                    }
                }
            }
        }

        return to;
    }

    /**
    * Get the names of the provided object's own properties.
    * @param {Object} obj The object whose property keys to get.
    */
    function keys (obj) {
        var ret = [],
            key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                ret.push(key);
            }
        }

        return ret;
    }

    /**
    * Get a value from an object by specified path.
    * @param {Object} obj The Object to search in.
    * @param {String} path The path of the value to retrieve.
    */
    function get(obj, path) {
        var cached;

        if (!is.string(path)) {
            throw new Error("shield.get: parameter 'path' must be a string.");
        }

        path = normalizePath(path);
        cached = getCache[path];
        
        if (cached) {
            return cached(obj);
        }
        else {
            try {
                /*jslint evil: true */
                cached = new Function("a", "try{return a" + path + "}catch(e){return arguments[1];}");
            }
            catch(e) {
                throw new Error("shield.get: invalid 'path' parameter");
            }
        }

        getCache[path] = cached;

        return cached(obj);
    }

    /**
    * Set a value to an object by specified path.
    * @param {Object} obj The Object to search in.
    * @param {String} path The path of the value to set.
    * @param {Object} value The value to set.
    */
    function set(obj, path, value) {
        var cached;

        if (!is.string(path)) {
            throw new Error("shield.set: parameter 'path' must be a string");
        }
        
        path = normalizePath(path);
        cached = setCache[path];

        if (cached) {
            return cached(obj, value);
        }

        try {
            /*jslint evil: true */
            cached = new Function("obj,val", "obj" + path + "=val;");
        }
        catch (e) {
            throw new Error("shield.set: invalid 'path' parameter");
        }

        setCache[path] = cached;

        cached(obj, value);

        return obj;
    }

    function normalizePath(path) {
        var parts = path.split("."),
            index,
            i, 
            len, 
            part, 
            quot;

        for (i = 0, len = parts.length; i < len; i++) {
            part = parts[i];
            index = part.indexOf("[");

            if (!part) {
                continue;
            }

            if (index < 0) {
                quot = part.indexOf("'") < 0 ? "'" : '"';
                part = parts[i] = "[" + quot + part + quot + "]";
            }
            else if (index > 0) {
                part = parts[i] = "." + part;
            }
        }

        return parts.join("");
    }

    // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
    if (!Date.prototype.toISOString) {
        (function () {
            function pad(number) {
                var r = String(number);
                if (r.length === 1) {
                    r = '0' + r;
                }
                return r;
            }

            Date.prototype.toISOString = function () {
                return this.getUTCFullYear() +
                    '-' + pad(this.getUTCMonth() + 1) +
                    '-' + pad(this.getUTCDate()) +
                    'T' + pad(this.getUTCHours()) +
                    ':' + pad(this.getUTCMinutes()) +
                    ':' + pad(this.getUTCSeconds()) +
                    '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) +
                    'Z';
            };
        }());
    }

    /**
	* Base event dispatcher implementing common functionality for un/registering and triggering events.
	* @param {Object} options The initialization options for the dispatcher
	*/
    var Dispatcher = Class.extend({
        init: function (options) {
            var that = this,
                events = (options || {}).events,
                key;

            that.events = {};

            options = options || {};

            for (key in events) {
                if (typeof events[key] === FUNCTION) {
                    that.on(key, events[key]);
                }
            }
        },

        /**
        * Bind an event handler to an event
        * @param {String} eventName The event name or an array of events
        * @param {Function} handler The event handler or an object containing event names as keys and handlers as values
        */
        on: function (eventName, handler, one) {
            var that = this,
                events = that.events,
                eventNames = to.array(eventName),
                handlerFunc = is.func(handler),
                eventType,
                current,
                i, 
                len, 
                key;

            if (is.object(eventName)) {
                eventNames = [];

                for (key in eventName) {
                    if (eventName.hasOwnProperty(key)) {
                        eventNames.push(key);
                    }
                }

                handlerFunc = false;
                handler = eventName;
            }

            for (i = 0, len = eventNames.length; i < len; i++) {
                eventName = eventNames[i];
                eventType = that._eventType(eventName);
                current = handlerFunc ? handler : handler[eventName];

                if (is.func(current)) {
                    if (one) {
                        current = that._one(eventName, current);
                    }
                    (events[eventType] || (events[eventType] = [])).push({
                        name: eventName,
                        handler: current
                    });
                }
            }

            // return this so that we can chain
            return that;
        },

        // builds and returns a one handler function
        _one: function(eventName, handler) {
            var that = this,
                oneHandler = function () {
                    that.off(eventName, oneHandler);
                    handler.apply(this, arguments);
                };

            return oneHandler;
        },

        // gets the event type from its name (strips any namespaces)
        _eventType: function(eventName) {
            var pos = (eventName += "").indexOf(".");
            return pos > -1 ? eventName.substring(0, pos) : eventName;
        },

        // checks whether eventName matches the event name and all namespaces of eventNameB
        // NOTE: assumes eventName will be a fully-qualified event of the form: type.ns1.ns2.etc...
        _eventNameMatch: function(eventNameA, eventNameB) {
            var that = this,
                eventTypeA = that._eventType(eventNameA),
                eventTypeB = that._eventType(eventNameB),
                eventANS,
                eventBNS,
                foundNS,
                i;

            eventNameA += "";
            eventNameB += "";

            // the second event does not have a type - its a namespace only - starts with dot, 
            // or if the event types match, check whether all namespaces found in event B are present in A
            if (eventTypeA === eventTypeB || !eventTypeB) {
                eventANS = eventNameA.split('.');
                eventANS.shift();
                eventANS = grep(eventANS, function(item) {
                    return is.string(item) && item.length > 0;
                });

                eventBNS = eventNameB.split('.');
                if (eventTypeB) {
                    eventBNS.shift();
                }
                eventBNS = grep(eventBNS, function(item) {
                    return is.string(item) && item.length > 0;
                });

                if (eventANS && eventBNS) {
                    foundNS = 0;

                    for (i=0; i<eventBNS.length; i++) {
                        if ($.inArray(eventBNS[i], eventANS) > -1) {
                            foundNS++;
                        }
                    }

                    return foundNS >= eventBNS.length;
                }
            }

            return false;
        },

        /**
        * Bind an event handler to an event that will be called only once
        * @param {String} eventName The event name or an array of events
        * @param {Function} handler The event handler or an array of handlers        
        */
        one: function (eventName, handler) {
            this.on(eventName, handler, true);
        },

        /**
        * Unbind an event handler from an event
        * @param {String} eventName The event name or an array of events
        * @param {Function} handler The event handler or an array of handlers        
        */
        off: function (eventName, handler) {
            var that = this,
                events = that.events,
                eventNames = to.array(eventName),
                handlerFunc = is.func(handler),
                eventType,
                handlers,
                current,
                found,
                i,
                j,
                key;

            if (is.object(eventName)) {
                eventNames = [];

                for (key in eventName) {
                    if (eventName.hasOwnProperty(key)) {
                        eventNames.push(key);
                    }
                }

                handlerFunc = false;
                handler = eventName;
            }

            // if eventName is a string and contains only namespaces (starts with a dot),
            // iterate through all events
            if (is.string(eventName) && eventName.indexOf(".") === 0) {
                for (eventType in events) {
                    if (events.hasOwnProperty(eventType)) {
                        handlers = events[eventType] || [];
                        current = handlerFunc ? handler : handler || undefined;

                        for (j = handlers.length - 1; j >= 0; j--) {
                            if (that._eventNameMatch(handlers[j].name, eventName) && (!is.defined(current) || handlers[j].handler === current)) {
                                handlers.splice(j, 1);
                            }
                        }

                        if (!handlers.length) {
                            delete events[eventType];
                        }
                    }
                }
            }
            else {
                for (i = 0; i < eventNames.length; i++) {
                    eventName = eventNames[i];
                    eventType = that._eventType(eventName);
                    handlers = events[eventType] || [];
                    current = handlerFunc ? handler : (handler || {})[eventName];

                    for (j = handlers.length - 1; j >= 0; j--) {
                        if (that._eventNameMatch(handlers[j].name, eventName) && (!is.defined(current) || handlers[j].handler === current)) {
                            handlers.splice(j, 1);
                        }
                    }

                    if (!handlers.length) {
                        delete events[eventType];
                    }
                }
            }

            // return this so that we can chain
            return that;
        },

        /**
        * Trigger an event
        * @param {String} eventName The event name
        * @param {...Object} args The event argument to pass to the registered event handlers
        */
        trigger: function (eventName, args) {
            var that = this,
                eventType = that._eventType(eventName),
                handlers = (that.events[eventType] || []).slice(),
	            i,
                len;

            for (i = 0, len = handlers.length; i < len; i++) {
                handlers[i].handler.apply(that, [].slice.call(arguments, 1));
            }

            return args;
        },

        /**
        * Remove all attached event handler from this dispatcher
        */
        destroy: function () {
            this.events = {};
        }
    });

    /**
	* Base class for all UI Events.
	* @param {Object} options The initialization options for the events object
	*/
    var Event = Class.extend({
        init: function (options) {
            var prevented = false,
                stopped = false;

            extend(this, {
                timeStamp: new Date().getTime(),
                isDefaultPrevented: function () { return prevented; },
                isPropagationStopped: function () { return stopped; },
                preventDefault: function () { prevented = true; },
                stopPropagation: function () { stopped = true; }
            }, options);
        }
    });

    /**
	* Base class for all UI widgets.
	* @param {HTMLElement} element. The host HTML element associated with this widget
	* @param {Object} options. The initialization options for the widget
	*/
    var Widget = Dispatcher.extend({
        init: function (element, options) {
            var that = this,
		        constr = that.constructor;

            options = options || {};

            //wrap element in jQuery
            that.element = $(element);

            //WARNING: deprecated. Use that.options instead
            that.initialOptions = options;
            
            //deep clone defaults and theme properties, if any
            that.options = extend(true, {}, constr.defaults, (constr.themes || {})[options.theme], options);

            // generate and save the instance id
            that._iid = iid();
            
            Dispatcher.fn.init.call(that, options);
        },

        /**
        * Returns a unique identifier for this instance
        */
        getInstanceId: function() {
            return this._iid;
        },

        /**
        * Remove all attached event handler from this dispatcher
        * @param {Object} options Optional. Additional options to merge to current options before refresh
        */
        refresh: function (options) {
            this.refreshWithElement(this.element, options);
        },

        /**
        * protected method
        */
        refreshWithElement: function(element, options) {
            var that = this,
                _options = extendWithCopy([Class], that.options, options);

            that.destroy();
            that.init(element, _options);
        },

        /**
        * protected method
        * Hide the widget
        */
        hide: function() {
            $(this.element).hide();
        },

        /**
        * protected method
        * Show the widget
        */
        show: function() {
            $(this.element).show();
        },

        /**
        * protected method
        * Is widget visible
        */
        isVisible: function() {
            return $(this.element).is(":visible");
        },

        /**
        * Public getter / setter for widget visibility
        * @param {Boolean} visible. Optional visibility to set
        */
        visible: function() {
            var that = this,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                if (!!args[0]) {
                    that.show();
                }
                else {
                    that.hide();
                }
            }
            else {
                return that.isVisible();
            }
        },

        /** 
        * Public method for setting the focus to the element.
        * Override in a widget implementation if needed
        */
        focus: function() {
            $(this.element).focus();
        },

        /**
        * Trigger an event
        * @param {String} eventName The event name
        * @param {Object} args The event argument to pass to the registered event handlers
        * @param {Function} defaultFunctions The function to call at the end of the event chain, if the event is not previously canceled.
        */
        trigger: function (eventName, args, defaultFunction) {
            var that = this,
                evt;

            args = is.event(args) ? { domEvent: args } : args;

            if (args && args.domEvent && !(args.domEvent instanceof $.Event)) {
                args.domEvent = $.Event(args.domEvent);
            }

            evt = new Event(extend({ type: eventName, target: that }, args));
                
            Dispatcher.fn.trigger.call(that, eventName, evt);

            if (typeof defaultFunction === FUNCTION && !evt.isDefaultPrevented()) {
                defaultFunction.call(that, evt);
            }

            return evt;
        }
    });


    // VirtualizedContainer class - a class for a virtualized container
    var VirtualizedContainer = Dispatcher.extend({
        options: {
            total: 0,
            pageBuffer: 2,
            createContainer: NOOP,
            getItems: NOOP,
            eventNS: ".shieldVirtualized",
            skipRender: false
        },

        // class constructor
        init: function (element, options) {
            var that = this;
            options = that.options = extend({}, that.options, options);
            that.element = $(element);

            Dispatcher.fn.init.call(that, options);

            // render the first page(s) unless specified not to
            if (!options.skipRender) {
                that.render();
            }
        },

        // initialize the elements
        _elements: function () {
            var that = this,
                element = that.element,
                options = that.options,
                wrapper,
                container;

            wrapper = that.wrapper = element
                .off(options.eventNS)
                .empty()
                .css({
                    overflow: "auto",
                    position: "relative"
                })
                .on("scroll" + options.eventNS, proxy(that.scroll, that))
                .append('<div class="sui-virtualized"/>')
                .find(".sui-virtualized")
                .css({
                    position: "relative",
                    overflow: "visible"
                });

            container = that.container = $(options.createContainer(wrapper));

            wrapper.children().css({
                position: "absolute",
                top: 0
            });

            that._positionedContainer = wrapper.children().first();
        },

        // get various dimensions
        _dimensions: function () {
            var that = this,
                options = that.options,
                total = options.total,
                itemHeight = options.itemHeight,
                totalHeight = Math.min(total * itemHeight, shield.support.maxElementHeight),
                viewportHeight = that.element.height(),
                itemsPerPage = Math.ceil(viewportHeight / itemHeight),
                pageHeight = itemsPerPage * itemHeight,
                totalScrollableHeight = totalHeight - viewportHeight;

            return {
                total: total,
                itemHeight: itemHeight,
                totalHeight: totalHeight,
                viewportHeight: viewportHeight,
                itemsPerPage: itemsPerPage,
                pageHeight: pageHeight,
                totalScrollableHeight: totalScrollableHeight
            };
        },

        // render the virtualized container
        render: function () {
            var that = this,
                element = that.element,
                options = that.options,
                dims;

            that._elements();

            that.prevScroll = 0;

            dims = that.dimensions = that._dimensions();

            element.find(".sui-virtualized").height(dims.totalHeight);

            that._renderItems(0, Math.min(options.total, (options.pageBuffer + 1) * dims.itemsPerPage));
        },

        // renders the items with index start to end
        // calls the "done" (if any) handler when all items have been appended to the container
        _renderItems: function (start, end, done) {
            var that = this;

            that.options.getItems(start, end, function (itemsArray, emptyContainer) {
                var i,
                    len = itemsArray.length;

                // empty the container unless specifically forbidden
                emptyContainer = is.defined(emptyContainer) ? !!emptyContainer : true;
                if (emptyContainer) {
                    that.container.empty();
                }

                for (i = 0; i < len; i++) {
                    that.container.append(itemsArray[i]);
                }

                if (done) {
                    done();
                }
            });
        },

        // called on wrapper scroll event
        scroll: function () {
            var that = this,
                options = that.options,
                pageBuffer = options.pageBuffer,
                dims = that.dimensions,
                scroll = that.element.scrollTop(),
                prevScroll = that.prevScroll,
                diff = scroll - prevScroll,
                pos = scroll / dims.totalScrollableHeight,
                //positionedContainer = that.wrapper.children().first(),
                positionedContainer = that._positionedContainer,
                // WARNING: instead of taking the current top from the element,
                // take it from the data field where we will have saved it;
                //currentTop = parseFloat(positionedContainer.css("top")) || 0,
                currentTop = positionedContainer.data(SUI_VC_TOP) || 0,
                top = scroll - pos * (dims.pageHeight - dims.viewportHeight),
                overflowBottom = diff > 0 && (top - currentTop) > ((pageBuffer / 4 + 1) * dims.pageHeight),
                overflowTop = diff < 0 && (top - currentTop) <= pageBuffer / 4 * dims.pageHeight,
                start, 
                visibleStart, 
                end;

            if (overflowTop || overflowBottom) {
                visibleStart = Math.min(dims.total, Math.floor((pos * dims.total) - (pos * dims.itemsPerPage)));
                start = Math.max(0, visibleStart - (pageBuffer / 2 * dims.itemsPerPage));
                end = Math.min(dims.total, start + ((pageBuffer + 1) * dims.itemsPerPage));
                top = Math.max(0, top - ((visibleStart - start) * dims.itemHeight));

                // renders the items with index start to end, 
                // and adjusts the scroll position
                that._renderItems(start, end, function () {
                    positionedContainer.css("top", top);

                    // WARNING: save the top in a data field because the browser 
                    // might not support that much of a height for elements
                    positionedContainer.data(SUI_VC_TOP, top);
                });
            }

            that.prevScroll = scroll;
        },

        scrollTop: function(value) {
            var that = this,
                element = that.element;

            if (is.defined(value)) {
                element.scrollTop(value);
            }
            else {
                return element.scrollTop();
            }
        },

        // class destructor
        destroy: function () {
            var that = this,
                options = that.options;

            that.element.off(options.eventNS);
            that.element = null;

            options.createContainer = NOOP;
            options.getItems = NOOP;

            Dispatcher.fn.destroy.call(that);
        }
    });


    function getSwidgets(elements, name) {
        var widgets = [],
            length = $(elements).length,
            dataSelector = name ? (SHIELD_WIDGET + "-" + name) : SHIELD_WIDGET,
            widget,
            i;

        for (i=0; i<length; i++) {
            widget = $($(elements)[i]).data(dataSelector);
            if (widget) {
                widgets.push(widget);
            }
        }

        return widgets;
    }

    /**
	* Retrieve the widget instance associated with the set of matched elements. 
	* If multiple elements are provided, retrieve an array of all widgets associated with them.
	*/
    $.fn.swidget = function (name) {
        var widgets = getSwidgets(this, name);

        // if called for more than one element, return array, otherwise just return one object
        return widgets.length ? (widgets.length > 1 ? widgets : widgets[0]) : null;
    };

    /**
	* Retrieve all widget instances associated with the set of matched elements. 
    * Returns a list
	*/
    $.fn.swidgets = function(name) {
        return getSwidgets(this, name);
    };

    /*
	* Create a jQuery plugin from a widget class.
	* @param {String} name The name of the plugin. The created jQuery plugin will be named shield[name]
	* @param {Object} widget The widget constructor.
	*/
    function plugin(name, WidgetClass) {
        shield.ui[name] = WidgetClass;

        // extend jQuery.fn with the plugin name, e.g. $("#div1").shieldChart({...});
        $.fn[SHIELD + name] = function (options) {
            var ret = this,
                args;

            if (typeof options === STRING) {
                // the first param to the plugin constructor is a string - 
                // treat this as a function name that must be executed for the instance,
                // passing the rest of the arguments as params to that function
                args = [].slice.call(arguments, 1);

                this.each(function () {
                    var instance = $(this).data(SHIELD_WIDGET),
                        method,
                        result;

                    if (!instance) {
                        throw new Error(format("shield: cannot call method '{0}' on uninitialized {1}.", options, name));
                    }

                    method = instance[options];

                    if (typeof method !== FUNCTION) {
                        throw new Error(format("shield: cannot find method '{0}' of {1}", options, name));
                    }

                    // call the method with the provided arguments
                    result = method.apply(instance, args);

                    // if there's any result, break from the $.each() iteration and return the result from the plugin() function
                    if (result !== undefined) {
                        ret = result;
                        return false;
                    }
                });

                return ret;
            }
            else {
                // in the rest of the cases, construct the plugin as normal
                return this.each(function () {
                    // construct an instance of the widget
                    var instance = new WidgetClass(this, options);

                    // store a reference to the instance in the element's .data,
                    // overwriting all previous ones
                    $(this).data(SHIELD_WIDGET, instance);
                    $(this).data(SHIELD_WIDGET + "-" + name, instance);
                });
            }
        }
    }


    var is = {
        /** Checks whether the value is a string */
        string: function (obj) { return type(obj) === STRING; },

        /** Checks whether the value is a number */
        number: function (obj) { return type(obj) === NUMBER; },

        /** Checks whether the value is an integer */
        integer: function (obj) {
            return type(obj) === NUMBER && /^[\+\-]?\d+$/.test(obj + "");
        },

        /** Checks whether the value is a float */
        "float": function (obj) {
            return type(obj) === NUMBER && /^[\+\-]?\d+\.\d+$/.test(obj + "");
        },

        /** Checks whether the value is a function */
        func: function (obj) { return type(obj) === FUNCTION; },

        /** Checks whether the value is an object */
        object: function (obj) { return type(obj) === OBJECT; },

        /** Checks whether the value is an array */
        array: function (obj) { return type(obj) === ARRAY; },

        /** Checks whether the value is a date */
        date: function (obj) { return type(obj) === DATE; },

        /** Checks whether the value is a boolean */
        "boolean": function (obj) { return type(obj) === BOOLEAN; },

        /** Checks whether the value is null */
        "null": function (obj) { return type(obj) === NULL },

        /** Checks whether the value is undefined */
        "undefined": function (obj) { return type(obj) === UNDEFINED; },

        /** Checks whether the value is different from null or undefined */
        defined: function (obj) { return obj !== undefined && obj !== null },

        /** Checks whether the value is an Event instance */
        event: function (obj) {
			return (typeof win.Event == FUNCTION && obj instanceof win.Event) || (obj && obj.altKey !== undefined);
        }
    };

    var to = {
        /** Parse a value as an integer with the specified radix
        * @param {Object} val The value to parse
        * @param {Number} rad The radix. Defaults to 10 
        */
        "int": function (val, rad) {
            return parseInt(val, rad || 10);
        },

        /** Parse a value as a floating-point number
        * @param {Object} val The value to parse
        */
        "float": function (val) {
            return parseFloat(val);
        },

        /** Convert a string to number. Returns null if invalid
        * @param {Object} val The value to parse
        */
        number: function (val) {
            // make sure val is a string
            return parseNumber(val + "");
        },

        /** Wrap an object into an array if it's not already an array instance
        * @param {Object} obj The object to wrap
        */
        array: function (obj) {
            return obj instanceof Array ? obj : obj !== undefined ? [obj] : [];
        },

        /** Convert an object into a string
        * @param {Object} val The value to convert
        */
        string: function (val) { return val + ""; },

        /** Convert an object into a string key that can be used as a field name
        * @param {Object} val The value to convert
        */
        key: function (val) {
            var valueType = type(val),
                ownKeys,
                parts,
                i,
                len;

            switch (valueType) {
                case NULL:
                case UNDEFINED:
                    return valueType;

                case OBJECT:
                    ownKeys = keys(val).sort();
                    parts = [];

                    $.each(ownKeys, function (i, key) {
                        parts.push(key + ":" + to.key(val[key]));
                    });

                    return "{" + parts.join(",") + "}";

                case ARRAY:
                    parts = "[";

                    for (i = 0, len = val.length; i < len; i++) {
                        parts += to.key(val[i]);
                        if (i < len - 1) {
                            parts += ",";
                        }
                    }

                    parts += "]";

                    return parts;

                case DATE:
                    return val.toISOString();

                /*
                case STRING:
                case NUMBER:
                case BOOLEAN:
                case FUNCTION:
                */
                default:
                    return val + "";
            }
        }
    };

    //detect supported features
    (function () {
        //Reference: https://gist.github.com/leeoniya/5816476
        support.stableSort = (function () {
            // test if js engine's Array#sort implementation is stable
            var str = "abcdefghijklmnopqrstuvwxyz";
            return str.split("").sort(function (a, b) {
                return ~~(str.indexOf(b) / 2.3) - ~~(str.indexOf(a) / 2.3);
            }).join("") == "xyzvwtursopqmnklhijfgdeabc";
        })();

        support.scrollbar = function () {
            var div = doc.createElement("div"),
                result;

            div.style.cssText = "overflow:scroll;overflow-x:hidden;zoom:1;clear:both";
            div.innerHTML = "&nbsp;";
            doc.body.appendChild(div);

            result = div.offsetWidth - div.scrollWidth;

            doc.body.removeChild(div);
            return result;
        };

        support.isRtl = function (element) {
            return $(element).closest(".sui-rtl").length > 0;
        };

        support.transitions = (function () {
            var style = (doc.body || doc.documentElement).style,
                prop = "Transition",
                pref = ['Moz', 'webkit', 'Webkit', 'Khtml', 'O', 'ms'],
                i;

            if (is.string(style[prop.toLowerCase()])) {
                return true;
            }

            for (i = 0; i < pref.length; i++) {
                if (is.string(style[pref[i] + prop])) {
                    return true;
                }
            }

            return false;
        })();

        support.hasScrollbarY = function(element) {
            var el = $(element).get(0);
            return el.scrollHeight > el.clientHeight;
        };

        support.hasScrollbarX = function(element) {
            var el = $(element).get(0);
            return el.scrollWidth > el.clientWidth;
        };
    })();

    (function () {
        // requestAnimationFrame replacement        
        shield.rAF = function (callback) {
            return (win.requestAnimationFrame ||
                win.webkitRequestAnimationFrame ||
                win.mozRequestAnimationFrame ||
                function (callback) {
                    return this.setTimeout(callback, 1000 / 60);
                }).call(win, callback);
        }

        shield.cAF = function (id) {
            return (win.cancelAnimationFrame || win.clearTimeout)(id);
        };
    }());


    (function () {
        var msie = /MSIE/i.test(userAgent),
            trident = /Trident/i.test(userAgent),
            firefox = /Firefox/i.test(userAgent),
            opera = /Opera/i.test(userAgent),
            safari = /Safari/i.test(userAgent),
            chrome = /Chrome/i.test(userAgent),
            mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        support.browser = {
            ie: msie || trident,
            firefox: firefox,
            opera: opera,
            safari: !chrome && safari,
            chrome: chrome,
            mobile: mobile,
            
            version: msie ? parseInt(userAgent.substr(userAgent.indexOf("MSIE ") + 5), 10) :
                (trident ? parseInt(userAgent.substr(userAgent.indexOf("rv:") + 3), 10) : 
                (firefox ? parseInt(userAgent.substr(userAgent.indexOf("Firefox/") + 8), 10) : 
                (opera ? parseInt(userAgent.substr(userAgent.indexOf("Version/") + 8), 10) :
                (chrome ? parseInt(userAgent.substr(userAgent.indexOf("Chrome/") + 7), 10) :
                (safari ? parseInt(userAgent.substr(userAgent.indexOf("Version/") + 8), 10) : 0)))))
        };
    })();

    $(function () {
        //detect maximum supported element height
        var inc = 1000000,
            //maxTested = support.browser.firefox ? 6000000 : 1000000000,
            maxTested = 1000000000,
            elem = $('<div style="display:none;"/>').appendTo(doc.body),
            current, 
            height = inc;

        while (true) {
            current = height + inc;
            elem.css("height", current);

            if (current > maxTested || elem.height() !== current) {
                break;
            }
            else {
                height = current;
            }
        }

        elem.remove();

        support.maxElementHeight = height;
    });

    function selection(enabled) {
        if (enabled) {
            if (doc.onselectstart == selection.handler) {
                doc.onselectstart = selection.onselectstart;
                doc.ondragstart = selection.ondragstart;
            }
        }
        else {
            if (doc.onselectstart != selection.handler) {
                selection.onselectstart = doc.onselectstart;
                selection.ondragstart = doc.ondragstart;

                doc.onselectstart = doc.ondragstart = selection.handler;
            }
        }
    }

    selection.handler = function () {
        return false;
    }

    extend(shield, {
        Class: Class,
        Dispatcher: Dispatcher,
        Event: Event,
		Constants: Constants,
		format: format,
        formatString: formatString,
		parseDate: parseDate,
        getCalendarInfo: getCalendarInfo,
        getCurrencyInfo: getCurrencyInfo,
        error: error,
        dieOnError: true,
        iid: iid,
        strid: strid,
        guid: guid,
        support: support,
        extend: extendWithCopy,
        selection: selection,
        type: type,
        is: is,
        to: to,
        keys: keys,
        get: get,
        set: set,
        // extend shield.ui in a way that old shield.ui properties will be 
        // preserved, in case someone loads the core.js multiple times
        ui: extend(
            {}, 
            shield.ui || {}, 
            {
                Widget: Widget,
                VirtualizedContainer: VirtualizedContainer,
                plugin: plugin
            }
        )
    });

})(jQuery, this);