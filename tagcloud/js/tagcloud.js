(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,

        mathMin = Math.min,
        mathMax = Math.max,

        proxy = $.proxy,
        each = $.each,
        map = $.map,

        error = shield.error,
        shieldFormat = shield.format,
        isDefined = shield.is.defined,
        isNull = shield.is["null"],
        toInt = shield.to["int"],

        CHANGE = "change",
		CLICK = "click",

        tagCloudDefaults, TagCloud;

    // a helper function to check return values from shieldFormat
    function checkShieldFormat(str) {
        return isDefined(str) && !isNull(str) && str !== 'undefined';
    }

	//todo - move to common
	function parseCssInt(element, property) {
		var value = element.css(property);
        return value ? toInt(value) || 0 : 0;
	}

    // TagCloud defaults
    tagCloudDefaults = {
        cls: UNDEFINED,     // optional class
        width: UNDEFINED,   // optional width
        height: UNDEFINED,  // optional height
        dataSource: UNDEFINED,  // dataSource specifying the items; must have at least: "text" and "frequency" properties
        readDataSource: true,   // whether to read the DS on init
        title: UNDEFINED,       // widget title
        textTemplate: "{text}",     // a template string or a function to specify the value of the text for each item
        hrefTemplate: "{href}",     // a template string or a function to specify the value of the href/link for each item
        targetTemplate: "{target}", // a template string or a function to specify the value of the target for the href (e.g: _blank) for each item
        frequencyTemplate: "{frequency}",   // a template string or a function to specify the value of the frequency for each item
		minSize: 90,    // % of parent font-size (maybe hidden)
		maxSize: 250,   // % of parent font-size (maybe hidden)
        events: {
            // click - clicked on an item
        }
    };
    // Public methods:
    //      bool visible()  /   void visible(boolVisible)
    // TODO
	// TagCloud widget class
    TagCloud = Widget.extend({
		init: function () {
			// call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				element = $(self.element),
				options = self.options,
                titleOption = options.title,
                dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
                cls = options.cls,
                eventNS;

			// check whether element is a div
			if (element.prop("tagName").toLowerCase() !== "div") {
				error("shieldTagCloud: Underlying element is not DIV.", dieOnError);
                return;
			}

            eventNS = self._eventNS = '.shieldTagCloud' + self.getInstanceId();

            // empty the element
            element.empty();

            // add title if specified
            if (titleOption) {
                element.append('<div class="sui-tagcloud-title">' + titleOption + '</div>');
            }

            // add the content element
            self._contentEl = $('<div class="sui-tagcloud-content">')
                .appendTo(element);

			//add tagcloud class & options cls
			element.addClass('sui-tagcloud' + (cls ? (' ' + cls) : ''));
			
			// apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css("width", options.width);
			}
			if (isDefined(options.height)) {
				element.css("height", options.height);
			}
			
            // init the datasource
			if (dataSourceOpts) {
				// init from options
                self.dataSource = DataSource.create(dataSourceOpts);
            }
            else {
                self.destroy();
				error("shieldTagCloud: No dataSource or underlying UL element found.", dieOnError);
				return;
            }

            // the handler for data source on change
	        self.dataSource.on(CHANGE + eventNS, proxy(self._dsChange, self));

            // read the data source
            if (options.readDataSource) {
                self.dataSource.read();
            }
        },

        _dsChange: function() {
            this._render();
        },

        _render: function() {
            var self = this,
                contentEl = self._contentEl,
                items = self.dataSource.view || [],
                minMax = self._getMinMax(items);

            // clear the contents of the tagcloud 
            // and add the tag items
            contentEl
                .empty()
                .append(map(items, function(item) {
                    return self._createItem(item, minMax[0], minMax[1]);
                }));
        },

		_createItem: function(item, min, max) {
			var self = this,
				options = self.options,
				minSize = options.minSize,
				maxSize = options.maxSize,
                //delta = max - min,
				target = $('<div class="sui-tagcloud-item" />'),
				text = shieldFormat(options.textTemplate, item),
                href,
				fontSize,
				frequency,
                anchor,
                anchorTarget;

            if (checkShieldFormat(text)) {
                href = shieldFormat(options.hrefTemplate, item);
                if (checkShieldFormat(href)) {
                    anchor = $('<a href="' + href + '" class="sui-tagcloud-link">' + text + '</a>')
                        .appendTo(target);

                    anchorTarget = shieldFormat(options.targetTemplate, item);
                    if (checkShieldFormat(anchorTarget)) {
                        anchor.attr('target', anchorTarget);
                    }
                }
                else {
                    target.html(text);					
                }
            }

            // determine the font size
            frequency = toInt(shieldFormat(options.frequencyTemplate, item));
            //fontSize = minSize + (delta === 0 ? 0 : frequency * (maxSize - minSize) / delta); //in %

            // translate the frequency to a font size bound by min and max size
            if (max > min) {
                fontSize = (frequency - min) * (maxSize - minSize) / (max - min) + minSize;
            }
            else {
                // no difference in min/max - make the font size 100%
                fontSize = 100;
            }

            // add the font size and the click handler
            target
                .css('font-size', fontSize + '%')
                .on(CLICK, proxy(self._itemClick, self, item));

			return target;
		},

		_itemClick: function(item, event) {
            var self = this,
                evt = self.trigger(CLICK, {item: item});

            // propagate cancelling to the original event
            if (evt.isDefaultPrevented() && event) {
                event.preventDefault();
            }
		},

        _getMinMax: function(items) {
            var self = this,
                min = Number.POSITIVE_INFINITY,
                max = Number.NEGATIVE_INFINITY,
                current;

            each(items || [], function(index, item) {
				current = toInt(shieldFormat(self.options.frequencyTemplate, item));
				if (!isDefined(max) || current > max) {
					max = current;
				}
				if (!isDefined(min) || current < min) {
					min = current;
				}
			});

            return [min, max];
        },

        // TagCloud destructor
        destroy: function() {
            var self = this,
                element = self.element,
                options = self.options,
                cls = options.cls;

            if (self.dataSource) {
				self.dataSource.off(CHANGE + self._eventNS);
			}

            element
                .removeClass('sui-tagcloud' + (cls ? (' ' + cls) : ''))
                .empty();

            Widget.fn.destroy.call(self);
        }
    });
    TagCloud.defaults = tagCloudDefaults;
    shield.ui.plugin("TagCloud", TagCloud);

})(jQuery, shield, this);