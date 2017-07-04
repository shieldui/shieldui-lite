(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		extend = $.extend,
        is = shield.is,
        isUndefined = is["undefined"],
        CHANGE = "change",
        ratingDefaults,
        Rating;

    // the default configuration options for the loadingpanel
    ratingDefaults = {
        min: 0,
        max: 5,
        step: 1,
        symbolWidth: 16,
        symbolHeight: 16,
        enabled: true,
        markPreset: false,
        value: 0,
        events: {
            //change - fires when value is changed
        }
    };
    // Public methods:
    //  enabled()/enabled(bool)
    //  visible/visible(bool)
    //  value/value(number)

    // Rating class
    Rating = Widget.extend({
        // initialization method, called by the framework

        init: function (element, userOptions) {
            var self = this;

            // call the parent init
            Widget.fn.init.apply(self, arguments);

            self._enabled = self.options.enabled;

            //this method renders the rating control, 
            //setting css classes and hover effects
            self._renderRating(element, userOptions, false);
        },

        //this internal method visualizes the selection done by the user. 
        //It selects as many stars, as the user hovered over
        _setSelection: function (value) {
            var self = this;

            if (self._enabled) {
                 
                self._value = value;

                if (self._markPreset) { //if it was a preset value, unset that.
                    self._markPreset = false;
                }
                self._range.find('.sui-rating-hover').hide();
                self._range.find('.sui-rating-selected')
                    .width(value * self._symbolWidth - (self._min * self._symbolWidth))
                    .show();
        
                self.trigger(CHANGE);

                return true;
            }
        },

        //this function calculates the score based on the current position of the mouse.
        _calcRawScore: function (element, event) {
            var self = this,
                pageX = (event.changedTouches) ? event.changedTouches[0].pageX : event.pageX,
                offsetx = pageX - $(element).offset().left;

            if (!self._ltr) { 
                offsetx = self._range.width() - offsetx;
            }
            if (offsetx > self._range.width()) { 
                offsetx = self._range.width(); 
            }
            if (offsetx < 0) { 
                offsetx = 0;
            }

            return Math.ceil(offsetx / self._symbolWidth * (1 / self._step));
        },

        //sets the hover element based on the score.
        _setHover: function (score) {
            var self = this,
                w,
                h;

            if (self._enabled) {
                w = score * self._symbolWidth * self._step;
                h = self._range.find('.sui-rating-hover');

                if (h.width() != w) {
                    self._range.find('.sui-rating-selected').hide();
                    h.width(w).show();
                }
            }
        },

        //touch converter http://ross.posterous.com/2008/08/19/iphone-touch-events-in-javascript/
        _touchHandler: function (event) {
            var touches = event.originalEvent.changedTouches,
                first = touches[0],
                type = "";

            switch (event.type)
            {
                case "touchmove": 
                    type = "mousemove";
                    break;
                case "touchend": 
                    type = "mouseup";
                    break;
                default: 
                    return;
            }

            var simulatedEvent = document.createEvent("MouseEvent");
            simulatedEvent.initMouseEvent(
                type, true, true, win, 1,
                first.screenX, first.screenY,
                first.clientX, first.clientY, false,
                false, false, false, 0/*left*/, null
            );

            first.target.dispatchEvent(simulatedEvent);
            event.preventDefault();
        },

        _renderRating: function (element, userOptions, reset) {
            var self = this,
                index = 1,
                options = {};

            self._item = self.element;

            if (!self._item.hasClass('sui-rating')) { 
                self._item.addClass('sui-rating');
            }

            self._ltr = !self.element.parent().hasClass("sui-rtl"); 

            if (reset) {
                var newValue = null;
                if (isUndefined(self._value)) {
                    newValue = isNaN(userOptions.value) ? ratingDefaults.value : userOptions.value;
                    self._value = newValue;
                }
                else {
                    newValue = self._value;
                }

                if (self._enabled) {
                    self._wired = false;
                }
            }

            //init shieldRating plugin
            if (!self._initialized) {
                //get our values, either from the data-* html5 attribute or from the userOptions.
                self._min = isNaN(userOptions.min) ? ratingDefaults.min : userOptions.min;
                self._max = isNaN(userOptions.max) ? ratingDefaults.max : userOptions.max;
                self._step = isNaN(userOptions.step) ? ratingDefaults.step : userOptions.step;
                self._symbolWidth = isNaN(userOptions.symbolWidth) ? ratingDefaults.symbolWidth : userOptions.symbolWidth;
                self._symbolHeight = isNaN(userOptions.symbolHeight) ? ratingDefaults.symbolHeight : userOptions.symbolHeight;
                self._value = isNaN(userOptions.value) ? ratingDefaults.value : userOptions.value;
                self._markPreset = isNaN(userOptions.markPreset) ? ratingDefaults.markPreset : userOptions.markPreset;

                element = self._item[0].nodeName == 'DIV' ? 'div' : 'span';
                index++;
                var html = '<{{element}} id="shieldRating-range-{{index}}" class="sui-rating-range" tabindex="0"><{{element}} class="sui-rating-selected" style="height:' +
                    self._symbolHeight + 'px"></{{element}}><{{element}} class="sui-rating-hover" style="height:' +
                    self._symbolHeight + 'px"></{{element}}></{{element}}>';

                var normalizedhtml = html.replace(/{{index}}/gi, index).replace(/{{element}}/gi, element);
                this.element.append(normalizedhtml);

                self._initialized = true;
            }

            //resize the height of all elements, 
            self._item.find('.sui-rating-selected, .sui-rating-hover').height(self._symbolHeight);

            //set the range element to fit all the stars.
            self._range = self._item.find('.sui-rating-range');
            self._range.width(self._symbolWidth * (self._max - self._min)).height(self._symbolHeight);

            //add/remove the preset class
            var presetclass = 'sui-rating-preset' + ((self._ltr) ? '' : '-rtl');
            if (self._markPreset) {
                self._item.find('.sui-rating-selected').addClass(presetclass);
            }
            else {
                self._item.find('.sui-rating-selected').removeClass(presetclass);
            }

            //set the value if we have it.
            if (self._value != null) {
                var score = (self._value - self._min) * self._symbolWidth;
                self._item.find('.sui-rating-selected').width(score);
            }

            //when the mouse goes over the self._range element, we set the "hover" stars.
            if (!self._wired) {
                if (self._enabled) {
                    if (!reset) {
                        self._range.on('touchmove touchend', self._touchHandler); //bind touch events

                        self._range.mousemove(function (e) {
                            var score = self._calcRawScore(this, e);
                            self._setHover(score);
                        });
                        //when the mouse leaves the self._range, we have to hide the hover stars, and show the current value.
                        self._range.mouseleave(function (e) {
                            self._range.find('.sui-rating-hover').hide().width(0);
                            self._item.trigger('hover', [null]).trigger('over', [null]);
                            self._range.find('.sui-rating-selected').show();
                        });
                        //when we click on the self._range, we have to set the value, hide the hover.
                        self._range.mouseup(function (e) {
                            var score = self._calcRawScore(this, e);
                            var value = (score * self._step) + self._min;
                            self._setSelection(value);
                            self._range.blur();
                        });

                        //support key nav
                        self._range.keyup(function (e) {
                            if (e.which == 38 || e.which == (self._ltr ? 39 : 37)) {
                                self._setSelection(Math.min(self._value + self._step, self._max));
                            }
                            if (e.which == 40 || e.which == (self._ltr ? 37 : 39)) {
                                self._setSelection(Math.max(self._value - self._step, self._min));
                            }
                        });
                    }
                }

                self._wired = true;
            }
        },

        // If no arguments are passed to this method, it will return the current value of the widget. 
        // If a numeric value is passed, this will become the new value of the rating
        value: function () {
            var self = this,
                options = self.options,
                args = [].slice.call(arguments);
   
            if (args.length > 0) {
                // setter
                var newvalue = args[0];

                if (newvalue < self._min || newvalue > self._max) {
                    return;
                }

                self.options.value = newvalue;
                self._value = newvalue;
                self._renderRating(self, options, true);
            }
            else {
                // getter
                return isUndefined(self._value) ? (isUndefined(options.value) ? self._value : options.value) : self._value;
            }
        },

        //this method enables/disables the control, and allows user interactions and hover effects
        enabled: function () {
            var self = this,
                options = self.options,
                element = self.element,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                self._enabled = args[0];
                self._renderRating(self, options, true);

                if (self._enabled) {
                    element.removeClass("sui-rating-disabled");
                }
                else {
                    element.addClass("sui-rating-disabled");
                }
            }
            else {
                return self._enabled;
            }
        },

        // rating destructor
        destroy: function () {
            var self = this;

            $(self.element)
                .removeClass("sui-rating-hover sui-rating-selected sui-rating-disabled sui-rating-preset-rtl sui-rating-preset sui-rating")
                .empty();

            self._range.off('touchmove touchend', self._touchHandler);

            // set some internal properties to null
            self._markPreset =
                self._enabled =
                self._min =
                self._max =
                self._value =
                self._ltr =
                self._item =
                self._symbolWidth =
                self._symbolHeight = 
                self._step =
                self._wired =
                self._initialized = 
                self._range = null;

            Widget.fn.destroy.call(self);
        }
    });
    Rating.defaults = ratingDefaults;
    shield.ui.plugin("Rating", Rating);

})(jQuery, shield, this);