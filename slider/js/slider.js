(function ($, shield, win, UNDEFINED) {
    //"use strict";

    var Widget = shield.ui.Widget,
		Class = shield.Class,

        doc = document,
        mathAbs = Math.abs,
		mathMin = Math.min,
        mathMax = Math.max,
		mathFloor = Math.floor,
        proxy = $.proxy,
        each = $.each,
        map = $.map,

		keyCode = shield.Constants.KeyCode,
        shieldFormat = shield.format,
        error = shield.error,
        shieldIs = shield.is,
        isDefined = shieldIs.defined,
        isString = shieldIs.string,
        isObject = shieldIs.object,
        isFunction = shieldIs.func,
		toNumber = shield.to.number,

        ARIA_DESCRIBEDBY = "aria-describedby",
        VALUE = "value",
        TABINDEX = "tabindex",
        DISABLED = "disabled",
		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",
		BOTH = "both",
		TOP = "top",
        BOTTOM = "bottom", 
		LEFT = "left",
		UP = "up",
		RIGHT = "right",
		DOWN = "down",
		CLICK = "click",
		KEYDOWN = "keydown",
		SLIDE = "slide",
		CHANGE = "change",
		FOCUS = "focus",
        BLUR = "blur",
		PX = "px",

        sliderDefaults, Slider;

	// Slider class - slider defaults
    sliderDefaults = {
		cls: UNDEFINED,
        orientation: HORIZONTAL,    // horizontal|vertical
        min: 0,
        max: 100,
		value: UNDEFINED,
        step: 1,
		largeStep: 2,
        enabled: true,
		buttons: false,
		values: {
            enabled: true,
            template: "{0}"
        },
		ticks: {
			enabled: false,
			type: BOTH, // both|top|bottom|left|right
			step: 1
		},
		tooltip: {
			enabled: false,
			template: "{0}"
		},
		width: UNDEFINED,
		height: UNDEFINED,
        events: {
            // change
            // slide
            // focus
            // blur
        }
    };
	Slider = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
                options = self.options,
				cls = options.cls,
                value = options.value,
                dieOnError = options.dieOnError,
                orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
                element,
                original,
                originalTabindex,
                eventNS;

			// save the original element and other initializations
			self._original = original = $(self.element);

            // check whether original is input
			if (original.prop("tagName").toLowerCase() !== "input") {
				error("shieldSlider: Underlying element is not INPUT", dieOnError);
                return;
			}

            // wrap the original element in a new one
            self.element = element = original.wrap('<div class="sui-slider sui-slider-' + orientation + (cls ? (' ' + cls) : '') + '" />').parent();

            self._eventNS = eventNS = ".shieldSlider" + self.getInstanceId();

            // hide the original element
            original.hide();

            // add tabindex for the element so that it can be selected on focus
			originalTabindex = original.attr(TABINDEX);
			element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");

            element
                .on(FOCUS + eventNS, proxy(self._focus, self))
                .on(BLUR + eventNS, proxy(self._blur, self))
			    .on(KEYDOWN + eventNS, proxy(self._keyDown, self));

            $(win).on("resize" + eventNS, proxy(self._onWinResize, self));

			// apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css("width", options.width);
			}
			if (isDefined(options.height)) {
				element.css("height", options.height);
			}

			self._buttonOffset = 5;
			self._buttonScaleOffset = 20;
			self._width = element.innerWidth();
			self._height = element.innerHeight();

			self._buttons = self._createButtons();
			self._scale = self._createScale();
			self._ticks = self._createTicks();
			self._createBar();
			self._showValues();

            // save the element's dimensions
            self._elWidth = element.width();
            self._elHeight = element.height();

            // get the value from the value attribute of the original 
            // input element if no value option was specified
            if (!isDefined(value)) {
                value = toNumber(self._value());
            }

            // ARIA
            element
                .attr("role", "slider")
                .attr("aria-orientation", orientation)
                .attr("aria-valuemin", options.min)
                .attr("aria-valuemax", options.max);

            self.value(value);

            self.enabled(options.enabled);
		},

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

		_createButtons: function() {
			var self = this,
				options = self.options,
				orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				buttons = [],
                button,
                arrow,
                buttonWidth;

			if (!options.buttons) { 
				return;
			}

			button = $('<div class="sui-slider-button sui-unselectable" unselectable="on" />')
                .appendTo(self.element);
			arrow = $('<span class="sui-slider-button-arrow-' + (isHorizontal ? LEFT : UP) + ' sui-unselectable" unselectable="on" />')
                .appendTo(button);
			buttonWidth = button.outerWidth();
			button.css({
				left: isHorizontal ? self._buttonOffset : (self._width - buttonWidth) / 2,
				top: isHorizontal? (self._height - buttonWidth) / 2 : self._buttonOffset
			});
			button.click(function() {
                if (!self._hasFocus) {
                    self.element.focus();
                }
				self._stepPrev();
			});
			buttons.push(button);

			button = $('<div class="sui-slider-button sui-unselectable" unselectable="on" />')
                .appendTo(self.element);			
			arrow = $('<span class="sui-slider-button-arrow-' +  (isHorizontal ? RIGHT : DOWN) + ' sui-unselectable" unselectable="on" />')
                .appendTo(button);
			button.css({
				left: isHorizontal ? self._width - (self._buttonOffset + buttonWidth) : (self._width - buttonWidth) / 2,
				top: isHorizontal? (self._height - buttonWidth) / 2 : self._height - (self._buttonOffset + buttonWidth)
			});
			button.click(function() {
                if (!self._hasFocus) {
                    self.element.focus();
                }
				self._stepNext();
			});
			buttons.push(button);

			return buttons;
		},

		_createScale: function() {
			var self = this,
				options = self.options,
				orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				buttonWidth = self._buttons ? self._buttons[0].outerWidth() : 0,
				scale = $('<div class="sui-slider-scale sui-slider-scale-' + orientation + ' sui-unselectable" unselectable="on" />')
                    .appendTo(self.element);

            scale.css({
                left: isHorizontal ? self._buttonOffset + buttonWidth + self._buttonScaleOffset : (self._width - scale.outerWidth()) / 2,
                top: isHorizontal ? (self._height - scale.outerHeight()) / 2 : self._buttonOffset + buttonWidth + self._buttonScaleOffset
            });

			if (isHorizontal) {
				scale.width(self._width - 2 * (self._buttonOffset + self._buttonScaleOffset + buttonWidth));
			}
			else {
				scale.height(self._height - 2 * (self._buttonOffset + self._buttonScaleOffset + buttonWidth));
			}

			scale.on(CLICK, proxy(self._scaleClick, self));

			return scale;
		},

		_scaleClick: function(e) {
			var self = this,
				orientation = self.options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				ev = e.originalEvent,
				tickInfo,
                margin,
				proximity,
				targetInfo,
				i,
                sourceValue = isHorizontal ? ev.clientX : ev.clientY,
                elementOffset = self.element.offset(),
                offset = mathFloor(isHorizontal ? elementOffset.left : elementOffset.top);

            if (!self._hasFocus) {
                self.element.focus();
            }

			if (!self._enabled) {
				return;
			}

			for(i=0; i<self._ticks.length; i++) {
				tickInfo = self._ticks[i];				
				margin = mathAbs(sourceValue - (tickInfo.tick + offset));
				if (proximity === UNDEFINED || proximity > margin) {					
					proximity = margin;
					targetInfo = tickInfo;
				}				
			}

			self._moveBar(targetInfo);
		},

		_keyDown: function(e) {
			var self = this,
				orientation = self.options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				ev = e.originalEvent,
				code = ev.keyCode,
				end = self._ticks.length - 1,
				stepPrev = code === (isHorizontal ? keyCode.LEFT : keyCode.UP),
				stepNext = code === (isHorizontal ? keyCode.RIGHT : keyCode.DOWN),
				largeStepPrev = code === (isHorizontal ? keyCode.PAGEDOWN : keyCode.PAGEUP),
				largeStepNext = code === (isHorizontal ? keyCode.PAGEUP : keyCode.PAGEDOWN),
				goToStart = code == keyCode.HOME,
				goToEnd = code == keyCode.END;

			if (ev.ctrlKey || !self._enabled) {
                return;
            }

            if (stepPrev || largeStepPrev) {
				self._stepPrev(largeStepPrev);
                e.preventDefault();
			}
			else if (stepNext || largeStepNext) {
				self._stepNext(largeStepNext);
                e.preventDefault();
			}
			else if (goToStart) {
				self._moveBar(self._ticks[0]);
                e.preventDefault();
			}
			else if (goToEnd) {
				self._moveBar(self._ticks[end]);
                e.preventDefault();
			}
		},

		_createTicks: function() {
			var self = this,
				options = self.options,
				orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				max = options.max,
				min = options.min,
				step = options.step,
				ticksOption = options.ticks,
                ticksType = ticksOption.type,
                ticksStep = ticksOption.step,
				tick, 
                ticks, 
                tickInfo,
                size, 
                tickSize, 
                remainder = 0,
				tickCount = mathFloor((max - min) / step),
				scale = UNDEFINED,				
                accumulate = 0,				
				fraction,
				tickPosition,
                i;

			ticks = [];
			size = isHorizontal ? self._scale.outerWidth() : self._scale.outerHeight();

			if (tickCount <= size) {
				tickSize = mathFloor(size / tickCount);
				remainder = size % tickCount;
				fraction = (size / tickCount) - tickSize;
			}
			else {
				scale = (tickCount / size) * step;
				tickCount = size;
				tickSize = 1;
				step = 1;
			}

			tickPosition = isHorizontal ? self._scale.position().left : self._scale.position().top;
			for(i=0; i<=tickCount; i++) {
				// store tick info
				tickInfo = {
					value: min + (i * (scale || step)),
					tick: tickPosition
				};
				ticks.push(tickInfo);
				accumulate += fraction;				
				if (accumulate >= 1) {
					tickPosition++;
					accumulate--;
				}
				tickPosition += tickSize;				
			}
			
			if (ticksOption.enabled) {
				// check for divisible greater or equal tooltip step				
				for(i=0; i<=tickCount; i+=ticksStep) {
					tickInfo = ticks[i];

					// create topleft ticks
					if (ticksType === TOP || ticksType === LEFT || ticksType === BOTH) {
						tick = self._createTick();
						tick.css({
							left: isHorizontal ? tickInfo.tick + PX : self._scale.position().left - tick.outerWidth() + PX,
							top: isHorizontal ? self._scale.position().top - tick.outerHeight() + PX : tickInfo.tick + PX
						});
					}

					// create bottomright ticks
					if (ticksType === BOTTOM || ticksType === RIGHT || ticksType === BOTH) {
						tick = self._createTick();
						tick.css({
							left: isHorizontal ? tickInfo.tick + PX : self._scale.position().left + self._scale.outerWidth() + PX,
							top: isHorizontal ? self._scale.position().top + self._scale.outerHeight() + PX : tickInfo.tick + PX
						});
					}
				}
			}
			
			return ticks;
		},

		_createTick: function() {
            return $('<div class="sui-slider-tick sui-slider-tick-' + this.options.orientation + ' sui-unselectable" unselectable="on" />')
                .insertAfter(this._scale);
		},

		_showValues: function() {
			var self = this,
				options = self.options,
				orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				max = options.max,
				min = options.min,
				step = options.step,
                values = options.values || {},
				info,
				label,
				i;

			if (!values.enabled) {
				return;
			}

			for(i=0; i<self._ticks.length; i++) {
				info = self._ticks[i];
				if (info.value === min || info.value === max) {					
					label = $('<div class="sui-slider-mark sui-unselectable" unselectable="on">' + shieldFormat(values.template, info.value) + '</div>')
                        .insertAfter(self._scale);

                    label.css({
                        left: isHorizontal ? (info.tick - 2) - label.width()/2 : self._scale.position().left + self._scale.outerWidth() + self._bar.width() / 2,
                        top: isHorizontal ? self._scale.position().top - self._scale.height() - self._bar.width() / 2 : info.tick - label.height() / 2
                    });
				}
			}
		},

		_createBar: function() {
			var self = this,
				isHorizontal = self.options.orientation == HORIZONTAL,
				bar, 
                marginH, 
                marginV, 
                tickInfo, 
                allowedPositions,
                i;

			self._bar = bar = $('<div class="sui-slider-bar sui-unselectable" id="' + shield.strid() + '" unselectable="on" />')
                .appendTo(self.element)
                .mousedown(function() {
                    if (!self._hasFocus) {
                        self.element.focus();
                    }
                });

			marginH = (bar.innerWidth() - self._scale.outerHeight()) / 2 + 1 /*bar borderWidth*/;
			marginV = (bar.innerWidth() - self._scale.outerWidth()) / 2 + 1 /*bar borderWidth*/;

			bar.css({ 
				left: isHorizontal ? self._scale.position().left - (bar.outerWidth() / 2) + PX : self._scale.position().left - marginV + PX, 
				top: isHorizontal ? self._scale.position().top - marginH + PX : self._scale.position().top - (bar.outerWidth() / 2)  + PX 
			});

			allowedPositions = [];
			for(i=0; i < self._ticks.length; i++) {
				tickInfo = self._ticks[i];
				allowedPositions.push({
					x: isHorizontal ? tickInfo.tick - (bar.outerWidth() / 2) : UNDEFINED,
					y: isHorizontal ? UNDEFINED : tickInfo.tick - (bar.outerWidth() / 2)
				});
			}

			self._dragBar = new shield.ui.Draggable(bar, {
				allowedPositions: allowedPositions,
				events: {					
					drag: function(e) {
						self._changeTooltipValue(true);
						self.trigger(SLIDE);
					},
					stop: function(e) {
						self._value(self.value());
                        // hide the tooltip if mouse is not over the bar
                        if (self._tooltip && $("#" + self._bar.attr("id") + ":hover").length <= 0) {
                            self._tooltip.visible(false);
                        }
						self.trigger(CHANGE, { value: self.value() });
					}
				}
			});

			self._createTooltip();
		},

		_stepNext: function(isLargeStep) {
			var self = this,
                options = self.options,
				isHorizontal = options.orientation == HORIZONTAL,
				step = options.step,
				largeStep = options.largeStep,
				current,
				next,
				targetInfo;

			if (!self._enabled) {
				return;
			}
			
            isLargeStep = !!isLargeStep;

			current = self._getCurrentTickInfoIndex();
			next = isLargeStep ? current + mathFloor(largeStep / step) : current + 1;
			if (next >= self._ticks.length) {
				return;
			}

			targetInfo = self._ticks[next];
			self._moveBar(targetInfo);			
		},

		_stepPrev: function(isLargeStep) {
			var self = this,
                options = self.options,
				isHorizontal = options.orientation == HORIZONTAL,
				step = options.step,
				largeStep = options.largeStep,
				current, 
				prev,
				targetInfo;
				
			if (!self._enabled) {
				return;
			}

            isLargeStep = !!isLargeStep;

			current = self._getCurrentTickInfoIndex();
			prev = isLargeStep ? current - mathFloor(largeStep / step) : current - 1;
			if (prev < 0) {
				return;
			}

			targetInfo = self._ticks[prev];
			self._moveBar(targetInfo);
		},

		_moveBar: function(targetInfo, skipEvent) {
			var self = this,
				isHorizontal = self.options.orientation == HORIZONTAL,
                bar = self._bar;

			if (!targetInfo) {
				return;
			}

			bar.css({
				left: isHorizontal ? targetInfo.tick - (bar.outerWidth() / 2) + PX : bar.css(LEFT),
				top: isHorizontal ? bar.css(TOP) : targetInfo.tick - (bar.outerWidth() / 2) + PX
			});

			self._changeTooltipValue();
			self._value(self.value());

            // ARIA
            self.element.attr("aria-valuenow", targetInfo.value);

            if (!skipEvent) {
                self.trigger(CHANGE, { value: self.value() });
            }
		},

		_createTooltip: function() {
			var self = this,
				options = self.options,
				tooltipOptions = options.tooltip,
				isHorizontal = options.orientation == HORIZONTAL;

			if (!tooltipOptions || !tooltipOptions.enabled) {
				return;
			}

			self._tooltip = new shield.ui.Tooltip(self._bar, {
				content: shieldFormat(tooltipOptions.template, self.value()),
				position: isHorizontal ? TOP : LEFT,				
                delay: 0
			});

            // ARIA
            self.element.attr(ARIA_DESCRIBEDBY, self._bar.attr(ARIA_DESCRIBEDBY));
		},

		_changeTooltipValue: function(show) {
			var self = this,
				tooltipOptions = self.options.tooltip,				
				current,
                tooltip = self._tooltip;

			if (!tooltip) {
				return;
			}

			current = shieldFormat(tooltipOptions.template, self.value());

			if (tooltip.options.content !== current) {
                tooltip.refresh({
                    content: current, 
                    enabled: self._enabled
                });

                // ARIA
                self.element.attr(ARIA_DESCRIBEDBY, self._bar.attr(ARIA_DESCRIBEDBY));
			}

            if (show) {
                tooltip.visible(true, self._bar);
            }
		},

		_getCurrentTickInfoIndex: function() {
			var self = this,
				isHorizontal = self.options.orientation == HORIZONTAL,
				ticks = self._ticks,
                tickPos,
                bar = self._bar,
				barPos = isHorizontal ? bar.position().left : bar.position().top,
                halfBarWidth = bar.outerWidth() / 2,
				i,
                minDiff = Number.POSITIVE_INFINITY,
                minDiffIndex = -1,
                absDiff;

            // check which is the closest tick 
			for(i=0; i<ticks.length; i++) {
                tickPos = ticks[i].tick - halfBarWidth;

				if (barPos == tickPos) {
					return i;
				}
                else {
                    absDiff = mathAbs(barPos - tickPos);
                    if (absDiff < minDiff) {
                        minDiff = absDiff;
                        minDiffIndex = i;
                    }
                }
			}

			return minDiffIndex;
		},

		_getTickInfoIndexByValue: function(value) {
			var self = this,
				ticks = self._ticks,
				i;

			for(i=0; i<ticks.length; i++) {		
				if (value == ticks[i].value) {
					return i;
				}
			}

			return -1;
		},

		_focus: function(event) {
            var self = this;

            if (!self._hasFocus) {
                self._hasFocus = true;
                $(self.element).addClass("sui-slider-focus");
                self.trigger(FOCUS);
            }
        },

		_blur: function(event) {
			var self = this;

            if (self._hasFocus) {
                self._hasFocus = false;
                $(self.element).removeClass("sui-slider-focus");
                self.trigger(BLUR);
            }
		},

        _onWinResize: function(event) {
            var self = this;

            if (self._onWinResTimeout) {
                clearTimeout(self._onWinResTimeout);
            }

            self._onWinResTimeout = setTimeout(proxy(self._winResized, self), 100);
        },

        _winResized: function() {
            var self = this,
                element = self.element;

            // if any of the element dimensions has changed, reinitialize it
            if (self._elWidth !== element.width() || self._elHeight !== element.height()) {
                self.refresh();
            }
        },

        // getter/setter for the value attribute of the original element
        _value: function() {
            return this._original.attr.apply(this._original, [VALUE].concat([].slice.call(arguments)));
        },

        // getter/setter for the value of the slider
        value: function() {
			var self = this,
				min = self.options.min,
				args = [].slice.call(arguments),
				tickInfo,
				target;

            if (args.length > 0) {
				// setter
                target = self._getTickInfoIndexByValue(args[0]);
				if (target !== -1) {					
					tickInfo = self._ticks[target];
					self._moveBar(tickInfo, true);
				}
            }
			else {
                // getter
				target = self._getCurrentTickInfoIndex();
				tickInfo = self._ticks[target];
				return tickInfo ? tickInfo.value : min;
			}
        },

        // setter/getter for the enabled state of the slider
		enabled: function() {
			var self = this,
				element = $(self.element),
                original = self._original,
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element
						.removeAttr(DISABLED)
						.removeClass("sui-slider-disabled");
                    original.removeAttr(DISABLED);
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-slider-disabled");
                    original.attr(DISABLED, DISABLED);
				}

				self._enabled = bEnabled;
				self._dragBar.enabled(bEnabled);
				if (self._tooltip) {
					self._tooltip.enabled(bEnabled);
				}
			}
			else {
				// getter
				return self._enabled;
			}
		},

		// slider destructor
        destroy: function() {
            var self = this,
                eventNS = self._eventNS,
				i;

            $(win).off(eventNS);
            clearTimeout(self._onWinResTimeout);
            self._onWinResTimeout = null;

            $(self.element).off(eventNS);

            // destroy the dragbar
            if (self._dragBar) {
                self._dragBar.destroy();
                self._dragBar = null;
            }

            // unassign button handlers
            if (self._buttons) {
                for(i=0; i<self._buttons.length; i++) {
                    self._buttons[i].off(CLICK);
                }
            }

            // destroy tooltip
            if (self._tooltip) {
                self._tooltip.destroy();
                self._tooltip = null;
            }

            // remove all elements in the slider
            $(self.element).find(".sui-slider-scale, .sui-slider-mark, .sui-slider-tick, .sui-slider-bar, .sui-slider-button").remove();

            self._original
				.unwrap()
				.show();

			self._scale.off(CLICK);
            self._original = self._buttons = self._bar = self._scale = self._ticks = null;

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
    });
    Slider.defaults = sliderDefaults;
    shield.ui.plugin("Slider", Slider);

})(jQuery, shield, this);