(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
        Position = shield.ui.Position,
        support = shield.support,

        proxy = $.proxy,

        error = shield.error,
        shieldFormat = shield.format,
        isDefined = shield.is.defined,
        isFunc = shield.is.func,
        isBoolean = shield.is["boolean"],
        isString = shield.is.string,
        isNull = shield.is["null"],
        isInt = shield.is.integer,
        toInt = shield.to["int"],

        CHANGE = "change",
		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",
        CENTERED = "centered",
        LEFT = "left",
        RIGHT = "right",
		WIDTH = "width",
		HEIGHT = "height",
        CLICK = "click",

        SUI_TIMELINE_DS_ITEM = "sui-timeline-ds-item",

        timelineDefaults, Timeline;


    // Timeline defaults
    timelineDefaults = {
        cls: UNDEFINED,             // optional class
        dataSource: UNDEFINED,      // dataSource specifying the items
        readDataSource: true,       // whether to read the DS on init
        //orientation: VERTICAL,      // only "vertical" supported for now  // NOT SUPPORTED AT THE MOMENT
        layout: CENTERED,           // "centered", "left", "right"
        animation: {
            enabled: true,			// enable animation
			expandDuration: 200,    // animation delay for expanding an item
			collapseDuration: 150   // animation delay for collapsing an item
        },
        positionTemplate: UNDEFINED,    // template for placing each event on the left or right side of the axis if the timeline is centered
        iconTemplate: "{icon}",         // template for an item's icon
        titleTemplate: "{title}",       // template for an item's title 
        textTemplate: "{text}",         // template for an item's text
        collapsedTemplate: "{collapsed}",   // template for an item's collapsed state
        iconUrlTemplate: "{iconUrl}",
        iconClsTemplate: "{iconCls}",
        collapsible: true,      // whether the items can be collapsed (their text toggled, title and icon remain always visible)
        width: UNDEFINED,
        height: UNDEFINED,
        events: {
            // expand
            // collapse
        }
    };
    // Public methods:
    //      bool visible()  /   void visible(boolVisible)
    //      bool expanded(index/jQuery) / void expanded(boolExpanded, index/jQuery, doneCallback)
    //      void expandAll()
    //      void collapseAll()
	// Timeline widget class
    Timeline = Widget.extend({
		init: function () {
			// call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				element = $(self.element),
				options = self.options,
                dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
                cls = options.cls,
                eventNS;

            eventNS = self._eventNS = '.shieldTimeline' + self.getInstanceId();

            // empty the element
            element.empty();

            // init its classes
            element.addClass('sui-timeline sui-timeline-' + options.layout + (options.collapsible ? ' sui-timeline-collapsible' : '') + (cls ? (' ' + cls) : ''));

            // initialization of the timeline axis
            self._initAxis(element);

            // init the datasource
			if (dataSourceOpts) {
				// init from options
                self.dataSource = DataSource.create(dataSourceOpts);
            }
            else {
                self.destroy();
				error("shieldTimeline: dataSource option is required.", dieOnError);
				return;
            }

            $(win).on("resize" + eventNS, proxy(self._winResize, self));

            // the handler for data source on change
	        self.dataSource.on(CHANGE + eventNS, proxy(self._dsChange, self));

            // read the data source
            if (options.readDataSource) {
                self.dataSource.read();
            }
        },

        _initAxis: function(element) {
            var self = this,
                options = self.options,
                inner;

            if (isDefined(options.width)) {
				element.css(WIDTH, options.width);
			}
			if (isDefined(options.height)) {
				element.css(HEIGHT, options.height);
			}

            inner = $('<div class="sui-timeline-inner"/>').appendTo(element);

            self._axis = $('<div class="sui-timeline-axis sui-timeline-axis-' + options.layout + '"/>').appendTo(inner);
        },

        _dsChange: function() {
            this._render();
        },

        _winResize: function() {
            this._recalcEventWidths();
        },

        _recalcEventWidths: function() {
            var self = this,
                newWidth = toInt($(self.element).innerWidth());

            // if the element width changed, recalculate the widths of the events
            if (newWidth !== self._width) {
                self._setEventWidths(newWidth);
                self._width = newWidth;
            }
        },

        _setEventWidths: function(elementWidth) {
            var self = this,
                layout = self.options.layout,
                scrollbarWidth = support.scrollbar(),
                axisWidth = $(self._axis).outerWidth(),
                eventWidth = toInt(layout === CENTERED ? ((elementWidth - scrollbarWidth) / 2 - axisWidth) : (elementWidth - scrollbarWidth - axisWidth));

            $(self._axis).children('.sui-timeline-event').each(function() {
                $(this).outerWidth(eventWidth);

                if ($(this).hasClass('sui-timeline-event-left')) {
                    self._positionEventLeft($(this));
                }
            });
        },

        _render: function() {
            var self = this,
                options = self.options,
                collapsibleOption = options.collapsible,
                items = self.dataSource.view || [],
                itemsLength = items.length,
                item,
                eventElement,
                iconElement,
                iconInnerElement,
                titleElement,
                text,
                textElement,
                collapsedResult,
                collapsed,
                iconUrl,
                iconCls,
                i;

            for (i=0; i<itemsLength; i++) {
                item = items[i];

                eventElement = $('<div class="sui-timeline-event"/>')
                    .data(SUI_TIMELINE_DS_ITEM, item)
                    .appendTo(self._axis);

                titleElement = $('<div class="sui-timeline-event-title">' + shieldFormat(options.titleTemplate, item) + '</div>')
                    .appendTo(eventElement);

                // get the item text; if it is empty, do not add it as element and the code below will
                // not make the event expandable either;
                text = shieldFormat(options.textTemplate, item);
                if (isDefined(text) && !isNull(text) && text !== "undefined" && text !== "") {
                    textElement = $('<div class="sui-timeline-event-text">' + text + '</div>')
                        .appendTo(eventElement);
                }
                else {
                    textElement = UNDEFINED;
                }

                // position the event element
                self._positionEventElement(eventElement, item, i);

                // init any icon
                iconUrl = shieldFormat(options.iconUrlTemplate, item);
                if (!isString(iconUrl) || iconUrl === "undefined") {
                    iconUrl = UNDEFINED;
                }
                iconCls = shieldFormat(options.iconClsTemplate, item);
                if (!isString(iconCls) || iconCls === "undefined") {
                    iconCls = UNDEFINED;
                }

                if (iconUrl || iconCls) {
                    iconElement = $('<span class="sui-timeline-event-icon' + (collapsibleOption && isDefined(textElement) ? ' sui-timeline-event-icon-collapsible' : '') + '"/>')
                        .insertBefore(eventElement);

                    iconInnerElement = $('<span class="sui-timeline-event-icon-inner"/>')
                        .appendTo(iconElement);

                    if (iconUrl) {
                        iconInnerElement.append('<img src="' + iconUrl + '"/>');
                    }
                    else {
                        iconInnerElement.addClass(iconCls);
                    }
                }

                // if collapsible, init the events and check the template and init the state;
                // otherwise it will be visible
                if (collapsibleOption && isDefined(textElement)) {
                    eventElement.addClass('sui-timeline-event-collapsible');

                    titleElement.on(CLICK, proxy(self._eventTitleClicked, self, eventElement));
                    if (iconUrl || iconCls) {
                        iconElement.on(CLICK, proxy(self._eventTitleClicked, self, eventElement));
                    }

                    collapsedResult = shieldFormat(options.collapsedTemplate, item);
                    collapsed = isString(collapsedResult) ? (collapsedResult === "true" || collapsedResult === "1") : collapsedResult === true;
                    if (collapsed) {
                        self._collapse(eventElement, false, true);
                    }
                }
            }

            self._recalcEventWidths();
        },

        _positionEventElement: function(eventElement, item, index) {
            var self = this,
                options = self.options,
                positionTemplate = options.positionTemplate,
                positionResult,
                toggle;

            switch (options.layout) {
                case CENTERED:
                    if (isFunc(positionTemplate) || isString(positionTemplate)) {
                        positionResult = shieldFormat(positionTemplate, item, index);

                        if (isString(positionResult)) {
                            if (positionResult === "undefined") {
                                toggle = index % 2;
                            }
                            else if (positionResult === "true" || positionResult === "1") {
                                toggle = true;
                            }
                            else {
                                toggle = false;
                            }
                        }
                        else {
                            toggle = !!positionResult;
                        }
                    }
                    else {
                        toggle = index % 2;
                    }

                    if (toggle) {
                        self._positionEventLeft(eventElement);
                    }

                    break;
                case RIGHT:
                    self._positionEventLeft(eventElement);
                    break;
                default:
                    break;
            }
        },

        _positionEventLeft: function(eventElement) {
            eventElement
                .addClass('sui-timeline-event-left')
                .css('left', -1 * $(eventElement).width());
        },

        _isExpanded: function(eventElement) {
            return !$(eventElement).hasClass('sui-timeline-event-collapsed');
        },

        _getEventItem: function(eventElement) {
            return $(eventElement).data(SUI_TIMELINE_DS_ITEM);
        },

        _expand: function(eventElement, fireEvent, skipAnimation, doneCallback) {
            var self = this,
                animation = self.options.animation,
                textElement,
                evt;

            if (self._isExpanded(eventElement)) {
                if (isFunc(doneCallback)) {
                    doneCallback.call(self);
                }
                return;
            }

            if (fireEvent) {
                evt = self.trigger("expand", { element: eventElement, item: self._getEventItem(eventElement) });
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            eventElement.find('.sui-timeline-event-text').first().slideDown(
                animation.enabled && !skipAnimation ? animation.expandDuration : 0,
                function() {
                    eventElement.removeClass('sui-timeline-event-collapsed');

                    if (isFunc(doneCallback)) {
                        doneCallback.call(self);
                    }
                }
            );
        },

        _collapse: function(eventElement, fireEvent, skipAnimation, doneCallback) {
            var self = this,
                animation = self.options.animation,
                textElement,
                evt;

            if (!self._isExpanded(eventElement)) {
                if (isFunc(doneCallback)) {
                    doneCallback.call(self);
                }
                return;
            }

            if (fireEvent) {
                evt = self.trigger("collapse", { element: eventElement, item: self._getEventItem(eventElement) });
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            eventElement.find('.sui-timeline-event-text').first().slideUp(
                animation.enabled && !skipAnimation ? animation.collapseDuration : 0,
                function() {
                    eventElement.addClass('sui-timeline-event-collapsed');

                    if (isFunc(doneCallback)) {
                        doneCallback.call(self);
                    }
                }
            );
        },

        _eventTitleClicked: function(eventElement, event) {
            var self = this;

            if (self._isExpanded(eventElement)) {
                self._collapse(eventElement, true, false);
            }
            else {
                self._expand(eventElement, true, false);
            }
        },

        _getEvent: function(arg) {
            if (isInt(arg)) {
                return $($(this._axis).children('.sui-timeline-event')[arg]);
            }
            else {
                return $(arg);
            }
        },

        // bool expanded(index/jQuery) / void expanded(boolExpanded, index, doneCallback)
        expanded: function() {
            var self = this,
                args = [].slice.call(arguments),
                expandedState = isBoolean(args[0]) ? args.shift() : UNDEFINED,
                eventElement = self._getEvent(args[0]);

            if (isDefined(expandedState)) {
                if (expandedState) {
                    // expand
                    self._expand(eventElement, false, false, args[1]);
                }
                else {
                    // collapse
                    self._collapse(eventElement, false, false, args[1]);
                }
            }
            else {
                return self._isExpanded(eventElement);
            }
        },

        expandAll: function() {
            var self = this;

            $(self._axis).children('.sui-timeline-event').each(function() {
                self._expand($(this), false, false);
            });
        },

        collapseAll: function() {
            var self = this;

            $(self._axis).children('.sui-timeline-event').each(function() {
                self._collapse($(this), false, false);
            });
        },

        // Timeline destructor
        destroy: function() {
            var self = this,
                element = self.element,
                options = self.options,
                cls = options.cls,
                eventNS = self._eventNS;

            $(win).off(eventNS);

            if (self.dataSource) {
				self.dataSource.off(eventNS);
			}

            element
                .removeClass('sui-timeline' + (cls ? (' ' + cls) : ''))
                .empty();

            self._width = null;

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
    });
    Timeline.defaults = timelineDefaults;
    shield.ui.plugin("Timeline", Timeline);

})(jQuery, shield, this);
