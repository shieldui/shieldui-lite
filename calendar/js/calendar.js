(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        shieldFormat = shield.format,
        shieldParseDate = shield.parseDate,
		doc = document,
        isFunc = shield.is.func,
        is = shield.is,
        proxy = $.proxy,
        userAgent = navigator.userAgent,
		isOpera = win.opera,
		isIE = /msie/i.test(userAgent) && !isOpera,
        isIE8 = isIE && doc.documentMode === 8,
        extend = $.extend,
        isUndefined = is["undefined"],
        isString = is.string,

		// widgets stuff
        MONTH = "month",
        YEAR = "year",
        DECADE = "decade",
        CENTURY = "century",
        CLICK = "click",
        MOUSEDOWN = "mousedown",
        KEYPRESS = "keypress",
        FOCUS = "focus",
        SELECTSTART = "selectstart",
        SELECT = "select",
        CHANGE = "change",
        VIEWCHANGE = "viewChange",
        DEPTHCHANGE = "depthChange",
        OPEN = "open",
        CLOSE = "close",
        BLUR = "blur",
        DISPLAY = "display",
        NONE = "none",

        calendarDefaults, Calendar,
        datePickerDefaults, DatePicker,
        MonthYearPicker, monthYearPickerDefaults,
        TimePicker, timePickerDefaults,
        DateTimePicker, dateTimePickerDefaults;


    /////////////////////////////////////////////////////////
    // Calendar Widget
    // calendar settings
    calendarDefaults = {
        enabled: true, // whether the calendar is enabled or not
        readOnly: false, // whether the calendar is readonly or not
        hover: true, // whether the calendar's cell has hovered style
        footer: { // Configuration section which contains settings for the footer
            enabled: true, // whether the calendar's footer is shown
            footerTemlpate: "Today" // footer template
        },
        min: new Date(1900, 0, 1), // the minimum date, which the calendar can show
        max: new Date(2099, 11, 31), // the maximum date, which the calendar can show
        value: UNDEFINED, // The currently selected date 
        focused: new Date(), // The currently focused date. Default value is today date
        labels: { // Configuration section which contains tooltip text for the previous and next buttons
            previous: "Previous", // Tooltip text for the previous button
            next: "Next" // Tooltip text for the next button
        },
        view: { // Configuration section which contains settings for the calendar views
            depth: MONTH, // Specifies the navigation depth. Can be "month", "year", "decade", "century"
            start: MONTH // Specifies the start view ot the calendar.  Can be "month" - hows the days of the month, "year" - shows the months of the year, "decade" - shows the years of the decade, "century" - shows the decades from the century
        },
        dayTemplate: "{day}", // The day template used into month view
        otherMonthDayTemplate: "{day}", // The other month's date template used into month view
        outOfRangeDayTemplate: "&nbsp;", // Specifies the template which will be used for all dates which are out of min/max range
        dateTooltipTemplate: "{date:MM/dd/yyyy}", // Specifies the template which will be used as a tooltip when mouse id over month day - applicable only when "month" view is selected
        events: {
            // change
            // viewChange
            // depthChange 
        }
    };
    // Public methods:
    //  visible()/visible(bool)
    //  enabled()/enabled(bool) 
    //  focused()/focused(date, [viewDepth]) - the view is optional and can be "month", "year", "decade", "century" 
    //  previous() 
    //  next() 
    //  view()/ view(name) - get or change "month", "year", "decade", "century" views 
    //  value()/ value(date) 

    var detectCSSFeature = function (featurename) {
        var feature = false,
            domPrefixes = 'Webkit Moz ms O'.split(' '),
            elm = doc.createElement('div'),
            featurenameCapital = null;

        featurename = featurename.toLowerCase();

        if (elm.style[featurename]) {
            feature = true; 
        }

        if (feature === false) {
            featurenameCapital = featurename.charAt(0).toUpperCase() + featurename.substr(1);
            for (var i = 0; i < domPrefixes.length; i++) {
                if (elm.style[domPrefixes[i] + featurenameCapital] !== undefined) {
                    feature = true;
                    break;
                }
            }
        }

        return feature;
    };

    var TimePickerPopup = Class.extend({
        init: function (options) {
            var self = this,
                listBox = options.listbox,
                min = options.min,
                max = options.max,
                interval = options.interval,
                parent = options.parent,
                textTemplate = options.textTemplate;

            if (shield.ui.ListBox) {
                if (is.object(listBox) && listBox instanceof shield.ui.ListBox) {
                    parent.listBox = listBox;
                }
                else {
                    parent._listBoxWrapper = $("<div style='display: none;' />").appendTo(doc.body);
                    var dataSourceOpts = self._populateDataSource(min, max, interval);

                    parent.listBox = new shield.ui.ListBox(parent._listBoxWrapper, extend({}, listBox, {
                        dataSource: {
                            data: dataSourceOpts
                        },
                        multiple: false,
                        textTemplate: textTemplate,
                        width: parent._wrapper.innerWidth(),
                        maxHeight: 200
                    }));

                    if (parent._wrapper.parent().hasClass("sui-rtl")) {
                        parent.listBox.element.parent().addClass("sui-rtl");
                    }
                    else {
                        parent.listBox.element.parent().css(DISPLAY, NONE);
                    }

                }
                parent._shouldShowPopup = true;
            }
        },

        _populateDataSource: function (min, max, interval) {
            var list = [],
                minTime,
                maxTime;

            if (max <= min) {
                max = new Date(min.getFullYear(), min.getMonth(), min.getDate() + 1, max.getHours(), max.getMinutes(), max.getSeconds());
            }
            else {
                max = new Date(min.getFullYear(), min.getMonth(), min.getDate(), max.getHours(), max.getMinutes(), max.getSeconds());

                if (max.getTime() == min.getTime()) {
                    max = new Date(min.getFullYear(), min.getMonth(), min.getDate() + 1, max.getHours(), max.getMinutes(), max.getSeconds());
                }
            }

            minTime = min.getTime();
            maxTime = max.getTime();

            while (minTime < maxTime) {
                list.push(new Date(minTime));
                minTime += interval * 60 * 1000;
            }

            return list;
        },

        destroy: function () {
            var self = this,
                listBox = self.listBox;

            if (self.listBox) {
                self.listBox.destroy();
                self.listBox = null;
            }
        }
    });

    // Calendar class
    Calendar = Widget.extend({
        // initialization method, called by the framework
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
                element = $(self.element),
				options = self.options,
                cls = options.cls,
                selectedDate = options.value;

            element.addClass("sui-calendar" + (cls ? (' ' + cls) : ''));

            self._focusedDate = options.focused;
            self._view = options.view.start;
            self._enabled = options.enabled;

            if (selectedDate) {
                // make sure any specified date is an object
                if (isString(selectedDate)) {
                    selectedDate = new Date(selectedDate);
                }
                self._focusedDate = self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            }

            self._initializeHeader();

            self._render();

            if (options.footer.enabled) {
                self._initializeFooter();
            }

            if (!options.readOnly && options.enabled) {
                element.find(".sui-prev").on(CLICK, self._movePrev = proxy(self._movePrevHandler, self));
                element.find(".sui-next").on(CLICK, self._moveNext = proxy(self._moveNextHandler, self));
                element.find(".sui-text").on(CLICK, self._changeViewDepth = proxy(self._changeViewDepthHandler, self));
                element.find(".sui-footer").on(CLICK, self._selectToday = proxy(self._selectTodayHandler, self));
            }
            else {
                if (options.readOnly) {
                    element.addClass("sui-read-only");
                }
                else {
                    element.addClass("sui-calendar-disabled");
                }
            }

            // hack for IE<10, the older version of IE do not recognize user-select: none; or -ms-user-select: none;
            if (isIE) {
                element.on(SELECTSTART, self._selectStart = function () { return false; });
            }
        },

        _calendarSelectionHandler: function (e) {
            var self = this,
                selectedCell = $(e.target).closest("td"),
                focusedDate = self._focusedDate,
                depth = self.options.view.depth,
                date,
                year;

            if (!selectedCell.length ||
                selectedCell.hasClass("sui-out-of-range") ||
                selectedCell.hasClass("sui-no-hover") ||
                !self._enabled) {
                return;
            }

            self._calendarTable.find(".sui-focused").
               removeClass("sui-focused");

            switch (self._view) {
                case MONTH:
                    {
                        date = new Date(selectedCell.attr("data-value"));

                        var shouldChangeView = self._shouldChangeView(date);
                        var isNext = false;
                        if (date.getTime() > self._focusedDate) {
                            isNext = true;
                        }
                        self._focusedDate = date;
                        self._selectedDate = date;

                        if (shouldChangeView) {
                            self._animationBegins(isNext);
                            self._renderView();

                            self._animationEnds(isNext);

                            self.trigger(VIEWCHANGE);
                        }

                        self._selectDateCell(date);

                        self.trigger(CHANGE);
                    }
                    break;
                case YEAR:
                    {
                        var month = parseInt(selectedCell.attr("data-value"), 10);
                        date = new Date(focusedDate.getFullYear(), month, focusedDate.getDate());
                        if (date.getDate() != focusedDate.getDate()) {
                            date = new Date(focusedDate.getFullYear(), month + 1, 0);
                        }

                        self._focusedDate = date;
                        if (self.options.view.depth == YEAR) {
                            self._selectedDate = date;
                            self._selectDateCell(date);

                            self.trigger(CHANGE);
                        }
                        else {
                            self._view = MONTH;

                            self._viewDepthAnimationBegins();

                            self._renderView();

                            self._viewDepthAnimationEnds();

                            self.trigger(DEPTHCHANGE);
                        }
                    }
                    break;
                case DECADE:
                    {
                        year = parseInt(selectedCell.attr("data-value"), 10);
                        date = new Date(year, focusedDate.getMonth(), focusedDate.getDate());
                        if (date.getDate() != focusedDate.getDate()) {
                            date = new Date(year, focusedDate.getMonth() + 1, 0);
                        }

                        self._focusedDate = date;
                        if (self.options.view.depth == DECADE) {
                            self._selectedDate = date;
                            self._selectDateCell(date);

                            self.trigger(CHANGE);
                        }
                        else {
                            self._view = YEAR;

                            self._viewDepthAnimationBegins();

                            self._renderView();

                            self._viewDepthAnimationEnds();

                            self.trigger(DEPTHCHANGE);
                        }
                    }
                    break;
                case CENTURY:
                    {
                        year = parseInt(selectedCell.attr("data-value"), 10);
                        date = new Date(year, focusedDate.getMonth(), focusedDate.getDate());
                        if (date.getDate() != focusedDate.getDate()) {
                            date = new Date(year, focusedDate.getMonth() + 1, 0);
                        }

                        self._focusedDate = date;
                        if (self.options.view.depth == CENTURY) {
                            self._selectedDate = date;
                            self._selectDateCell(date);

                            self.trigger(CHANGE);
                        }
                        else {
                            self._view = DECADE;

                            self._viewDepthAnimationBegins();

                            self._renderView();

                            self._viewDepthAnimationEnds();

                            self.trigger(DEPTHCHANGE);
                        }
                    }
                    break;
            }
        },

        _shouldChangeView: function (date) {
            var self = this,
                focusedDate = self._focusedDate,
                shouldChangeView = false,
                focusedYear = focusedDate.getFullYear(),
                dateYear = date.getFullYear(),
                start,
                end;

            switch (self._view) {
                case MONTH:
                    {
                        if (dateYear != focusedYear ||
                            date.getMonth() != focusedDate.getMonth()) {
                            shouldChangeView = true;
                        }
                    }
                    break;
                case YEAR:
                    {
                        if (dateYear != focusedYear) {
                            shouldChangeView = true;
                        }
                    }
                    break;
                case DECADE:
                    {
                        start = focusedYear - (focusedYear % 10);
                        end = start + 10;
                        if (dateYear < start ||
                            dateYear > end) {
                            shouldChangeView = true;
                        }
                    }
                    break;
                case CENTURY:
                    {
                        start = focusedYear - (focusedYear % 100);
                        end = start + 100;
                        if (dateYear < start ||
                            dateYear > end) {
                            shouldChangeView = true;
                        }
                    }
                    break;
            }

            return shouldChangeView;
        },

        _selectTodayHandler: function () {
            var self = this,
                date = new Date(),
                shouldChangeView = self._shouldChangeView(date),
                isNext = false;

            if (!self._enabled) {
                return;
            }
            
            var currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            if (currentDate.getTime() > self._focusedDate) {
                isNext = true;
            }

            self._selectedDate = self._focusedDate = currentDate;

            if (self._view != self.options.view.depth) {
                self._view = self.options.view.depth;

                self._viewDepthAnimationBegins();

                self._renderView();

                self._viewDepthAnimationEnds();

                self.trigger(DEPTHCHANGE);
            }
            else {
                if (shouldChangeView) {

                    self._animationBegins(isNext);

                    self._renderView();

                    self._animationEnds(isNext);

                    self.trigger(VIEWCHANGE);
                }
                else {
                    self._selectDateCell(self._focusedDate);
                }
            }

            self.trigger(CHANGE);
        },

        _selectDateCell: function (date) {
            var self = this,
                cell = null;

            switch (self._view) {
                case MONTH:
                    {
                        cell = self._calendarTable.find(".sui-date:not('.sui-other-month')").filter(function () {
                            var dataValue = $(this).attr("data-value");
                            var currentDate = new Date(dataValue);

                            return (currentDate.getDate() == date.getDate() && currentDate.getMonth() == date.getMonth() && currentDate.getFullYear() == date.getFullYear());
                        });
                    }
                    break;
                case YEAR:
                    {
                        cell = self._calendarTable.find(".sui-month").filter(function () { return ($(this).attr("data-value") == date.getMonth()); });
                    }
                    break;
                case DECADE:
                    {
                        cell = self._calendarTable.find(".sui-year").filter(function () { return ($(this).attr("data-value") == date.getFullYear()); });
                    }
                    break;
                case CENTURY:
                    {
                        cell = self._calendarTable.find(".sui-years").filter(function () {
                            var dataValue = parseInt($(this).attr("data-value"), 10);

                            return (date.getFullYear() >= dataValue && date.getFullYear() < dataValue + 10);
                        });
                    }
                    break;
            }

            self._calendarTable.find(".sui-selected").
                removeClass("sui-selected");

            cell.addClass("sui-selected");
        },

        _viewDepthAnimationBegins: function () {
            var self = this;

            if (!detectCSSFeature("transition")) {
                self._calendarTable.empty();
                return;
            }

            self._enabled = false;

            var oldTable = self._calendarTable;

            var transitionEnded = false;
            oldTable.bind("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function (e) {
                transitionEnded = self._removeOldTable(oldTable, self);
            });

            setTimeout(function () {
                if (!transitionEnded) {
                    self._removeOldTable(oldTable, self);
                }
            }, 1000);

            oldTable.addClass("sui-fade-in");

            self._renderTable();
        },

        _removeOldTable: function (oldTable, self) {
            oldTable.unbind("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend");
            oldTable.remove();
            self._enabled = true;
            return true;
        },

        _viewDepthAnimationEnds: function () {
            if (!detectCSSFeature("transition")) {
                return;
            }
            this._calendarTable.addClass("sui-scaling");
        },

        _changeViewDepthHandler: function (e) {
            var self = this,
                views = [MONTH, YEAR, DECADE, CENTURY],
                currentViewIndex = jQuery.inArray(self._view, views);
    
            if (currentViewIndex < 3 && self._enabled) {
                self._view = views[currentViewIndex + 1];

                self._viewDepthAnimationBegins();

                self._renderView();

                self._viewDepthAnimationEnds();
            }
        },

        _movePrevMonth: function () {
            var self = this,
                focusedDate = self._focusedDate,
                view = self._view;

            var date = new Date(focusedDate.getFullYear(), focusedDate.getMonth() - 1, focusedDate.getDate());
            if (date.getDate() != focusedDate.getDate()) {
                date = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 0);
            }

            self._focusedDate = date;
        },

        _moveNextMonth: function () {
            var self = this,
                focusedDate = self._focusedDate,
                view = self._view;

            var date = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, focusedDate.getDate());
            if (date.getDate() != focusedDate.getDate()) {
                date = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 2, 0);
            }
            self._focusedDate = date;
        },

        _movePrevYears: function (index) {
            var self = this,
               focusedDate = self._focusedDate,
               view = self._view;

            var date = new Date(focusedDate.getFullYear() - index, focusedDate.getMonth(), focusedDate.getDate());

            if (date.getMonth() != focusedDate.getMonth()) {
                date = new Date(focusedDate.getFullYear() - index, focusedDate.getMonth() + 1, 0);
            }

            self._focusedDate = date;

            self._calendarTable.empty();
        },

        _moveNextYears: function (index) {
            var self = this,
                focusedDate = self._focusedDate,
                view = self._view;

            var date = new Date(focusedDate.getFullYear() + index, focusedDate.getMonth(), focusedDate.getDate());

            if (date.getMonth() != focusedDate.getMonth()) {
                date = new Date(focusedDate.getFullYear() + index, focusedDate.getMonth() + 1, 0);
            }

            self._focusedDate = date;

            self._calendarTable.empty();
        },

        _animationBegins: function (isNext) {
            var self = this,
                sign = "-";

            if (!detectCSSFeature("transition")) {
                self._calendarTable.empty();

                return;
            }

            self._calendarTable.removeClass("sui-scaling");

            self._tableWrapper = $("<div>")
                .insertAfter(self.element.find(".sui-header"));

            self._tableWrapper.width(self.element.width() * 2);

            self.element.find(".sui-calendar-view")
                .appendTo(self._tableWrapper);

            if (self.element.parent().hasClass("sui-rtl")) {
                isNext = !isNext;
                sign = "+";
            }

            self._renderTable(isNext);

            if (!isNext) {
                self._tableWrapper.css("position", "relative");
                self._tableWrapper.css("left", sign + self.element.width() + "px");
            }

            self._tableWrapper
                .addClass("sui-calendar-animation");

            self._enabled = false;
            var transitionEnded = false;

            self._tableWrapper.bind("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend", function (e) {
                transitionEnded = self._removeTempTables(self);
            });

            setTimeout(function () {
                if (!transitionEnded) {
                    self._removeTempTables(self);
                }
            }, 1000);
        },

        _removeTempTables: function (self) {
            self._tempTable.remove();
            self._calendarTable.insertAfter(self.element.find(".sui-header"));
            self._tableWrapper.unbind("webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend");
            self._tableWrapper.remove();
            self._tableWrapper = null;
            self._enabled = true;
            return true;
        },

        _animationEnds: function (isNext) {
            var self = this;

            if (!detectCSSFeature("transition")) {

                return;
            }

            var transpateWidth = self.element.width();
            if (isNext) {
                transpateWidth = transpateWidth * -1;
            }
            self._tableWrapper.css("transform", "translateX(" + transpateWidth + "px)");
        },

        _moveView: function (isNext) {
            var self = this;

            self._animationBegins(isNext);

            switch (self._view) {
                case MONTH:
                    {
                        if (isNext) {
                            self._moveNextMonth();
                        }
                        else {
                            self._movePrevMonth();
                        }

                        self._createMonthView();
                    }
                    break;
                case YEAR:
                    {
                        if (isNext) {
                            self._moveNextYears(1);
                        }
                        else {
                            self._movePrevYears(1);
                        }

                        self._createYearsView();
                    }
                    break;
                case DECADE:
                    {
                        if (isNext) {
                            self._moveNextYears(10);
                        }
                        else {
                            self._movePrevYears(10);
                        }

                        self._createDecadeView();
                    }
                    break;
                case CENTURY:
                    {
                        if (isNext) {
                            self._moveNextYears(100);
                        }
                        else {
                            self._movePrevYears(100);
                        }
                        self._createcenturyView();
                    }
                    break;
            }

            self._animationEnds(isNext);

            self.trigger(VIEWCHANGE);
        },

        _disablePrev: function (disable) {
            var self = this;

            var prev = self.element.find(".sui-prev");
            if (disable) {
                self.preventPrevNavigation = true;
                prev.addClass("sui-calendar-disabled");
            }
            else {
                self.preventPrevNavigation = false;
                prev.removeClass("sui-calendar-disabled");
            }
        },

        _disableNext: function (disable) {
            var self = this;

            var next = self.element.find(".sui-next");
            if (disable) {
                self.preventNextNavigation = true;
                next.addClass("sui-calendar-disabled");
            }
            else {
                self.preventNextNavigation = false;
                next.removeClass("sui-calendar-disabled");
            }
        },

        _movePrevHandler: function () {
            var self = this;

            if (!self.preventPrevNavigation && self._enabled) {
                self._moveView(false);
            }
        },

        _moveNextHandler: function () {
            var self = this;

            if (!self.preventNextNavigation && self._enabled) {
                self._moveView(true);
            }
        },

        _initializeHeader: function () {
            var self = this,
                labels = self.options.labels;

            this._header = $('<div class="sui-header">' +
                                '<span unselectable="on"  title="' + labels.previous + '" class="sui-prev">' +
                                    '<span unselectable="on" class="sui-left-arrow"></span>' +
                                '</span>' +
                                '<span class="sui-text"></span>' +
                                '<span unselectable="on" title="' + labels.next + '" class="sui-next">' +
                                    '<span unselectable="on" class="sui-right-arrow"></span>' +
                                '</span>' +
                            '</div>')
                .appendTo(this.element);
        },

        _renderTable: function (isNext) {
            var self = this,
                options = self.options,
                viewClasses = "sui-calendar-view";

            if (options.hover && options.enabled) {
                viewClasses += " sui-hoverable";
            }

            if (self._calendarTable) {

                self.element.find(".sui-calendar-view").off(CLICK, self._calendarSelection);
                self._calendarSelection = null;

                if (!isNext) {
                    self._tempTable = self.element.find(".sui-calendar-view");
                    self._calendarTable = $("<table />")
                                        .width(self.element.width())
                                        .addClass(viewClasses)
                                        .insertBefore(self._tempTable);
                }
                else {
                    self._tempTable = self.element.find(".sui-calendar-view");

                    self._calendarTable = $("<table />")
                                        .width(self.element.width())
                                        .addClass(viewClasses)
                                        .insertAfter(self._tempTable);
                }
            }
            else {
                self._calendarTable = $("<table />")
                                    .width(self.element.width())
                                    .addClass(viewClasses)
                                    .insertAfter(self.element.find(".sui-header"));
            }

            if (!options.readOnly && options.enabled) {
                self.element.find(".sui-calendar-view").on(CLICK, self._calendarSelection = proxy(self._calendarSelectionHandler, self));
            }
        },

        _render: function () {

            this._renderTable();

            this._renderView();
        },

        _renderView: function () {
            var self = this;

            switch (self._view) {
                case MONTH:
                    self._createMonthView();
                    break;
                case YEAR:
                    self._createYearsView();
                    break;
                case DECADE:
                    self._createDecadeView();
                    break;
                case CENTURY:
                    self._createcenturyView();
                    break;
                default:
                    self._createMonthView();
                    break;
            }
        },

        _initializeFooter: function () {
            var self = this,
                options = self.options,
                footerTemlpate = options.footer.footerTemlpate,
                footerTemplateFunc = isFunc(footerTemlpate) ? footerTemlpate : function (item) {
                    return shieldFormat(footerTemlpate, item);
                };

            $('<div class="sui-footer"><span class="sui-footer-text">' + footerTemplateFunc.call(self, new Date()) + '</span></div>')
            .appendTo(this.element);
        },

        _createMonthView: function () {
            var self = this,
                options = self.options,
                focusedDate = self._focusedDate,
                viewTable = self._calendarTable,
                // take the calendar info now as the user might have changed the culture
                calendarInfo = shield.getCalendarInfo(),
                days = calendarInfo.days,
                firstDayOfWeek = calendarInfo.firstDay,
                months = calendarInfo.months,
                namesShortInitial = days.namesShort,
                namesShort = [],
                namesAbbr = days.namesAbbr,
                names = days.names,
                minDate = options.min,
                maxDate = options.max,
                dayTemplate = options.dayTemplate,
                otherMonthDayTemplate = options.otherMonthDayTemplate,
                dateTooltipTemplate = options.dateTooltipTemplate,
                outOfRangeDayTemplate = options.outOfRangeDayTemplate,
                dayTemplateFunc = isFunc(dayTemplate) ? dayTemplate : function (item) {
                    return shieldFormat(dayTemplate, item);
                },
                otherMonthDayTemplateFunc = isFunc(otherMonthDayTemplate) ? otherMonthDayTemplate : function (item) {
                    return shieldFormat(otherMonthDayTemplate, item);
                },
                dateTooltipTemplateFunc = isFunc(dateTooltipTemplate) ? dateTooltipTemplate : function (item) {
                    return shieldFormat(dateTooltipTemplate, item);
                },
                outOfRangeDayTemplateFunc = isFunc(outOfRangeDayTemplate) ? outOfRangeDayTemplate : function (item) {
                    return shieldFormat(outOfRangeDayTemplate, item);
                };

            var tHead = $('<thead />').appendTo(viewTable);

            var headerRow =
                $('<tr />')
                .addClass("sui-week-header")
                .appendTo(tHead);

            var html = "";
            var i = 0;

            for (i = firstDayOfWeek; i < namesShortInitial.length; i++) {
                namesShort.push(namesShortInitial[i]);
            }

            for (var j = 0; j < firstDayOfWeek; j++) {
                namesShort.push(namesShortInitial[j]);
            }

            for (var z = 0; z < namesShort.length; z++) {
                var dayName = namesShort[z];
                html += "<th scope='col' abbr='" + namesAbbr[z] + "' title='" + names[z] + "'>" + namesShort[z] + "</th>";
            }

            headerRow.html(html);

            var tBody = $('<tbody class="sui-days"/>').appendTo(viewTable),
                year = focusedDate.getFullYear(),
                month = focusedDate.getMonth(),
                firstDay = new Date(year, month, 1).getDay() - firstDayOfWeek,
                lastDay = new Date(year, month + 1, 0).getDay() - firstDayOfWeek,
                totalDays = new Date(year, month + 1, 0).getDate(),
                additionalDays = 7;

            self._header.find(".sui-text").text(months.names[month] + " " + year);

            if (firstDay <= 0) {
                firstDay = 7 - (firstDay === 0 ? 0 : firstDayOfWeek);
                additionalDays = 0;
            }

            var before = (-1 * firstDay) + 1,
                after = (6 - lastDay) + totalDays + additionalDays,
                count = 0,
                row = null,
                rowHtml = "";

            if ((after - before) > 42) {
                after -= 7;
            }
            if ((after - before) < 35) {
                after += 7;
            }

            for (i = before; i <= after; i++) {
                var currentDate = new Date(year, month, i, 0, 0, 0, 0),
                    dateClass = "sui-date",
                    outOfRangeClass = currentDate.getTime() < minDate.getTime() || currentDate.getTime() > maxDate.getTime() ? " sui-out-of-range" : "",
                    otherMonthClass = (i < 1 || i > totalDays) ? " sui-other-month" : "",
                    weekendDayClass = (currentDate.getDay() == 6 || currentDate.getDay() === 0) ? " sui-weekend" : "",
                    focusedDayClass = (!outOfRangeClass && focusedDate.getDate() == i && !otherMonthClass) ? " sui-focused" : "",
                    selectedDayClass = (self._selectedDate && currentDate.getTime() == self._selectedDate.getTime() && !otherMonthClass) ? " sui-selected" : "";

                var dateCellValue = null;
                if (outOfRangeClass) {
                    dateCellValue = outOfRangeDayTemplateFunc.call(self, { date: currentDate, day: currentDate.getDate() });
                    otherMonthClass = "";
                    weekendDayClass = "";
                    focusedDayClass = "";
                    selectedDayClass = "";
                    dateClass = "";
                }
                else if (otherMonthClass) {
                    dateCellValue = otherMonthDayTemplateFunc.call(self, { date: currentDate, day: currentDate.getDate() });
                    if (dateCellValue === "") {
                        otherMonthClass += " sui-no-hover";
                    }
                }
                else {
                    dateCellValue = dayTemplateFunc.call(self, { date: currentDate, day: currentDate.getDate() });
                }

                rowHtml += "<td title='" + dateTooltipTemplateFunc.call(self, { date: currentDate, day: currentDate.getDate() }) + "' data-value='" + currentDate.getFullYear() + "/" + (currentDate.getMonth() + 1) + "/" + currentDate.getDate() +
                    "' class='" + dateClass + otherMonthClass + weekendDayClass + focusedDayClass + selectedDayClass + outOfRangeClass + "'>" + dateCellValue + "</td>";
                count++;
                if (count == 7) {
                    row =
                        $('<tr role="row" />')
                        .appendTo(tBody);

                    row.html(rowHtml);
                    count = 0;
                    rowHtml = "";
                }
            }

            var firstDate = new Date(year, month, 1, 0, 0, 0, 0);
            var lastDate = new Date(year, month + 1, 0);

            if (firstDate.getTime() <= minDate.getTime()) {
                self._disablePrev(true);
            }
            else {
                if (self.element.find(".sui-prev").hasClass("sui-calendar-disabled")) {
                    self._disablePrev(false);
                }
            }
            if (lastDate.getTime() >= maxDate.getTime()) {
                self._disableNext(true);
            }
            else {
                if (self.element.find(".sui-next").hasClass("sui-calendar-disabled")) {
                    self._disableNext(false);
                }
            }
        },

        _createYearsView: function () {
            var self = this,
                options = self.options,
                viewTable = self._calendarTable,
                focusedDate = self._focusedDate,
                calendarInfo = shield.getCalendarInfo(),
                months = calendarInfo.months,
                monthNames = months.names,
                abbrNames = months.namesAbbr,
                tBody = $('<tbody class="sui-months"/>').appendTo(viewTable),
                row = null,
                rowHtml = "",
                minDate = options.min,
                maxDate = options.max,
                selectedClass = "",
                count = 0;

            self._header.find(".sui-text").text(focusedDate.getFullYear());

            for (var i = 0; i < abbrNames.length; i++) {

                var currentDate = new Date(focusedDate.getFullYear(), i, focusedDate.getDate(), 0, 0, 0, 0),
                    focusedMonthClass = (focusedDate.getMonth() == i) ? " sui-focused" : "";

                if (options.view.depth == YEAR) {
                    selectedClass = (self._selectedDate && currentDate.getTime() == self._selectedDate.getTime()) ? " sui-selected" : "";
                }


                var outOfRangeClass = "",
                    montName = monthNames[i],
                    abbrMonthName = abbrNames[i],
                    monthClass = "sui-month";

                if ((currentDate.getFullYear() <= minDate.getFullYear() &&
                    currentDate.getMonth() < minDate.getMonth()) ||
                    (currentDate.getFullYear() >= maxDate.getFullYear() &&
                    currentDate.getMonth() > maxDate.getMonth())) {
                    outOfRangeClass = " sui-out-of-range";
                }

                if (outOfRangeClass) {
                    focusedMonthClass = "";
                    selectedClass = "";
                    montName = abbrMonthName = "&nbsp;";
                    monthClass = "";
                }

                rowHtml += "<td data-value='" + i + "' class='" + monthClass + focusedMonthClass + selectedClass + outOfRangeClass + "' title='" + montName + "'>" + abbrMonthName + "</td>";
                count++;
                if (count == 4) {
                    row =
                        $('<tr />')
                        .appendTo(tBody);

                    row.html(rowHtml);
                    count = 0;
                    rowHtml = "";
                }
            }

            if (focusedDate.getFullYear() <= minDate.getFullYear()) {
                self._disablePrev(true);
            }
            else {
                if (self.element.find(".sui-prev").hasClass("sui-calendar-disabled")) {
                    self._disablePrev(false);
                }
            }

            if (focusedDate.getFullYear() >= maxDate.getFullYear()) {
                self._disableNext(true);
            }
            else {
                if (self.element.find(".sui-next").hasClass("sui-calendar-disabled")) {
                    self._disableNext(false);
                }
            }
        },

        _createDecadeView: function () {
            var self = this,
                options = self.options,
                viewTable = self._calendarTable,
                focusedDate = self._focusedDate,
                year = focusedDate.getFullYear(),
                currentYearIndex = year % 10,
                tBody = $('<tbody class="sui-decade"/>').appendTo(viewTable),
                row = null,
                rowHtml = "",
                count = 0,
                minDate = options.min,
                maxDate = options.max,
                start = year - currentYearIndex - 1,
                selectedClass = "",

                end = year + (10 - currentYearIndex);

            self._header.find(".sui-text").text((start + 1) + "-" + (end - 1));

            for (var i = start; i <= end; i++) {
                var currentDate = new Date(i, focusedDate.getMonth(), focusedDate.getDate(), 0, 0, 0, 0),
                    otherYearClass = (i == start || i == end) ? " sui-other-year" : "",
                    currentFocusedYearClass = year == i ? " sui-focused" : "",
                    outOfRangeClass = "",
                    currentYear = i,
                    yearClass = "sui-year";

                if ((currentDate.getFullYear() < minDate.getFullYear()) ||
                    (currentDate.getFullYear() > maxDate.getFullYear())) {
                    outOfRangeClass = " sui-out-of-range";
                }

                if (options.view.depth == DECADE) {
                    selectedClass = (self._selectedDate && currentDate.getTime() == self._selectedDate.getTime()) ? " sui-selected" : "";
                }

                if (outOfRangeClass) {
                    otherYearClass = "";
                    currentFocusedYearClass = "";
                    selectedClass = "";
                    yearClass = "";
                    currentYear = "&nbsp;";
                }

                rowHtml += "<td data-value='" + currentYear + "' class='" + yearClass + otherYearClass + currentFocusedYearClass + selectedClass + outOfRangeClass + "' title='" + currentYear + "'>" + currentYear + "</td>";
                count++;
                if (count == 4) {
                    row =
                        $('<tr />')
                        .appendTo(tBody);

                    row.html(rowHtml);
                    count = 0;
                    rowHtml = "";
                }
            }

            if (start < minDate.getFullYear()) {
                self._disablePrev(true);
            }
            else {
                if (self.element.find(".sui-prev").hasClass("sui-calendar-disabled")) {
                    self._disablePrev(false);
                }
            }

            if (end > maxDate.getFullYear()) {
                self._disableNext(true);
            }
            else {
                if (self.element.find(".sui-next").hasClass("sui-calendar-disabled")) {
                    self._disableNext(false);
                }
            }
        },

        _createcenturyView: function () {
            var self = this,
                options = self.options,
                viewTable = self._calendarTable,
                focusedDate = self._focusedDate,
                year = focusedDate.getFullYear(),
                currentYearIndex = year % 100,
                tBody = $('<tbody class="sui-decade"/>').appendTo(viewTable),
                row = null,
                rowHtml = "",
                selectedClass = "",
                minDate = options.min,
                maxDate = options.max,
                count = 0,
                currentYear;

            var start = year - currentYearIndex - 10;
            var end = start + 99 + 10 + 2;

            self._header.find(".sui-text").text((start + 10) + "-" + (end - 2));

            for (var i = start; i < end; i += 10) {

                var otherYearClass = (i == start || i == end - 1) ? " sui-other-years" : "",
                    currentDate = new Date(i, focusedDate.getMonth(), focusedDate.getDate(), 0, 0, 0, 0),
                    endDate = new Date(i + 10, focusedDate.getMonth(), focusedDate.getDate(), 0, 0, 0, 0),
                    outOfRangeClass = "",
                    currentFocusedYearsClass = (year >= i && year < i + 10) ? " sui-focused" : "",
                    yearsClass = "sui-years",
                    str = i + " - " + (i + 9),
                    yearsValue = i;

                if ((currentDate.getFullYear() < minDate.getFullYear() && endDate.getFullYear() <= minDate.getFullYear()) ||
                   (currentDate.getFullYear() > maxDate.getFullYear())) {
                    outOfRangeClass = " sui-out-of-range";
                }

                if (options.view.depth == CENTURY) {
                    selectedClass = (self._selectedDate && self._selectedDate.getFullYear() >= currentDate.getFullYear() &&
                        self._selectedDate.getFullYear() < currentDate.getFullYear() + 10) ? " sui-selected" : "";
                }

                if (outOfRangeClass) {
                    otherYearClass = "";
                    currentFocusedYearsClass = "";
                    selectedClass = "";
                    yearsClass = "";
                    currentYear = yearsValue = str = "&nbsp;";
                }

                rowHtml += "<td data-value='" + yearsValue + "' class='" + yearsClass + otherYearClass + currentFocusedYearsClass + selectedClass + outOfRangeClass + "' title='" + str + "'>" + str + "</td>";
                count++;
                if (count == 4) {
                    row =
                        $('<tr />')
                        .appendTo(tBody);

                    row.html(rowHtml);
                    count = 0;
                    rowHtml = "";
                }
            }

            if (start < minDate.getFullYear()) {
                self._disablePrev(true);
            }
            else {
                if (self.element.find(".sui-prev").hasClass("sui-calendar-disabled")) {
                    self._disablePrev(false);
                }
            }

            if (end > maxDate.getFullYear()) {
                self._disableNext(true);
            }
            else {
                if (self.element.find(".sui-next").hasClass("sui-calendar-disabled")) {
                    self._disableNext(false);
                }
            }
        },

        value: function () {
            var self = this,
                options = self.options,
                minDate = options.min,
                maxDate = options.max,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var date = args[0];
                 
                if (date == null || date === "" || isUndefined(date)) {
                    self._selectedDate = null;
                    self._focusedDate = options.focused;
                }
                else {

                    if (date.getTime() < minDate.getTime() ||
                        date.getTime() > maxDate.getTime()) {
                        return;
                    }

                    self._focusedDate = self._selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                }

                self._calendarTable.empty();
                self._renderView();
            }
            else {
                return self._selectedDate;
            }
        },

        enabled: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var enabled = args[0];
                if (enabled) {
                    if (options.hover) {
                        self._calendarTable.addClass("sui-hoverable");
                    }
                    self.element.removeClass("sui-calendar-disabled");
                }
                else {
                    self._calendarTable.removeClass("sui-hoverable");
                    self.element.addClass("sui-calendar-disabled");
                }

                self._enabled = enabled;
            }
            else {
                return self._enabled;
            }
        },

        previous: function () {
            var self = this;

            if (!self.preventPrevNavigation) {
                self._moveView(false);
            }
        },

        next: function () {
            var self = this;

            if (!self.preventNextNavigation) {
                self._moveView(true);
            }
        },

        view: function () {
            var self = this,
               args = [].slice.call(arguments);

            if (args.length > 0) {
                var view = args[0];
                if (view != self._view) {
                    self._view = view;

                    self._calendarTable.empty();

                    self._renderView();
                }
            }
            else {
                return self._view;
            }
        },

        focused: function () {
            var self = this,
              args = [].slice.call(arguments);
            if (args.length > 0) {
                self._focusedDate = args[0];

                var view = null;

                if (args.length > 1 && self._view != args[1]) {
                    self._view = args[1];
                }

                self._calendarTable.empty();

                self._renderView();

            }
            else {
                return self._focusedDate;
            }
        },

        visible: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var isVisible = args[0];
                if (isVisible) {
                    self.element.removeClass("sui-hidden");
                }
                else {
                    self.element.addClass("sui-hidden");
                }
            }
            else {
                return (self.element.hasClass("sui-hidden") || self.element.css('display') == 'none') ? false : true;
            }
        },

        // calendar destructor
        destroy: function () {
            var self = this,
                cls = self.options.cls,
                element = $(self.element);

            element.removeClass("sui-calendar sui-read-only sui-calendar-disabled" + (cls ? (' ' + cls) : ''));

            self._focusedDate = null;
            self._header = null;
            self._calendarTable = null;
            self._view = null;
            self._enabled = null;
            self._selectedDate = null;
            self._tempTable = null;
            self._tableWrapper = null;

            element.find(".sui-prev").off(CLICK, self._movePrev);
            self._movePrev = null;

            element.find(".sui-next").off(CLICK, self._moveNext);
            self._moveNext = null;

            element.find(".sui-text").off(CLICK, self._changeViewDepth);
            self._changeViewDepth = null;

            element.find(".sui-footer").off(CLICK, self._selectToday);
            self._selectToday = null;

            element.find(".sui-calendar-view").off(CLICK, self._calendarSelection);
            self._calendarSelection = null;

            element.off(SELECTSTART, self._selectStart);
            self._selectStart = null;

            element.empty();

            Widget.fn.destroy.call(self);
        }
    });
    Calendar.defaults = calendarDefaults;
    shield.ui.plugin("Calendar", Calendar);


    /////////////////////////////////////////////////////////
    // DatePicker Widget
    // datePicker settings
    datePickerDefaults = {
        calendar: null, // - Contains settings for underlying calendar widget.
        format: "{0:MM/dd/yyyy}", // - string contains the format of the date which is assinged to the hidden input. This formatted value is submited.
        textTemplate: "{0:MM/dd/yyyy}", // - Contains the format string or callback function used for formatting the value into the date input.
        value: null, // - contains the selected date.
        parseFormats: ["MM/dd/yyyy"], //- List of date formats used to parse the value set with value() method or by direct user input. 
        openOnFocus: false, //- Sets whether the calendar is shown when user focus the date input
        showButton: true, // - Sets whether the calendar button will be shown or just date input is rendered. 
        editable: true, // Whether the input's value can be changed manually or only with selecting date into the calendar. 
        enabled: true, //Whether the widget is enabled. 
        messages: {
            calendarIconTooltip: "",
            buttonText: "select"
        },
        min: new Date(1900, 0, 1), // the minimum date, which the calendar can show
        max: new Date(2099, 11, 31), // the maximum date, which the calendar can show
        events: {
            //change - fires when value is changed
            //close - Fires when calendar is closed
            //open - Fires when calendar is opened
        }
    };

    // Public methods:
    // enabled()/enabled(bool)
    // visible/visible(bool)
    // value/value(date)
    // close()
    // open()

    // DatePicker class
    DatePicker = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
                selectedDate = options.value,
				nobuttonClass = options.showButton ? "" : " sui-no-button";

            if (isIE8) {
                nobuttonClass += " sui-ie8";
            }
            var wrapper = options.isMonthYearPicker ? $("<span class='sui-monthyearpicker" + nobuttonClass + "' />") :
                options.isTimePicker ? $("<span class='sui-timepicker" + nobuttonClass + "' />") :
                options.isDateTimePicker ? $("<span class='sui-datetimepicker" + nobuttonClass + "' />") :
                $("<span class='sui-datepicker" + nobuttonClass + "' />");

            self._selectedDate = null;
            $(element).after(wrapper);

            self._wrapper = wrapper;

            self._visibleInput = $("<input class='sui-picker-input' type='text' />")
                .appendTo(wrapper);

            if (options.showButton) {
                var tooltipText = options.messages.calendarIconTooltip;
                if (options.isTimePicker) {
                    tooltipText = options.messages.timeIconTooltip;
                }

                self._iconWrapper = $("<span class='sui-icon-wrapper' unselectable='on' title='" + tooltipText + "' />")
                    .appendTo(wrapper);

                var icon = $('<span class="sui-sprite sui-calendar-icon" unselectable="on">' + options.messages.buttonText + "</span>")
                    .appendTo(self._iconWrapper);

                if (options.isDateTimePicker) {
                    self._timeIconWrapper = $("<span class='sui-time-icon-wrapper' unselectable='on' title='" + options.messages.timeIconTooltip + "' />")
                        .appendTo(wrapper);

                    $('<span class="sui-sprite sui-time-icon" unselectable="on">' + options.messages.buttonText + "</span>")
                        .appendTo(self._timeIconWrapper);
                }
            }

            $(element).css(DISPLAY, NONE)
                .appendTo(wrapper);

            self._enabled = options.enabled;

            if (!options.enabled) {
                wrapper.addClass("sui-disabled");
                self._visibleInput.on(FOCUS, self._visibleInputFocused = proxy(self._visibleInputFocusedHandler, self));
            }
            self._attachEvents();

            // initialize the selected date from the value attribute if not set
            if (!selectedDate) {
                var valueAttr = self._value();
                if (valueAttr) {
                    selectedDate = valueAttr;
                }
            }

            if (selectedDate) {
                // make sure any specified date is an object
                if (isString(selectedDate)) {
                    selectedDate = new Date(selectedDate);
                }

                if (options.isMonthYearPicker) {
                    self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                }
                else {
                    self._selectedDate = selectedDate;
                }

                self._changeInputsValues(selectedDate);
            }
        },

        _changeInputsValues: function (selectedDate) {
            var self = this,
                options = self.options,
                formatedValue = options.format,
                textTemplate = options.textTemplate,
                formatedValueFunc = isFunc(formatedValue) ? formatedValue : function (item) {
                    return shieldFormat(formatedValue, item.date);
                };

            //self.element.get(0).value = formatedValueFunc.call(self, { date: selectedDate });
            self._value(formatedValueFunc.call(self, { date: selectedDate }));

            var textTemplateFunc = isFunc(textTemplate) ? textTemplate : function (item) {
                return shieldFormat(textTemplate, item.date);
            };

            self._visibleInput.get(0).value = textTemplateFunc.call(self, { date: selectedDate });
            if (options.isMonthYearPicker) {
                self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            else {
                self._selectedDate = selectedDate;
            }
        },

        _attachEvents: function () {
            var self = this,
                options = self.options;

            if (options.showButton) {
                if (options.isTimePicker) {
                    self._iconWrapper.on(CLICK, self._toggleListBoxVisibility = proxy(self._toggleListBoxVisibilityHandler, self));
                }
                else if (options.isDateTimePicker) {
                    self._timeIconWrapper.on(CLICK, self._toggleListBoxVisibility = proxy(self._toggleListBoxVisibilityHandler, self));
                    self._iconWrapper.on(CLICK, self._toggleCalendarVisibility = proxy(self._toggleCalendarVisibilityHandler, self));
                }
                else {
                    self._iconWrapper.on(CLICK, self._toggleCalendarVisibility = proxy(self._toggleCalendarVisibilityHandler, self));
                }
            }
            self._visibleInput.on(KEYPRESS, self._visibleInputKeyPress = proxy(self._visibleInputKeyPressHandler, self));
            $(doc).on(MOUSEDOWN + ".shieldDatePicker" + self.getInstanceId(), proxy(self._hidePopupHandler, self));

            self._visibleInput.on(FOCUS, self._visibleInputFocused = proxy(self._visibleInputFocusedHandler, self));
            self._visibleInput.on(BLUR, self._visibleInputBlured = proxy(self._visibleInputBluredHandler, self));

            self._visibleInput.on(CHANGE, self._visibleInputChanged = proxy(self._visibleInputChangedHandler, self));
        },

        _visibleInputChangedHandler: function () {
            var self = this,
                options = self.options,
                formatedValue = options.format,
                    min = options.min,
                    max = options.max;

            if (!self._enabled) {
                return;
            }

            self._selectedDate = shieldParseDate(self._visibleInput.get(0).value, options.parseFormats);

            if (self._selectedDate && 
                (self._selectedDate.getTime() > max ||
                self._selectedDate.getTime() < min)) {

                if (options.isTimePicker) {
                    self._selectedDate = new Date(min.getFullYear(), min.getMonth(), min.getDate(), self._selectedDate.getHours(), self._selectedDate.getMinutes(), self._selectedDate.getSeconds());
                }
                else {
                    self._selectedDate = null;
                }
            }

            if (self._selectedDate != null) {
                if (self._selectedDate && self.calendar) {
                    self.calendar.value(self._selectedDate);
                }
                if (self._selectedDate && self.listBox) {
                    self._selectValueInListBox(self._selectedDate);
                }
            }

            var formatedValueFunc = isFunc(formatedValue) ? formatedValue : function (item) {
                return shieldFormat(formatedValue, item.date);
            };

            self.element.get(0).value = formatedValueFunc.call(self, { date: self._selectedDate });

            self.trigger(CHANGE);
        },

        _visibleInputFocusedHandler: function (e) {
            var self = this,
                options = self.options;

            if (!self._enabled) {
                e.target.blur();
                return;
            }

            if (options.isMonthYearPicker) {
                self._wrapper.addClass("sui-monthyearpicker-focus");
            }
            else if (options.isTimePicker) {
                self._wrapper.addClass("sui-timepicker-focus");
            }
            else if (options.isDateTimePicker) {
                self._wrapper.addClass("sui-datetimepicker-focus");
            }
            else {
                self._wrapper.addClass("sui-datepicker-focus");
            }

            if (options.openOnFocus) {
                if (self._shouldShowPopup || !self.calendar) {
                    self._toggleCalendarVisibilityHandler();
                    self._shouldShowPopup = false;
                }
            }
        },

        _visibleInputBluredHandler: function () {
            var self = this,
                options = self.options,
                wrapper = self._wrapper;

            if (options.isMonthYearPicker) {
                wrapper.removeClass("sui-monthyearpicker-focus");
            }
            else if (options.isTimePicker) {
                wrapper.removeClass("sui-timepicker-focus");
            }
            else if (options.isDateTimePicker) {
                wrapper.removeClass("sui-datetimepicker-focus");
            }
            else {
                wrapper.removeClass("sui-datepicker-focus");
            }
        },

        _visibleInputKeyPressHandler: function (e) {
            var self = this,
                options = self.options;

            if (!self._enabled) {
                return;
            }
            if (options.editable === false) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            var key = e.keyCode || e.charCode;

            if (key == 13 || key == 9 || key == 27) {
                self._shouldShowPopup = true;
                if (self.calendar && self.calendar.element.css(DISPLAY) != NONE) {
                    self.calendar.element.css(DISPLAY, NONE);
                    self.trigger(CLOSE);
                }
            }
        },

        _hidePopupHandler: function (e) {
            var self = this,
                height;

            if (self.listBox) {
                if (self._visibleInput.get(0) == e.target ||
                    (self._iconWrapper && self._iconWrapper.get(0) == e.target) ||
                    (self._iconWrapper && self._iconWrapper.children(0).get(0) == e.target) ||
                    (self._timeIconWrapper && self._timeIconWrapper.get(0) == e.target) ||
                    (self._timeIconWrapper && self._timeIconWrapper.children(0).get(0) == e.target)) {
                    return;
                }
                if (!self._popupIsOver) {
                    self.listBox.element.parent().slideUp(150, function () {
                    });
                }
                else {
                    height = self.listBox.element.parent().height();
                    self.listBox.element.parent().animate({
                        height: 0,
                        top: self._visibleInput.offset().top
                    }, 150, function () {
                        $(this).css(DISPLAY, NONE);
                        $(this).css("height", height);
                    });
                }

                self._shouldShowPopup = true;
            }
            if (self.calendar) {
                if (self._visibleInput.get(0) == e.target ||
                    (self._iconWrapper && self._iconWrapper.get(0) == e.target) ||
                    (self._iconWrapper && self._iconWrapper.children(0).get(0) == e.target)) {
                    return;
                }
                if (!self._popupIsOver) {
                    self.calendar.element.slideUp(150, function () {
                    });
                }
                else {
                    height = self.calendar.element.height();
                    self.calendar.element.animate({
                        height: 0,
                        top: self._visibleInput.offset().top
                    }, 150, function () {
                        $(this).css(DISPLAY, NONE);
                        $(this).css("height", height);
                    });
                }

                self._shouldShowPopup = true;
            }
        },

        _toggleListBoxVisibilityHandler: function () {
            var self = this,
				options = self.options,
                listBox = options.listBox;

            if (!self._enabled) {
                return;
            }

            if (!self.listBox) {
                var timepicker = new TimePickerPopup({
                    listbox: listBox,
                    parent: self,
                    min: options.min,
                    max: options.max,
                    interval: options.interval,
                    textTemplate: options.isDateTimePicker ? options.timeFormat : options.textTemplate
                });

                self.listBox.on(SELECT, self._listBoxChange = proxy(self._listBoxChangeHandler, self));
                self.listBox.element.on(MOUSEDOWN, self._popupMouseDown = proxy(self._popupMouseDownHandler, self));

                if (self._selectedDate) {
                    self._selectValueInListBox(self._selectedDate);
                }
            }

            if (options.isDateTimePicker) {
                if (self.calendar && self.calendar.element.css(DISPLAY) != NONE) {

                    self.calendar.element.slideUp(150, function () {
                    });

                    self._shouldShowPopup = true;
                }

                self._toggleTimePopup = true;
            }

            if (self._shouldShowPopup) {
                self._showPopup();
            }
            else {
                self._hidePopup();
            }

            if (self._shouldShowPopup) {
                self._shouldShowPopup = false;
            }
            else {
                self._shouldShowPopup = true;
            }
        },

        _listBoxChangeHandler: function (e) {
            var self = this;

            if (self.options.isDateTimePicker) {
                var selectedDate = self._selectedDate,
                    choosenDate = e.item;

                if (selectedDate) {
                    self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
                        choosenDate.getHours(), choosenDate.getMinutes(), choosenDate.getSeconds());
                }
                else {
                    selectedDate = new Date();

                    self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
                        choosenDate.getHours(), choosenDate.getMinutes(), choosenDate.getSeconds());
                }
            }
            else {
                self._selectedDate = e.item;
            }
            var options = self.options,
               formatedValue = options.isDateTimePicker ? shield.format(options.timeFormat, self._selectedDate) : shield.format(options.textTemplate, self._selectedDate),
               elements = self.listBox.element.find(".sui-listbox-item"),
               i = 0;

            for (i; i < elements.length; i++) {
                if (elements[i].innerHTML == formatedValue) {
                    self._selectedElement = $(elements[i]);
                    break;
                }
            }

            self._changeInputsValues(self._selectedDate);

            self._hidePopup();
            self._shouldShowPopup = true;

            self.trigger(CHANGE);
        },

        _toggleCalendarVisibilityHandler: function () {
            var self = this,
				options = self.options,
                calendar = options.calendar;

            if (!self._enabled) {
                return;
            }

            if (!self.calendar) {
                if (shield.ui.Calendar) {
                    if (is.object(calendar) && calendar instanceof shield.ui.Calendar) {
                        self.calendar = calendar;
                    } else {
                        if (self._wrapper.parent().hasClass("sui-rtl")) {
                            self._calendarWrapper = $("<div style='display: none;' />").appendTo(doc.body);
                            self._calendarWrapper.wrap("<span class='sui-rtl'></span>");
                        }
                        else {
                            self._calendarWrapper = $("<div style='display: none;' />").appendTo(doc.body);
                        }
                        self.calendar = new shield.ui.Calendar(self._calendarWrapper, extend({}, calendar, {
                            min: options.min,
                            max: options.max
                        }));
                    }
                    self._shouldShowPopup = true;
                }

                self.calendar.on(CHANGE, self._calendarChange = proxy(self._calendarChangeHandler, self));
                self.calendar.element.on(MOUSEDOWN, self._popupMouseDown = proxy(self._popupMouseDownHandler, self));

                if (self._selectedDate) {
                    self.calendar.value(self._selectedDate);
                }
            }

            if (options.isDateTimePicker) {
                if (self.listBox && self.listBox.element.parent().css(DISPLAY) != NONE) {
                    self.listBox.element.parent().slideUp(150, function () {
                    });

                    self._shouldShowPopup = true;
                }
                self._toggleTimePopup = false;
            }

            if (self._shouldShowPopup) {
                self._showPopup();
            }
            else {
                self._hidePopup();
            }

            if (self._shouldShowPopup) {
                self._shouldShowPopup = false;
            }
            else {
                self._shouldShowPopup = true;
            }
        },

        _calendarChangeHandler: function () {
            var self = this,
                options = self.options,
                selectedDate;

            if (options.isMonthYearPicker) {
                selectedDate = self.calendar.value();

                self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            else if (options.isDateTimePicker) {
                selectedDate = self.calendar.value();
                if (self._selectedDate) {
                    self._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
                        self._selectedDate.getHours(), self._selectedDate.getMinutes(), self._selectedDate.getSeconds());
                }
                else {
                    self._selectedDate = self.calendar.value();
                }
            }
            else {
                self._selectedDate = self.calendar.value();
            }
            self._changeInputsValues(self._selectedDate);
            self._hidePopup();
            self._shouldShowPopup = true;

            self.trigger(CHANGE);
        },

        _calculateLeftOffsetWhenRtl: function () {
            var self = this,
                options = self.options,
                offset = self._wrapper.offset(),
                offsetleft = 0,
                left;

            if (options.isTimePicker || (options.isDateTimePicker && self._toggleTimePopup)) {
                left = self._visibleInput.offset().left - (self.listBox.element.parent().width() - self._visibleInput.width());
                if (left > 0) {
                    offsetleft = left;
                }
            }
            else {
                left = self._visibleInput.offset().left - (self.calendar.element.width() - self._visibleInput.width());
                if (left > 0) {
                    offsetleft = left;
                }
            }

            return offsetleft;
        },

        _showPopup: function () {
            var self = this,
				options = self.options,
                offset = self._wrapper.offset(),
                top = offset.top - $(doc).scrollTop(),
                height = self._wrapper.height(),
                documentHeight = $(win).height(),
                popupTop = offset.top + height,
                calendarHeight,
                offsetLeft = offset.left;

            if (self._wrapper.parent().hasClass("sui-rtl")) {
                offsetLeft = self._calculateLeftOffsetWhenRtl();
            }

            if (options.isTimePicker || (options.isDateTimePicker && self._toggleTimePopup)) {
                calendarHeight = self.listBox.element.parent().height();
            }
            else {
                calendarHeight = self.calendar.element.height();
            }

            if (documentHeight < calendarHeight + top + height) {
                popupTop = offset.top - calendarHeight - 1;
            }
            else {
                popupTop++;
            }

            if (popupTop < 0 || $(doc).scrollTop() > popupTop) {
                popupTop = offset.top + height + 1;
            }

            if (self._visibleInput.offset().top > popupTop) {
                self._popupIsOver = true;
            }
            else {
                self._popupIsOver = false;
            }

            if (options.isTimePicker || (options.isDateTimePicker && self._toggleTimePopup)) {
                if (!self._popupIsOver) {
                    self.listBox.element.parent().css({
                        position: 'absolute',
                        top: popupTop,
                        left: offsetLeft,
                        zIndex: 10002
                    });
                    self.listBox.element.parent().slideDown(150, function () {
                        if (self._selectedElement) {
                            var scrollTop = Math.abs(self._selectedElement.get(0).offsetTop),
                                parentScrollTop = self._selectedElement.parent().scrollTop();

                            if (scrollTop > self._selectedElement.parent().get(0).scrollTopMax) {
                                scrollTop = self._selectedElement.parent().get(0).scrollTopMax;
                            }

                            if (!((parentScrollTop + self.listBox.element.height()) > scrollTop && parentScrollTop < scrollTop)) {
                                self.listBox.element.scrollTop(scrollTop);
                            }
                        }
                    });
                }
                else {
                    self.listBox.element.parent().css({
                        position: 'absolute',
                        zIndex: 10002,
                        top: popupTop + calendarHeight,
                        left: offsetLeft,
                        height: 0,
                        display: ""
                    });
                    self.listBox.element.parent().animate({
                        height: calendarHeight,
                        top: popupTop + 2
                    }, 150);
                }
            }
            else {
                if (!self._popupIsOver) {
                    self.calendar.element.css({
                        position: 'absolute',
                        zIndex: 10002,
                        top: popupTop,
                        left: offsetLeft
                    });
                    self.calendar.element.slideDown(150, function () {
                    });
                }
                else {
                    self.calendar.element.css({
                        position: 'absolute',
                        zIndex: 10002,
                        top: popupTop + calendarHeight,
                        left: offsetLeft,
                        height: 0,
                        display: ""
                    });
                    self.calendar.element.animate({
                        height: calendarHeight,
                        top: popupTop
                    }, 150);
                }
            }

            self.trigger(OPEN);
        },

        _hidePopup: function () {
            var self = this,
                options = self.options,
                height;

            if (options.isTimePicker || (options.isDateTimePicker && self._toggleTimePopup)) {
                if (self.listBox && self.listBox.element.parent().css(DISPLAY) != NONE) {
                    if (!self._popupIsOver) {
                        self.listBox.element.parent().slideUp(150, function () {});
                    }
                    else {
                        height = self.listBox.element.parent().height();
                        self.listBox.element.parent().animate({
                            height: 0,
                            top: self._visibleInput.offset().top
                        }, 150, function () {
                            $(this).css(DISPLAY, NONE);
                            $(this).css("height", height);
                        });
                    }
                }
            }
            else {
                if (self.calendar && self.calendar.element.css(DISPLAY) != NONE) {
                    if (!self._popupIsOver) {
                        self.calendar.element.slideUp(150, function () {});
                    }
                    else {
                        height = self.calendar.element.height();
                        self.calendar.element.animate({
                            height: 0,
                            top: self._visibleInput.offset().top
                        }, 150, function () {
                            $(this).css(DISPLAY, NONE);
                            $(this).css("height", height);
                        });
                    }
                }
            }

            self.trigger(CLOSE);
        },

        _popupMouseDownHandler: function (e) {
            e.preventDefault();
            e.stopPropagation();
        },

        _selectValueInListBox: function (date) {
            var self = this;

            if (!self.listBox) {
                return;
            }
            var options = self.options,
               formatedValue = options.isDateTimePicker ? shield.format(options.timeFormat, date) : shield.format(options.textTemplate, date),
               elements = self.listBox.element.find(".sui-listbox-item"),
               i;

            for (i = 0; i < elements.length; i++) {
                if (elements[i].innerHTML == formatedValue) {
                    self._selectedElement = $(elements[i]);
                    break;
                }
            }

            self.listBox.selected(i, true);
        },

        enabled: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var enabled = args[0];

                self._enabled = enabled;

                if (enabled) {
                    if (self._visibleInputFocused) {
                        self._visibleInput.off(FOCUS, self._visibleInputFocused);
                        self._visibleInputFocused = null;
                    }
                    self._wrapper.removeClass("sui-disabled");
                }
                else {
                    self._wrapper.addClass("sui-disabled");
                    self._visibleInput.on(FOCUS, self._visibleInputFocused = proxy(self._visibleInputFocusedHandler, self));
                }
            }
            else {
                return self._enabled;
            }
        },

        visible: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var isVisible = args[0];
                if (isVisible) {
                    self._wrapper.removeClass("sui-hidden");
                }
                else {
                    self._wrapper.addClass("sui-hidden");
                }
            }
            else {
                return (self._wrapper.hasClass("sui-hidden") || self._wrapper.css('display') == 'none') ? false : true;
            }
        },

        // override this to set the focus to the correct element
        focus: function() {
            $(this._visibleInput).focus();
        },

        _value: function() {
            return this.element.attr.apply(this.element, ["value"].concat([].slice.call(arguments)));
        },

        value: function () {
            var self = this,
                options = self.options,
                minDate = options.min,
                maxDate = options.max,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                var date = args[0];

                if (date == null || date === "" || isUndefined(date))
                {
                    self._visibleInput.get(0).value = "";
                    self._selectedDate = null;
                    if (self.calendar) {
                        self.calendar.value(null);
                    }
                    if (options.isTimePicker || options.isDateTimePicker) {
                        if (self.listBox) {
                            self.listBox.clearSelection();
                        }
                    }
                    return;
                }

                if (!options.isTimePicker) {
                    if ((date.getTime() < minDate.getTime() ||
                        date.getTime() > maxDate.getTime())) {
                        return;
                    }
                }

                self._changeInputsValues(date);
                if (self.calendar) {
                    self.calendar.value(date);
                }

                self._selectedDate = date;
                if (options.isTimePicker || options.isDateTimePicker) {
                    self._selectValueInListBox(date);
                }
            }
            else {
                return self._selectedDate;
            }
        },

        close: function () {
            var self = this,
                 args = [].slice.call(arguments);

            if (!self.options.isDateTimePicker) {
                self._shouldShowPopup = false;
                self._toggleCalendarVisibilityHandler();
            }
            else {
                if (args.length > 0) {
                    if (args[0] == "calendar") {
                        self._shouldShowPopup = false;
                        self._toggleCalendarVisibilityHandler();
                    }
                    if (args[0] == "timeview") {
                        self._shouldShowPopup = false;
                        self._toggleListBoxVisibilityHandler();
                    }
                }
            }
        },

        open: function () {
            var self = this,
                args = [].slice.call(arguments);

            if (!self.options.isDateTimePicker) {
                self._shouldShowPopup = true;
                self._toggleCalendarVisibilityHandler();
            }
            else {
                if (args.length > 0) {
                    if (args[0] == "calendar") {
                        self._shouldShowPopup = true;
                        self._toggleCalendarVisibilityHandler();
                    }
                    if (args[0] == "timeview") {
                        self._shouldShowPopup = true;
                        self._toggleListBoxVisibilityHandler();
                    }
                }
            }
        },

        // DatePicker destructor
        destroy: function () {
            var self = this;

            if (self.options.isTimePicker) {
                self._iconWrapper.off(CLICK, self._toggleListBoxVisibility);
                self._toggleListBoxVisibility = null;
            }
            else if (self.options.isDateTimePicker) {
                self._iconWrapper.off(CLICK, self._toggleListBoxVisibility);
                self._toggleListBoxVisibility = null;
                self._timeIconWrapper = null;
                self._iconWrapper.off(CLICK, self._toggleCalendarVisibility);
                self._toggleCalendarVisibility = null;
            }
            else {
                self._iconWrapper.off(CLICK, self._toggleCalendarVisibility);
                self._toggleCalendarVisibility = null;
            }
            self._iconWrapper = null;
            self._popupIsOver = null;

            $(doc).off(MOUSEDOWN + ".shieldDatePicker" + self.getInstanceId());

            $(self.element).css(DISPLAY, "")
                .insertAfter(self._wrapper);

            self._wrapper.remove();
            self._wrapper = null;

            self._destroyCalendar();
            self._destroyListBox();

            self._shouldShowPopup = null;

            self._visibleInput.off(FOCUS, self._visibleInputFocused);
            self._visibleInput.off(CHANGE, self._visibleInputChanged);
            self._visibleInput.off(BLUR, self._visibleInputBlured);

            self._visibleInputFocused = null;
            self._visibleInputChanged = null;
            self._visibleInputBlured = null;
            self._visibleInput = null;
            self._selectedDate = null;

            self._enabled = null;

            Widget.fn.destroy.call(self);
        },

        _destroyCalendar: function () {
            var self = this;

            if (self.calendar) {
                self.calendar.off(CHANGE, self._calendarChange);
                self._calendarChange = null;

                self.calendar.element.off(MOUSEDOWN, self._popupMouseDown);
                self._popupMouseDown = null;

                self.calendar.destroy();
                self.calendar = null;

                if (self._calendarWrapper) {
                    self._calendarWrapper.remove();
                }
            }
        },

        _destroyListBox: function () {
            var self = this;

            if (self.listBox) {
                self._selectedElement = null;
                self.listBox.off(CHANGE, self._listBoxChange);
                self._listBoxChange = null;

                self.listBox.destroy();
                self.listBox = null;
                if (self._listBoxWrapper) {
                    self._listBoxWrapper.remove();
                    self._listBoxWrapper = null;
                }
            }
        }
    });
    DatePicker.defaults = datePickerDefaults;
    shield.ui.plugin("DatePicker", DatePicker);


    /////////////////////////////////////////////////////////
    // MonthYearPicker Widget
    monthYearPickerDefaults = extend({}, datePickerDefaults, {
        isMonthYearPicker: true,
        calendar: {
            view: { // Configuration section which contains settings for the calendar views
                depth: YEAR, // Specifies the navigation depth. Can be "month", "year", "decade", "century"
                start: YEAR // Specifies the start view ot the calendar.  Can be "month" - hows the days of the month, "year" - shows the months of the year, "decade" - shows the years of the decade, "century" - shows the decades from the century
            }
        },
        format: "{0:MMMM yyyy}", // - string contains the format of the date which is assinged to the hiiden input. This formatted value is submited.
        textTemplate: "{0:MMMM yyyy}", // - Contains the format string or callback function used for formatting the value into the date input.
        parseFormats: ["MMMM yyyy"] //- List of date formats used to parse the value set with value() method or by direct user input. 
    });
    MonthYearPicker = DatePicker.extend({
        init: function (element, userOptions) {
            if (userOptions) {
                userOptions.isMonthYearPicker = true;
            }

            // call the parent DatePicker class init
            DatePicker.prototype.init.call(this, element, userOptions);
        }
    });
    MonthYearPicker.defaults = monthYearPickerDefaults;
    shield.ui.plugin("MonthYearPicker", MonthYearPicker);


    /////////////////////////////////////////////////////////
    // TimePicker Widget
    timePickerDefaults = extend({}, datePickerDefaults, {
        isTimePicker: true,
        listBox: null,
        format: "{0:h:mm tt}", // - string contains the format of the date which is assinged to the hiiden input. This formatted value is submited.
        textTemplate: "{0:h:mm tt}", // - Contains the format string or callback function used for formatting the value into the date input.
        parseFormats: ["h:mm tt"], //- List of date formats used to parse the value set with value() method or by direct user input. 
        interval: 30, // Specifies the interval, between values in the popup list, in minutes.
        min: new Date(1900, 0, 1, 0, 0, 0), // Specifies the start value in the popup list. The date part is ignored.
        max: new Date(1900, 0, 1, 0, 0, 0), // Specifies the end value in the popup list. The date part is ignored.
        messages: {
            timeIconTooltip: "",
            buttonText: "select"
        }
    });
    TimePicker = DatePicker.extend({
        init: function (element, userOptions) {
            if (userOptions) {
                userOptions.isTimePicker = true;
            }

            // call the parent DatePicker class init
            DatePicker.prototype.init.call(this, element, userOptions);
        }
    });
    TimePicker.defaults = timePickerDefaults;
    shield.ui.plugin("TimePicker", TimePicker);


    /////////////////////////////////////////////////////////
    // DateTimePicker Widget
    dateTimePickerDefaults = extend({}, datePickerDefaults, {
        isDateTimePicker: true,
        listBox: null,
        format: "{0:MM/dd/yyyy h:mm tt}", // - string contains the format of the date which is assinged to the hiiden input. This formatted value is submited.
        textTemplate: "{0:MM/dd/yyyy h:mm tt}", // - Contains the format string or callback function used for formatting the value into the date input.
        parseFormats: ["MM/dd/yyyy h:mm tt"], //- List of date formats used to parse the value set with value() method or by direct user input. 
        interval: 30, // Specifies the interval, between values in the popup list, in minutes.
        min: new Date(1900, 0, 1, 0, 0, 0), // the minimum date, which the calendar can show
        max: new Date(2099, 11, 31, 0, 0, 0), // the maximum date, which the calendar can show
        messages: {
            calendarIconTooltip: "",
            timeIconTooltip: "",
            buttonText: "select"
        },
        timeFormat: "{0:h:mm tt}" //- Contains the format string or callback function used for formatting the time part of the value.
    });
    DateTimePicker = DatePicker.extend({
        init: function (element, userOptions) {
            if (userOptions) {
                userOptions.isDateTimePicker = true;
            }

            // call the parent DatePicker class init
            DatePicker.prototype.init.call(this, element, userOptions);
        }
    });
    DateTimePicker.defaults = dateTimePickerDefaults;
    shield.ui.plugin("DateTimePicker", DateTimePicker);

})(jQuery, shield, this);