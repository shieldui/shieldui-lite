(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        shieldConstants = shield.Constants,
		doc = document,
        SVG_NS = shieldConstants.SVG_NS,
		HAS_SVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, "svg").createSVGRect,

		map = $.map,
		each = $.each,
		proxy = $.proxy,
		toInt = shield.to["int"],
		isFunc = shield.is.func,
		error = shield.error,
		mathMin = Math.min,
		mathMax = Math.max,

		DISABLED = "disabled",
		PX = "px",
        FLOAT = "float",
        LEFT = "left",
        RIGHT = "right",
        LAYOUT_HORIZONTAL = "horizontal",
        LAYOUT_VERTICAL = "vertical",
        LAYOUT_CIRCULAR = "circular",

        // some circular rendering helper functions
        polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
            var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        },
        describeArc = function(x, y, radius, startAngle, endAngle) {
            var start = polarToCartesian(x, y, radius, endAngle),
                end = polarToCartesian(x, y, radius, startAngle),
                arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

            return [
                "M", start.x, start.y, 
                "A", radius, radius, 0, arcSweep, 0, end.x, end.y
            ].join(" ");
        },

	// ProgressBar default settings
	progressBarDefaults = {
        cls: UNDEFINED,
		enabled: true,
		min: 0,
		max: 100,
		value: 0,
        layout: LAYOUT_HORIZONTAL,  // horizontal, vertical or circular layout
        layoutOptions: {                    // optional layout settings
            circular: {                     // only circular layout has settings - the other two are in CSS
                width: 30,                  // width of the arc
                color: "#197BB5",           // color for the value arc
                colorDisabled: "#C4C4C4",   // color for the value arc in disabled state
                borderColor: "#C4C4C4",     // circle border color
                borderWidth: 1,             // border width
                backgroundColor: "#FFFFFF" // circle background color
            }
        },
		reversed: false,	        // reversed or normal
		text: {
			enabled: false,	        // whether to show the value text inside or not
			template: "{0}"	        // the text's template string or function
		},
		events: {
			// change
			// complete
		}
	},
	// Public methods:
	//		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		int value()		/	void value(newValue)
	// ProgressBar widget class
	ProgressBar = Widget.extend({
		init: function () {
			// call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				element = $(self.element),
				options = self.options,
                layout = options.layout,
                cls = options.cls,
				floatDirection;

            self._eventNS = '.shieldProgressbar' + self.getInstanceId();

            // add css classes to the container
			element.addClass("sui-progressbar");
			if (layout === LAYOUT_VERTICAL) {
			    element.addClass("sui-progressbar-vertical");
            }
            else if (layout === LAYOUT_CIRCULAR) {
                element.addClass("sui-progressbar-circular");
            }

			// add the inner element if layout is not circular
            if (layout !== LAYOUT_CIRCULAR) {
                self.inner = $("<div/>")
                    .addClass("sui-progressbar-value")
                    .appendTo(element);
            }

            if (cls) {
				element.addClass(cls);
			}

			// init the float of the inner div that will contain the value, if horizontal layout
			if (layout === LAYOUT_HORIZONTAL) {
				// horizontal - reverse the current one if reversed is true

                // now that the inner element is added, get its current CSS float property, 
                // to determine whether it is in a RTL or normal layout
                floatDirection = self.inner.css(FLOAT) || LEFT;

				if (options.reversed) {
					floatDirection = floatDirection === LEFT ? RIGHT : LEFT;
				}
				else {
					floatDirection = floatDirection === RIGHT ? RIGHT : LEFT;
				}
				self.inner.css(FLOAT, floatDirection);
			}
            else if (layout == LAYOUT_CIRCULAR) {
                // layout is circular, init the VML stuff if needed (only once)
                if (!HAS_SVG) {
                    if (!doc.namespaces.scvprogressbar) {
                        doc.namespaces.add("scvprogressbar", "urn:schemas-microsoft-com:vml", "#default#VML");
                    }
                }
            }

            $(win).on("resize" + self._eventNS, proxy(self._winResize, self));

			// set the value and render the progress bar
			self._value = options.value;
			self._render();

			// initialize the disabled state
			self.enabled(options.enabled);
		},

        _winResize: function() {
            this._render();
        },

		_render: function() {
			var self = this,
				options = self.options,
                layout = options.layout,
                reversed = options.reversed,
                min = options.min,
                max = options.max,
                value = self._value,
				textOptions = options.text,
				element = $(self.element),
				elementWidth = element.width(),
				elementHeight = element.height(),
				inner = self.inner,
				total = max - min,
				size = toInt((value - min) * 100 / total),
				height,
				textWidth,
				textHeight;

			if (layout === LAYOUT_VERTICAL) {
				// vertical layout

				// set the height of the value element as pixels, not percents
			    height = toInt(size * elementHeight / 100);

				inner.css({
					width: "100%",
					height: height + PX,
					"margin-top": (reversed ? "0" : (elementHeight - height)) + PX
				});
			}
            else if (layout === LAYOUT_HORIZONTAL) {
				// horizontal layout - width of inner is in percents
				inner.css({
					width: size + "%",
					height: elementHeight + PX
				});
			}
            else if (layout === LAYOUT_CIRCULAR) {
                var circularHtml = "",
                    circularOptions = options.layoutOptions[layout],
                    circularOptionsWidth = circularOptions.width,
                    circularOptionsBorderWidth = circularOptions.borderWidth,
                    circularOptionsColor = self._enabled ? circularOptions.color : circularOptions.colorDisabled,
                    circularOptionsBorderColor = circularOptions.borderColor,
                    circularOptionsBackgroundColor = circularOptions.backgroundColor,
                    circularCenterX = elementWidth/2,
                    circularCenterY = elementHeight/2,
                    cicrularRadius = (elementWidth > elementHeight ? circularCenterY : circularCenterX ) - circularOptionsWidth / 2 - 1,
                    cicrularDiameter = cicrularRadius * 2,
                    circularArcLengthDeg = toInt((value - min) * 360 / total),
                    circularArcStartDeg = reversed ? (360 - circularArcLengthDeg) : 0,
                    circularArcEndDeg = circularArcStartDeg + circularArcLengthDeg,
                    circularStrokeWidth = circularOptionsWidth - 2 * circularOptionsBorderWidth;

                if (HAS_SVG) {
                    // SVG rendering
                    circularHtml = '<svg xmlns="' + SVG_NS + '" version="1.1" width="' + elementWidth + '" height="' + elementHeight + '">';

                    // draw the outer circle for the border if borderwidth > 0
                    if (circularOptionsBorderWidth > 0) {
                        circularHtml += '<circle cx="' + circularCenterX + '" cy="' + circularCenterY + '" r="' + cicrularRadius + '" stroke="' + circularOptionsBorderColor + '" ' + 
                            'stroke-width="' + circularOptionsWidth + '" fill="none" />';
                    }

                    // draw the value if needed
                    if (value >= max) {
                        // if full value - draw full circle
                        circularHtml += '<circle cx="' + circularCenterX + '" cy="' + circularCenterY + '" r="' + cicrularRadius + '" stroke="' + circularOptionsColor + '" ' + 
                            'stroke-width="' + circularStrokeWidth + '" fill="none" />';
                    }
                    else {
                        // else, draw background for empty value
                        circularHtml += '<circle cx="' + circularCenterX + '" cy="' + circularCenterY + '" r="' + cicrularRadius + '" stroke="' + circularOptionsBackgroundColor + '" ' + 
                            'stroke-width="' + circularStrokeWidth + '" fill="none" />';

                        // and draw the arc for the value
                        circularHtml += '<path d="' + describeArc(circularCenterX, circularCenterY, cicrularRadius, circularArcStartDeg, circularArcEndDeg) + '" ' + 
                            'stroke="' + circularOptionsColor + '" stroke-width="' + circularStrokeWidth + '" fill="none" />';
                    }

                    circularHtml += '</svg>';
                }
                else {
                    // VML rendering
                    circularHtml += '<scvprogressbar:group style="width:' + elementWidth + 'px; height:' + elementHeight + 'px;" ' + 
					    'coordsize="' + elementWidth + ',' + elementHeight + '">';

                    // draw the outer border circle for the border if borderwidth > 0
                    if (circularOptionsBorderWidth > 0) {
                        circularHtml += '<scvprogressbar:oval style="width:' + cicrularDiameter + 'px; height:' + cicrularDiameter + 'px; position:relative; ' + 
                            'top:' + circularCenterY + 'px; left:' + circularCenterX + 'px;" strokeweight="' + circularOptionsWidth + 'px" strokecolor="' + circularOptionsBorderColor + '" fill="false">' + 
                            '<scvprogressbar:fill opacity="0%" color="transparent" />' + 
                            '</scvprogressbar:oval>';
                    }

                    // draw the value if needed
                    if (value >= max) {
                        // if full value - draw full circle
                        circularHtml += '<scvprogressbar:oval style="width:' + cicrularDiameter + 'px; height:' + cicrularDiameter + 'px; position:relative; ' + 
                            'top:' + circularCenterY + 'px; left:' + circularCenterX + 'px;" strokeweight="' + circularStrokeWidth + 'px" strokecolor="' + circularOptionsColor + '" fill="false">' + 
                            '<scvprogressbar:fill opacity="0%" color="transparent" />' + 
                            '</scvprogressbar:oval>';
                    }
                    else {
                        // else, draw background for empty value
                        circularHtml += '<scvprogressbar:oval style="width:' + cicrularDiameter + 'px; height:' + cicrularDiameter + 'px; position:relative; ' + 
                            'top:' + circularCenterY + 'px; left:' + circularCenterX + 'px;" strokeweight="' + circularStrokeWidth + 'px" strokecolor="' + circularOptionsBackgroundColor + '" fill="false">' + 
                            '<scvprogressbar:fill opacity="0%" color="transparent" />' + 
                            '</scvprogressbar:oval>';

                        // draw the arc
                        circularHtml += '<scvprogressbar:arc style="width:' + cicrularDiameter + 'px; height:' + cicrularDiameter + 'px; position:relative; ' + 
                            'top:' + circularCenterY + 'px; left:' + circularCenterX + 'px;" fill="false" strokeweight="' + circularStrokeWidth + 'px" ' + 
                            'strokecolor="' + circularOptionsColor + '" startangle="' + circularArcStartDeg + '" endangle="' + circularArcEndDeg + '">' + 
                            '<scvprogressbar:fill opacity="0%" color="transparent" /></scvprogressbar:arc>';
                    }

                    circularHtml += '</scvprogressbar:group>';
                }

                element.html(circularHtml);
            }
            else {
                // unknown layout - return
                return;
            }

			// render the text if enabled - in the middle of the container div
			if (textOptions.enabled) {
				// remove all text elements inside the progress
				element.find(".sui-progressbar-text").remove();

				// add a span element to hold the text and we will position it absolutely
				self.text = $('<div class="sui-progressbar-text" />')
                    .appendTo(element)
                    .html(shield.format.call(self, textOptions.template, self._value));

				textWidth = self.text.width();
				textHeight = self.text.height();

				// center the text element
				self.text.css({
					top: ((elementHeight - textHeight) / 2) + PX,
					left: ((elementWidth - textWidth) / 2) + PX
				});
			}
		},

		// setter/getter
		value: function() {
			var self = this,
				options = self.options,
				args = [].slice.call(arguments),
				newVal;

			if (args.length > 0) {
				// setter
				if (self._enabled) {
					// bind the new value between min and max
					newVal = mathMax(mathMin(args[0], options.max), options.min);

					var event = self.trigger("change", {value: newVal});

					if (!event.isDefaultPrevented()) {
						self._value = newVal;
						self._render();

						if (newVal >= options.max) {
							self.trigger("complete");
						}
					}
				}
			}
			else {
				// getter
				return self._value;
			}
		},

		// setter/getter
		enabled: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-progressbar-disabled");
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-progressbar-disabled");
				}

				self._enabled = bEnabled;

                // re-render the control if circular, in order to update the colors
                if (self.options.layout == LAYOUT_CIRCULAR) {
                    self._render();
                }
			}
			else {
				// getter
				return self._enabled;
			}
		},

		destroy: function() {
		    var self = this,
                cls = self.options.cls;

            $(win).off(self._eventNS);

		    $(self.element)
                .removeClass("sui-progressbar sui-progressbar-disabled sui-progressbar-vertical sui-progressbar-circular" + (cls ? (" " + cls) : ""))
				.empty();

		    Widget.fn.destroy.call(self);
		}
	});
	ProgressBar.defaults = progressBarDefaults;
    shield.ui.plugin("ProgressBar", ProgressBar);

})(jQuery, shield, this);