(function ($, shield, win, UNDEFINED) {
    //"use strict";

    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
        Position = shield.ui.Position,
        keyCode = shield.Constants.KeyCode,
        strid = shield.strid,

        doc = document,
        mathAbs = Math.abs,
		mathMin = Math.min,
        mathMax = Math.max,
        proxy = $.proxy,
        each = $.each,
        map = $.map,

        to = shield.to,
        toInt = to["int"],
        shieldFormat = shield.format,
        error = shield.error,
        shieldIs = shield.is,
        isDefined = shieldIs.defined,
        isString = shieldIs.string,
        isObject = shieldIs.object,
        isFunction = shieldIs.func,
        isNull = shieldIs["null"],
        isNumber = shieldIs.number,
        isBoolean = shield.is["boolean"],

        tooltipDefaults, Tooltip,
		splitterDefaults, Splitter,
		accordionDefaults, Accordion,
        tabsDefaults, Tabs,

        ID = "id",
        ROLE = "role",
        TRUE = "true",
        FALSE = "false",
        ARIA_VALUENOW = "aria-valuenow",
        ARIA_CONTROLS = "aria-controls",
        ARIA_EXPANDED = "aria-expanded",
        ARIA_DISABLED = "aria-disabled",
        ARIA_DESCRIBEDBY = "aria-describedby",
        ARIA_SELECTED = "aria-selected",
        SINGLE = "single",
        KEYDOWN = "keydown",
        MOUSEENTER = "mouseenter",
        MOUSELEAVE = "mouseleave",
        CLICK = "click",
        FOCUS = "focus",
        BLUR = "blur",
        CHANGE = "change",
        TITLE = "title",
        CENTER = "center",
        MIDDLE = "middle",
        LEFT = "left",
        RIGHT = "right",
		UP = "up",
		DOWN = "down",
        TOP = "top",
        BOTTOM = "bottom",
		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",
		COLLAPSE = "collapse",
		EXPAND = "expand",
		RESIZE = "resize",
        TABINDEX = "tabindex",
        DISABLED = "disabled",

        ACCORDION_ITEM_INDEX_KEY = "suiaccitemindex",
        ACCORDION_ITEM_DATA_KEY = "suiaccitemdata",
        ACCORDION_ITEM_LOADED_KEY = "suiaccitemloaded",
        ACCORDION_ELEMENT_PARENT = "suiaccelparent",
        ACCORDION_ELEMENT_PREV = "suiaccelprev",

        reverseDirectionMap = {
            top: BOTTOM,
            bottom: TOP,
            left: RIGHT,
            right: LEFT,
            center: CENTER
        },

        SUI_TOOLTIP_TITLE = "sui-tooltip-title",
        SUI_TOOLTIP_SHOW_TIMEOUT = "sui-tooltip-sto",
        SUI_TOOLTIP_HIDE_TIMEOUT = "sui-tooltip-hto",
        SUI_TOOLTIP_TARGET_HOVER_CLS = "sui-tooltip-target-hover";


    // Tooltip class - tooltip defaults
    tooltipDefaults = {
        cls: UNDEFINED,
        enabled: true,
        visible: UNDEFINED, // optional target to show the tooltip for
        width: UNDEFINED,   // optional width of the tooltip
        height: UNDEFINED,  // optional height of the tooltip
        delay: 100,         // the delay in ms after which to show the tooltip
        filter: UNDEFINED,  // optional string of a jquery selector identifying to which elements children of the underlying element to attach tooltip
        content: function(target) {
            // this will hold any title attribute of the element a tooltip is assigned for
            return $(target).data(SUI_TOOLTIP_TITLE);
        },
        /*
        OR
        content: "Tooltip value!<br />With some <b>HTML</b>.",
        OR
        content: {
            remote: {
                url: "",        // REQUIRED
                iframe: false   // load the url in an iframe or use jQuery.load to load it in the window body
            }
        },
        OR
        content: function(target) {
            // this holds the widget
            return $(target).attr("data-tooltip");
        }
        */
        position: TOP,  // "top", "bottom", "left", "right", "center"
        // NOTE: the position supports the full dict format but only for internal use at the moment
        trigger: MOUSEENTER,    // event to show tooltip on - mouseenter, click, focus or null/UNDEFINED (manual show/hide using the visible() method)
        autoHide: true,         // hide the tooltip on mouseout
        callout: true,          // show a callout connector between the element and the tooltip
        events: {
            // show
            // hide
        }
    };
    // Public methods:
    //      bool visible()  /   void visible(boolVisible, target)
    //      bool enabled()  /   void enabled(boolEnabled)
    Tooltip = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
                contentOptions = options.content,
                positionOptions = options.position,
                cls = options.cls,
                filter = options.filter,
                trigger = options.trigger,
                autoHide = options.autoHide,
                optionsVisible = options.visible,
                optionsWidth = options.width,
                optionsHeight = options.height,
                calloutOptions = options.callout,
                element = $(self.element),
                tooltip,
                tooltipId = strid(),
                targets,
                sourcePos,
                targetPos,
                css;

            // validate the content options
            if (isObject(contentOptions) && (!contentOptions.remote || !contentOptions.remote.url)) {
                error("shieldTooltip: Invalid content options", options.dieOnError);
                return;
            }

            // generate an instance-unique event namespace
            self._eventNS = ".shieldTooltip" + self.getInstanceId();

            // set the current target to null
            self._currentTarget = null;

            // init the element which will contain the tooltip
            self._tooltip = tooltip = $('<div id="' + tooltipId + '"/>')
                .appendTo(doc.body);

            // add css style
            tooltip.addClass("sui-tooltip" + (cls ? (" " + cls) : ""));

            // add other styles
            css = {
                position: "absolute"
            };
            if (isDefined(optionsWidth)) {
                css.width = optionsWidth;
            }
            if (isDefined(optionsHeight)) {
                css.height = optionsHeight;
            }
            tooltip.css(css);

            // add the content element in the tooltip
            self._content = $('<div class="sui-tooltip-content"></div>')
                .appendTo(tooltip);

            // if auto hide is not enabled on mouseleave, add the close button
            if (!autoHide) {
                tooltip
                    .addClass("sui-tooltip-with-button")
                    .append('<div class="sui-tooltip-button">&times;</div>')
                    .click(proxy(self._hide, self, true));
            }

            // configure the position options
            // NOTE: this supports the full dict format too
            if (isObject(positionOptions)) {
                self._pos = positionOptions;
            }
            else {
                sourcePos = reverseDirectionMap[positionOptions] ? reverseDirectionMap[positionOptions] : BOTTOM;
                targetPos = reverseDirectionMap[positionOptions] ? positionOptions : TOP;

                // add adjustments for callout if enabled, so that it is not shown over the target
                if (calloutOptions && positionOptions != CENTER) {
                    targetPos += (targetPos == LEFT || targetPos == TOP) ? "-5" : "+5";
                }

                self._pos = {
                    source: sourcePos,
                    target: targetPos,
                    overflow: "flipfit"
                };
            }

            // add handler for after position set if callout enabled
            if (calloutOptions) {
                self._pos.callback = proxy(self._posSet, self);
            }

            // get the target elements to set tooltips for
            self._targets = targets = filter ? element.find(filter) : element;

            // init the events
            self._showEvent = trigger;
            self._hideEvent = null;
            if (autoHide) {
                if (trigger == MOUSEENTER || trigger == CLICK) {
                    self._hideEvent = MOUSELEAVE;
                }
                else if (trigger == FOCUS) {
                    self._hideEvent = BLUR;
                }
            }

            // setup the events for each target
            targets.each(function(index) {
                var el = $(this);

                // add hover handlers for hiding the tooltip and the show handler
                el.on(MOUSEENTER + self._eventNS, proxy(self._targetMouseEnter, self, el))
                    .on(MOUSELEAVE + self._eventNS, proxy(self._targetMouseLeave, self, el))
                    .on(self._showEvent + self._eventNS, proxy(self._onShow, self, el, true));

                // add the hide handler if any
                if (self._hideEvent) {
                    el.on(self._hideEvent + self._eventNS, proxy(self._onHide, self, el, true));
                }

                // ARIA
                el.attr(ARIA_DESCRIBEDBY, tooltipId);

                // ARIA NOTE: do we need to make the tooltip always shown when focused and hide on blur???
            });

            // init the destroyed property to false
            self._destroyed = false;

            // ARIA
            tooltip.attr(ROLE, "tooltip");

            // init the enabled state
            self.enabled(!!options.enabled);

            // init the visible state if visible target specified
            if (isDefined(optionsVisible)){
                self.visible(optionsVisible);
            }
        },

        _targetMouseEnter: function(target) {
            target.addClass(SUI_TOOLTIP_TARGET_HOVER_CLS);
            if (target.attr(TITLE)) {
                target.data(SUI_TOOLTIP_TITLE, target.attr(TITLE))
                    .removeAttr(TITLE);
            }
        },

        _targetMouseLeave: function(target) {
            target.removeClass(SUI_TOOLTIP_TARGET_HOVER_CLS);
            if (target.data(SUI_TOOLTIP_TITLE)) {
                target.attr(TITLE, target.data(SUI_TOOLTIP_TITLE));
            }
        },

        // private method to show the tooltip with the configured delay
        _onShow: function(target, fireEvent) {
            var self = this;

            // do not do anything if not eneabled
            if (!self._enabled) {
                return;
            }

            var tooltip = self._tooltip,
                showTimeout = setTimeout(proxy(self._show, self, target, fireEvent), self.options.delay);

            target
                .one(MOUSELEAVE, function() {
                    var tt = $(this),
                        ttShowTimeout = tt.data(SUI_TOOLTIP_SHOW_TIMEOUT);

                    if (ttShowTimeout) {
                        clearTimeout(ttShowTimeout);
                    }
                })
                .data(SUI_TOOLTIP_SHOW_TIMEOUT, showTimeout);
        },

        // private method to hide tooltip if mouse is not over it
        _onHide: function(target, fireEvent) {
            var self = this,
                tooltip = self._tooltip,
                hideTimeout = setTimeout(proxy(self._hide, self, fireEvent), 50);

            tooltip
                .one(MOUSEENTER, function() {
                    var tt = $(this),
                        ttHideTimeout = tt.data(SUI_TOOLTIP_HIDE_TIMEOUT);

                    if (ttHideTimeout) {
                        clearTimeout(ttHideTimeout);
                        tt.data(SUI_TOOLTIP_HIDE_TIMEOUT, null);
                    }
                })
                .one(MOUSELEAVE, function() {
                    // hide the tooltip after some time if the mouse is not back on the target
                    setTimeout(function() {
                        if (!target.hasClass(SUI_TOOLTIP_TARGET_HOVER_CLS)) {
                            self._hide(self, fireEvent);
                        }
                    }, 50);
                })
                .data(SUI_TOOLTIP_HIDE_TIMEOUT, hideTimeout);
        },

        // private method for showing the tooltip for a given target element
        _show: function(target, fireEvent) {
            var self = this,
                options = self.options,
                content = options.content,
                height = options.height,
                tooltip = self._tooltip,
                contentEl = self._content,
                htmlContent,
                htmlDoLoad,
                evt;

            // do nothing if destroyed
            if (self._destroyed) {
                return;
            }

            // do not do anything if tooltip already shown for this target
            if (self._currentTarget == target) {
                return;
            }

            // fire an event if needed, cancellable
            if (fireEvent) {
                evt = self.trigger("show", {target: target});
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            // determine the html content
            if (isString(content)) {
                htmlContent = content;
            }
            else if (isObject(content)) {
                if (content.remote.iframe) {
                    htmlContent = '<iframe class="sui-tooltip-iframe" src="' + content.remote.url + '" style="border:none; border-width:0px; width:100%; ' + 
                        'height:' + (height ? height + "px" : "100%") + ';"></iframe>';
                }
                else {
                    htmlDoLoad = true;
                    htmlContent = " ";
                }
            }
            else if (isFunction(content)) {
                htmlContent = content(target);
            }

            // if content is still empty, do not show the tooltip
            if (!htmlContent) {
                return;
            }

            // show the tooltip
            tooltip.show();

            // save the current target
            self._currentTarget = target;

            // set the content
            if (htmlDoLoad) {
                contentEl.load(content.remote.url);
            }
            else {
                contentEl.html(htmlContent);
            }

            self._visible = true;

            // position the tooltip when content loading is done
			Position.Set(tooltip, target, self._pos);
        },

        // private method for hiding the tooltip
        _hide: function(fireEvent) {
            var self = this,
                evt;

            // do not do anything if current target is empty
            // (this means that no tooltip is open)
            if (!self._currentTarget) {
                return;
            }

            // fire an event if needed, cancellable
            if (fireEvent) {
                evt = self.trigger("hide");
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            // hide the tooltip element
            $(self._tooltip)
                .hide()
                // remove the callouts inside it, so when we show it next time, 
                // they do not mess up size calculation and positioning
                .find(".sui-tooltip-callout-container").remove();

            self._currentTarget = null;

            self._visible = false;
        },

        // called after the tooltip's position has been set
        _posSet: function(info) {
            var self = this,
                options = self.options,
                tooltip = self._tooltip,
                callout,
                calloutType,
                calloutPos,
                calloutPosSource,
                horizontal = info.horizontal,
                vertical = info.vertical,
                important = info.important,
                element = info.element,
                target = info.target,
                elementWidth = element.width,
                elementHeight = element.height,
                winInfo,
                elementMid,
                targetMid,
                offset,
                minEdgeOffset = 6;  // the minimum distance from the corner

            // add and position any callout
            if (options.callout) {
                if (horizontal == CENTER && vertical == MIDDLE) {
                    // if center && middle - tooltip overlaps, so no callouts
                    return;
                }

                if (horizontal == CENTER || vertical == MIDDLE) {
                    // if one of them is centered, take the other one as where to put the callout
                    calloutType = horizontal == CENTER ? vertical : horizontal;
                    calloutPosSource = reverseDirectionMap[calloutType];
                    calloutPos = { source: calloutPosSource, target: calloutType + (calloutPosSource == BOTTOM || calloutPosSource == RIGHT ? "+1" : "-1") };
                }
                else {
                    // if here, we have two sides of the tooltip that can show the callout,
                    // so determine which one to use and place it on that side, adjusting
                    // the other coordinate to fit over the target accordingly

                    winInfo = shield.ui.Util.GetWithinInfo(win);

                    // check if the callout can be placed on one horizontal side (left or right)
                    if (horizontal == LEFT && element.left - winInfo.scrollLeft > 3) {
                        calloutType = LEFT;
                        calloutPos = { source: RIGHT, target: LEFT + "+1" };
                    }
                    if (horizontal == RIGHT && winInfo.scrollLeft + winInfo.width - element.left - element.width > 3) {
                        calloutType = RIGHT;
                        calloutPos = { source: LEFT, target: RIGHT + "-1" };
                    }
                    if (calloutType) {
                        // adjust the callout position vertically if the callout is not going to 
                        // touch the visible section of the target
                        
                        elementMid = element.top + elementHeight/2;
                        targetMid = target.top + target.height - (target.top + target.height - winInfo.scrollTop) / 2;
                        offset = elementMid - targetMid;

                        // do not allow offset to move the callout outside the tooltip
                        if (mathAbs(offset) > elementHeight/2 - minEdgeOffset) {
                            offset = offset > 0 ? elementHeight/2 - minEdgeOffset : minEdgeOffset - elementHeight/2;
                        }

                        if (offset !== 0) {
                            calloutPos.target += " " + CENTER + (offset > 0 ? ("-" + offset) : ("+" + offset));
                        }
                    }

                    // if not placed, check if callout can be placed on a vertical side (top or bottom)
                    if (!calloutType) {
                        if (vertical == TOP && element.top - winInfo.scrollTop > 3) {
                            calloutType = TOP;
                            calloutPos = { source: BOTTOM, target: TOP + "+1" };
                        }
                        if (vertical == BOTTOM && winInfo.scrollTop + winInfo.height - element.top - element.height > 3) {
                            calloutType = BOTTOM;
                            calloutPos = { source: TOP, target: BOTTOM + "-1" };
                        }
                        if (calloutType) {
                            // adjust the pos horizontally

                            elementMid = element.left + elementWidth/2;
                            targetMid = target.left + target.width - (target.left + target.width - winInfo.scrollLeft) / 2;
                            offset = elementMid - targetMid;

                            // do not allow offset to move the callout outside the tooltip
                            if (mathAbs(offset) > elementWidth/2 - minEdgeOffset) {
                                offset = offset > 0 ? elementWidth/2 - minEdgeOffset : minEdgeOffset - elementWidth/2;
                            }

                            if (offset !== 0) {
                                calloutPos.target = CENTER + (offset > 0 ? ("-" + offset) : ("+" + offset)) + " " + calloutPos.target;
                            }
                        }
                    }

                    // if not placed yet, return
                    if (!calloutType) {
                        return;
                    }
                }

                callout = $('<div class="sui-tooltip-callout-container"><div class="sui-tooltip-callout sui-tooltip-callout-' + calloutType + '"></div>')
                    .appendTo(tooltip);

                // reposition the callout
                Position.Set(callout, tooltip, calloutPos);
            }
        },

        // setter/getter for the visible state of the tooltip
        visible: function () {
            var self = this,
                args = [].slice.call(arguments),
                bVislble;

            // do nothing if destroyed
            if (self._destroyed) {
                return;
            }

            if (args.length > 0) {
                // setter
                bVislble = !!args[0];

                if (bVislble) {
                    // show the tooltip, not firing an event for that
                    self._show(args[1]);
                }
                else {
                    // hide the tooltip, not firing an event for that
                    self._hide();
                }

                self._visible = bVislble;
            }
            else {
                // getter
				return self._visible;
            }
        },

        // setter/getter for the enabled state of the tooltip
        enabled: function() {
            var self = this,
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

                // if being disabled, hide the tooltip
                if (!bEnabled) {
                    self.visible(false);
                }

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
        },

        // tooltip destructor
        destroy: function() {
            var self = this,
                targets = self._targets;

            self._destroyed = true;

            // unbind the events from all _targets
            if (targets) {
                targets.each(function(index) {
                    var el = $(this);

                    // remove all events with the tooltip namespace
                    el.off(self._eventNS);
                });
                self._targets = null;
            }

            // remove the tooltip element
            $(self._tooltip).remove();

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
    });
    Tooltip.defaults = tooltipDefaults;
    shield.ui.plugin("Tooltip", Tooltip);


	// Splitter class - splitter defaults
    splitterDefaults = {
        cls: UNDEFINED,
        barSize: 5, // barSize is an INTERNAL property and can stay undocumented
        orientation: HORIZONTAL, // splitter orientation
        panes: UNDEFINED,        // optional settings for splitter panes
		//pane settings
			//pane.collapsed - supported
			//pane.collapsedSize - not supported
			//pane.collapsible - supported
			//pane.content (string, func or object) - obj { remote { url: "", iframe: true/false } } - not supported
			//pane.max - max size of a pane in (px or %). - supported
            //pane.min - min pane size (px/%). - supported
            //pane.resizable - supported
			//pane.scrollable - supported
			//pane.size - supported
        events: {
            // collapse
            // expand
			// resize
        }
    };
	Splitter = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				options = self.options,                
                cls = options.cls,
				isHorizontal = options.orientation == HORIZONTAL,
                element = $(self.element),
                children;

			element.addClass("sui-splitter-container" + (cls ? (" " + cls) : ""));

			//fix position
			if (element.css("position") !== 'absolute' && element.css("position") !== 'relative') {
				element.css({ position: 'relative' });
			}

			//set width if needed
			if (element.css("width") === UNDEFINED) {
				element.css({ width: '100%' });
			}

			//set height if needed
			self._height = element.css("height") ? element.css("height") : element.parent().innerHeight();
			element.css({height: self._height});

			self._children = children = element.children();			
			self._offset = 0;
			self._barSize = options.barSize;
			self._bars = [];
			self._dragBars = [];
			self._navigators = [];

			children.each(function(index) {
				self._addPane(children, $(this), index);
			});

			$(win).on(RESIZE + ".shieldSplitter" + self.getInstanceId(), proxy(self._adjust, self));

			self._adjust();

			//fix draggables min&max
			self._adjustDraggables();

			//manage collapsed panes
			self._manageCollapsedPanes();
		},

		_adjust: function() {
			var self = this,
				element = self.element,				
				target = self._children.last(),
				isHorizontal = self.options.orientation == HORIZONTAL,
				size = ((isHorizontal ? element.innerWidth() : element.innerHeight()) - self._offset) + 'px';

			//fix horizontals
			element.children(".sui-splitter-pane-horizontal, .sui-splitter-dragbar-horizontal, .sui-splitter-bar-horizontal").each(function() {
				$(this).outerHeight($(this).parent().innerHeight());
			});

			//fix last pane
			if (isHorizontal) {
                target.outerWidth(size);
            }
			else {
                target.outerHeight(size);
            }
		},

		_adjustHeights: function(prev, next) {
			var self = this,
				isHorizontal = self.options.orientation == HORIZONTAL;

			if (!isHorizontal) {
					// adjust inner panes' heights
					prev.children(".sui-splitter-pane-horizontal, .sui-splitter-dragbar, .sui-splitter-bar").each(function() {
						$(this).outerHeight($(this).parent().innerHeight());
					});
					next.children(".sui-splitter-pane-horizontal, .sui-splitter-dragbar, .sui-splitter-bar").each(function() {
						$(this).outerHeight($(this).parent().innerHeight());					
					});
					
					//fix navigators position because it is absolute
					prev.children(".sui-splitter-collapsible-horizontal-left, .sui-splitter-collapsible-horizontal-right").each(function() {
						var item = $(this);						
						item.css({ top: item.prev().innerHeight() / 2 });
					});
					next.children(".sui-splitter-collapsible-horizontal-left, .sui-splitter-collapsible-horizontal-right").each(function() {
						var item = $(this);						
						item.css({ top: item.prev().innerHeight() / 2 });
					});
			}
			else {
				//fix navigators position because it is absolute
				prev.children(".sui-splitter-collapsible-vertical-up, .sui-splitter-collapsible-vertical-down").each(function() {
					var item = $(this);						
					item.css({ top: item.prev().innerWidth() / 2 });
				});
				next.children(".sui-splitter-collapsible-vertical-up, .sui-splitter-collapsible-vertical-down").each(function() {
					var item = $(this);						
					item.css({ top: item.prev().innerWidth() / 2 });
				});
			}
		},

		_adjustDraggables: function() {
			var self = this,
				isHorizontal = self.options.orientation == HORIZONTAL, 
                pos, i, item, prev, next, dbOptions, min, max, size,
				prevPaneMin, nextPaneMax, prevPaneMax, nextPaneMin;
			
			for(i=0; i < self._dragBars.length; i++) {
				if (!self._dragBars[i]) { 
                    continue; 
                }

				item = self._dragBars[i];
				prev = $(self._children[i]);
				next = $(self._children[i+1]);
				dbOptions = item.initialOptions;
				
				//check panes min/max
				min = isHorizontal ? prev.position().left : prev.position().top;
				prevPaneMin = self._getPaneMin(i);
				if (prevPaneMin !== UNDEFINED) { 
                    min += prevPaneMin;
                }

				nextPaneMax = self._getPaneMax(i+1);
				if (nextPaneMax !== UNDEFINED) { 
					pos = isHorizontal ? next.position().left : next.position().top;
					size = isHorizontal ? next.innerWidth() : next.innerHeight();
					min = mathMax(min, pos - (nextPaneMax - size)); 
				}

				max = isHorizontal ? next.position().left + next.innerWidth() : next.position().top + next.innerHeight();
				prevPaneMax = self._getPaneMax(i);
				if (prevPaneMax !== UNDEFINED) {
					pos = isHorizontal ? prev.position().left : prev.position().top;
					max = mathMin(max, pos + prevPaneMax); 
				}
				nextPaneMin = self._getPaneMin(i+1);
				if (nextPaneMin !== UNDEFINED) {
					pos = isHorizontal ? next.position().left : next.position().top;
					max = mathMin(max, pos + nextPaneMin); 
				}
				dbOptions.min = min;
				dbOptions.max = max;

				item.refresh(dbOptions);
			}
		},

		_createCollapseNavigator: function(bar, index) {
			var self = this,
				element = $(self.element),
				options = self.options,
				orientation = options.orientation,
				panes = options.panes,
				isHorizontal = orientation == HORIZONTAL,
				suffix, navigator, css,
				prevPaneCollapsible, nextPaneCollapsible;

			//check if prev/next pane is collapsible ( neighbouring panes can not be simultaneously collapsible)
			prevPaneCollapsible = panes && index < panes.length && panes[index].collapsible;
			nextPaneCollapsible = panes && index < panes.length - 1 && panes[index+1].collapsible;
            if (!prevPaneCollapsible && !nextPaneCollapsible) { 
                return;
            }

			suffix = isHorizontal ? (prevPaneCollapsible ? LEFT : RIGHT) : (prevPaneCollapsible ? UP : DOWN);

			//create navigator
			navigator = $('<div class="sui-splitter-collapsible sui-splitter-collapsible-' + orientation + '-' + suffix + '"/>');
			//insert after bar
			navigator.insertAfter(bar);
			//position navigator 
			css = {				
				left: isHorizontal ? bar.position().left + 1 : bar.position().left + element.innerWidth()  / 2,
				top: isHorizontal ? bar.position().top + bar.innerHeight() / 2 : bar.position().top + 1
			};
			navigator.css(css);

			//CLICK handler
			navigator.on(CLICK, function() {
				var prev = $(self._children[index]),
					next = $(self._children[index+1]),
					dragBar = self._dragBars[index] ? $(self._dragBars[index].element) : UNDEFINED,
					navigatorInfo = self._navigators[index],
					targetNavigator = navigatorInfo.navigator,
					direction = navigatorInfo.direction,
					collapsed = navigatorInfo.collapsed,
					delta = navigatorInfo.delta;
					
				//handle dragBar
				if (dragBar) {
					if (collapsed) {
						dragBar.show();
					}
				}
				
				//check direction
				switch(direction)
                {
					case LEFT:
						//if not collapsed - calculate delta and hide prev pane
						if (!collapsed) {
							delta = index === 0 ? prev.outerWidth() : prev.innerWidth();
							prev.hide();
						}
						else {
                            prev.show();
                        }
						//position next pane
						next.css({ left: next.position().left + (collapsed ? delta : -delta) });
						//position bar
						bar.css({ left: bar.position().left + (collapsed ? delta : -delta) });
						//position drag bar
						if (dragBar) {
							dragBar.css({ left: dragBar.position().left + (collapsed ? delta : -delta) });
						}
						//position navigator
						targetNavigator.css({ left: targetNavigator.position().left + (collapsed ? delta : -delta) });
						//set next pane width
						next.outerWidth( next.outerWidth() + (collapsed ? -delta : delta));
						//handle css classes
						targetNavigator.removeClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? RIGHT : LEFT));
						targetNavigator.addClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? LEFT : RIGHT));
						//set navigator info
						navigatorInfo.collapsed = !collapsed;
						navigatorInfo.delta = navigatorInfo.collapsed ? delta : 0;
						break;
					case RIGHT:
						if (!collapsed) {
							delta = next.innerWidth();
							next.hide();
						}
						else {
                            next.show();
                        }
						bar.css({ left: bar.position().left + (collapsed ? -delta : delta) });
						if (dragBar) {
							dragBar.css({ left: dragBar.position().left + (collapsed ? -delta : delta) });
						}
						targetNavigator.css({ left: targetNavigator.position().left + (collapsed ? -delta : delta) });
						prev.outerWidth( prev.outerWidth() + (collapsed ? -delta : delta));
						targetNavigator.removeClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? LEFT : RIGHT));
						targetNavigator.addClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? RIGHT : LEFT));
						navigatorInfo.collapsed = !collapsed;
						navigatorInfo.delta = navigatorInfo.collapsed ? delta : 0;
						break;
					case UP:
						if (!collapsed) {
							delta = index === 0 ? prev.outerHeight() : prev.innerHeight();
							prev.hide();
						}
						else {
                            prev.show();
                        }
						next.css({ top: next.position().top + (collapsed ? delta : -delta) });
						bar.css({ top: bar.position().top + (collapsed ? delta : -delta) });
						if (dragBar) {
							dragBar.css({ top: dragBar.position().top + (collapsed ? delta : -delta) });
						}
						targetNavigator.css({ top: targetNavigator.position().top + (collapsed ? delta : -delta) });
						next.outerHeight( next.outerHeight() + (collapsed ? -delta : delta));
						targetNavigator.removeClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? DOWN : UP));
						targetNavigator.addClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? UP : DOWN));
						navigatorInfo.collapsed = !collapsed;
						navigatorInfo.delta = navigatorInfo.collapsed ? delta : 0;
						break;
					case DOWN:
						if (!collapsed) {
							delta = next.innerHeight();
							next.hide();
						}
						else {
                            next.show();
                        }
						bar.css({ top: bar.position().top + (collapsed ? -delta : delta) });
						if (dragBar) {
							dragBar.css({ top: dragBar.position().top + (collapsed ? -delta : delta) });
						}
						targetNavigator.css({ top: targetNavigator.position().top + (collapsed ? -delta : delta) });
						prev.outerHeight( prev.outerHeight() + (collapsed ? -delta : delta));
						targetNavigator.removeClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? UP : DOWN));
						targetNavigator.addClass("sui-splitter-collapsible-" + orientation + "-" + (collapsed ? DOWN : UP));
						navigatorInfo.collapsed = !collapsed;
						navigatorInfo.delta = navigatorInfo.collapsed ? delta : 0;
						break;
                    default:
                        break;
				}

				//handle dragBar
				if (dragBar) {
					if (navigatorInfo.collapsed) {
						dragBar.hide();
					}
				}
				if (navigatorInfo.collapsed) {
					self.trigger(COLLAPSE, { paneIndex: index });
				}
				else {
					self.trigger(EXPAND, { paneIndex: index });
				}

				//adjust heights for vertical splitter
				self._adjustHeights(prev, next);
			});

			self._navigators[index] = { 
                navigator: navigator, 
                delta: 0, 
                direction: suffix, 
                collapsed: false, 
                index: prevPaneCollapsible ? index : index + 1 
            };
		},

		_manageCollapsedPanes: function() {
			var self = this, 
				panes = self.options.panes,
				info, 
                index, 
                navigator,
                i;

			if (!self._navigators) {
                return;
            }

			for(i=0; i<self._navigators.length; i++) {
				info = self._navigators[i];
				index = info.index;
				navigator = info.navigator;

				if (panes && index < panes.length && panes[index].collapsed) {
					navigator.trigger(CLICK);
				}
			}
		},
		
		_getPaneSize: function(index) {
			var self = this,
				options = self.options,
				panes = options.panes,
				isHorizontal = options.orientation == HORIZONTAL,
                element = $(self.element),
                totalSize,
                size;

			if (panes && index < panes.length && (panes[index].size || panes[index].min)) {
				size = panes[index].size || panes[index].min;
			}

			if (!size) {
				totalSize = isHorizontal ? element.innerWidth() : element.innerHeight();
				//return proportional pane size if pane size not defined
				return (totalSize - (self._children.length - 1) * self._barSize) / self._children.length ; //return '100px';                
            }

			return self._getSize(size, 'Invalid pane size') + 'px';
		},

		_getPaneMin: function(index) {
			var self = this,
				panes = self.options.panes,
                min;

			if (panes && index < panes.length && panes[index].min) {
				min = panes[index].min;
			}

			if (!min) {
                return UNDEFINED;
            }

			return self._getSize(min, 'Invalid min pane size!');
		},

		_getPaneMax: function(index) {
			var self = this,				
				panes = self.options.panes,
                max;

			if (panes && index < panes.length && panes[index].max) {
				max = panes[index].max;
			}

			if (!max) {
                return UNDEFINED;
            }

			return self._getSize(max, 'Invalid max pane size!');
		},

		_getSize: function(size, errorMessage) {
			var self = this,
				options = self.options,				
				isHorizontal = options.orientation == HORIZONTAL,
                element = $(self.element),				
                totalSize, 
                val;

			totalSize = isHorizontal ? element.innerWidth() : element.innerHeight();

			if (isString(size) && size.charAt(size.length - 1) == '%') {
				val = parseInt(size.substring(0, size.length - 1), 10);
				if (val >= 100) { 
                    throw errorMessage;
                }
				size = (totalSize - (self._children.length - 1) * self._barSize) * val / 100;
			}
			else {
                size = parseInt(size, 10);
            }

			return size;
		},
		
		_addPane: function(collection, target, index) {
			var self = this,
				options = self.options,                
				orientation = options.orientation,
				isHorizontal = orientation == HORIZONTAL,
				panes = options.panes,
				omitResize = panes && index < panes.length && panes[index].resizable === false,
				scrollable = panes && index < panes.length && panes[index].scrollable === true,
                element = $(self.element),
                size, min, max, css, bar, barCss,
				dragBar, draggableOpts, dragBarWidget;

            // set an id attribute for the pane target if none
            if (!target.attr(ID)) {
                target.attr(ID, strid());
            }

			target.addClass("sui-splitter-pane sui-splitter-pane-" + orientation);
			if (scrollable) {
				target.css({ overflow: 'auto' });
			}

			size = self._getPaneSize(index);

			min = self._getPaneMin(index);
			if (min !== UNDEFINED) {
				if (size < min) { throw 'Size less that min pane size!'; }
			}

			max = self._getPaneMax(index);
			if (max !== UNDEFINED) {
				if (size > max) { throw 'Size bigger that max pane size!'; }
			}

			css = {
				left: (isHorizontal ? self._offset : 0) + 'px',
				top: (!isHorizontal ? self._offset : 0) + 'px'
			};

			if (isHorizontal) {
				css.width = size;
				css.height = self._height;
			}
			else {
				css.height = size;
			}

			target.css(css);

			// add drag handle
			if (index != collection.length - 1) {
				self._offset += isHorizontal ? target.outerWidth() : target.outerHeight();
				bar = $("<div>&nbsp;</div>")
					.addClass("sui-unselectable sui-splitter-bar sui-splitter-bar-" + orientation);

				barCss = {
					left: orientation == HORIZONTAL ? self._offset : 0,
					top: orientation == VERTICAL ? self._offset : 0
				};

				if (isHorizontal) {
					barCss.width = self._barSize;
					barCss.height = self._height; //target.parent().innerHeight();
				}
				else {
					barCss.height = self._barSize;
				}

				bar.css(barCss);
				bar.insertAfter(target);

				if (!omitResize) {
					dragBar = $("<div>&nbsp;</div>")
                        .addClass("sui-unselectable sui-splitter-dragbar sui-splitter-dragbar-" + orientation)
                        .css(barCss)
                        .insertAfter(bar);

                    // ARIA
                    dragBar
                        .attr(ROLE, "separator")
                        .attr(ARIA_CONTROLS, target.attr(ID))
                        .attr(ARIA_VALUENOW, orientation == HORIZONTAL ? toInt(target.width()) : toInt(target.height()));

					draggableOpts = { 
                        iframeFix: true,
						direction: isHorizontal ? HORIZONTAL : VERTICAL,
						stack: false,
						events: {
							start: function(e) {
								var prev = target,
									next = $(collection[index+1]);
								
								//remove unselectable style
								prev.addClass("sui-unselectable");
								next.addClass("sui-unselectable");
							},
							stop: function(e) {
								var prev = target,
									next = $(collection[index+1]),
									bar = self._bars[index],
									navigatorInfo = self._navigators[index],
									navigator = navigatorInfo ? navigatorInfo.navigator : UNDEFINED,
									delta;
								
								//remove unselectable style
								prev.removeClass("sui-unselectable");
								next.removeClass("sui-unselectable");
								
								if (orientation == HORIZONTAL) {
									delta = e.left - bar.position().left;
									prev.width( prev.width() + delta);									
									next.css({ left: e.left + bar.outerWidth() });
									next.width( next.width() - delta);

                                    // ARIA
                                    dragBar.attr(ARIA_VALUENOW, toInt(prev.width()));

									if (navigator) { 
                                        navigator.css({ left: navigator.position().left + delta });
                                    }
								}
								else {
									delta = e.top - bar.position().top;
									prev.height( prev.height() + delta);
									next.css({ top: e.top + bar.outerHeight() });
									next.height( next.height() - delta);

                                    // ARIA
                                    dragBar.attr(ARIA_VALUENOW, toInt(prev.height()));

									if (navigator) { 
                                        navigator.css({ top: navigator.position().top + delta });
                                    }
								}
								bar.css({ left: e.left, top: e.top });

								//adjust heights for vertical splitter
								self._adjustHeights(prev, next);
								
								//fix draggables
								self._adjustDraggables();
								
								self.trigger(RESIZE, { paneIndex: index });
							}
						}
					};

					dragBarWidget = new shield.ui.Draggable(dragBar, draggableOpts);
					self._dragBars[index] = dragBarWidget;
				}
				
				self._bars.push(bar);
				
				//init collapse navigators
				self._createCollapseNavigator(bar, index);
				
				self._offset += self._barSize;
			}
		},

		// splitter destructor
        destroy: function() {
            var self = this,
				element = self.element,
                i;

			element.removeClass("sui-splitter-container");

			$(win).off(RESIZE + ".shieldSplitter" + self.getInstanceId());

			for (i=0; i < self._children.length; i++) {
				var navigatorInfo = self._navigators[i];
				if (!navigatorInfo) { 
                    continue;
                }
				var navigator = navigatorInfo.navigator;
				navigator.off(CLICK);
			}
			self._children = self._bars = self._dragBars = self._navigators = null;
			self._offset = self._height = self._barSize = 0;

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
    });
    Splitter.defaults = splitterDefaults;
    shield.ui.plugin("Splitter", Splitter);


	// Accordion class - accordion defaults
    accordionDefaults = {
        cls: UNDEFINED,
        enabled: true,
        animation: {
            enabled: true,
            duration: 200
        },
        mode: SINGLE,                   // or single
        expanded: UNDEFINED,            // a single index or list of indices to be expanded initially
        dataSource: UNDEFINED,          // dataSource options
        titleTemplate: "{title}",	    // or function(item) {  }
        contentTemplate: "{content}",	// or function(item) {  }
		width: UNDEFINED,			    // optional width of the element
		height: UNDEFINED,			    // optional height of the element
		maxHeight: UNDEFINED,		    // optional maximum height of the element
        events: {
            // focus
            // blur
            // expand
            // collapse
        }
    };
    // Public methods:
    //      bool enabled()	/	void enabled(boolEnable)
    //      bool visible()  /   void visible(boolVisible)
	//		list expanded()	/	void expanded(index, boolExpanded)
	Accordion = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				options = self.options,
                cls = options.cls,
                dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
                expanded = options.expanded,
                element = $(self.element),
                original,
                originalTabindex,
                tagname,
                parseUlFunc;

			// save the original element and other initializations
			self._original = original = $(self.element);
			self._tagname = tagname = original.prop("tagName").toLowerCase();

            // wrap original element and hide it
            original.wrap("<span/>");
            original.hide();

            // create a new element to render the listbox in
			self.element = element = $('<ul class="sui-accordion' + (cls ? (' ' + cls) : '') + '"/>')
				.on(FOCUS, function() { self.trigger(FOCUS); })
				.on(BLUR, function() { self.trigger(BLUR); });

            original.after(element);

			// add tabindex for the element so that it can be selected on focus
			originalTabindex = original.attr(TABINDEX);
			element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");

			// apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css("width", options.width);
			}
			if (isDefined(options.height)) {
				element.css("height", options.height);
			}
			if (isDefined(options.maxHeight)) {
				element.css("max-height", options.maxHeight);
			}

			// init the datasource
			if (dataSourceOpts) {
				// init from options
                self.dataSource = DataSource.create(dataSourceOpts);
            }
            else if (tagname === "ul") {
                // define a function to parse a UL and return a list of dicts for its items
                parseUlFunc = function(ul) {
                    var result = [];

                    $(ul).children('li').each(function(item, index) {
                        // take direct ancestors on first level - not deeper
                        var dict = {
                            title: $(this).children('h1, h2, h3, h4, h5, h6').first().html(),
                            content: $(this).children('div, p').first()
                        };

                        // if any child UL elements, parse them and add them as items
                        if ($(this).children('ul').length > 0) {
                            dict.items = parseUlFunc($(this).children('ul')[0]);
                        }

                        result.push(dict);
                    });

                    return result;
                };

                // construct a dataSource, passing the original UL as data, 
                // so that it gets passed to the parsing function
                self.dataSource = DataSource.create({
                    data: original, // pass the jquery object
                    schema: {
                        parse: parseUlFunc
					}
                });

                // overwrite the contentTemplate to copy the elements
                self.options.contentTemplate = function(item, index, contentElement) {
                    self._moveElement(item.content, contentElement);
                };

                // indicate that the accordion was initialized from a UL
                self._fromUL = true;
            }
            else {
                self.destroy();
				error("shieldAccordion: No dataSource or underlying UL element found.", dieOnError);
				return;
            }

	        // the handler for data source on change
	        self.dataSource.on(CHANGE + ".shieldAccordion" + self.getInstanceId(), proxy(self._dsChange, self));

            // read the data source
            self.dataSource.read();
		},

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

        _dsChange: function() {
            var self = this,
                options = self.options;

            // redraw the items
            self._render();

            // apply values/selected if first load
			if (!self._dsLoadedOnce) {
				self._dsLoadedOnce = true;

				if (isDefined(options.expanded)) {
					self.expanded(options.expanded);
				}
                else if (self.dataSource.view && self.dataSource.view.length > 0) {
                    // expand the first item if no expanded option passed
                    self.expanded(0);
                }

                self.enabled(options.enabled);
			}
        },

        _moveElement: function(element, inside) {
            $(element)
                .data(ACCORDION_ELEMENT_PARENT, $(element).parent())
                .data(ACCORDION_ELEMENT_PREV, $(element).prev())
                .addClass('sui-accordion-elm')
                .appendTo(inside);
        },

        _restoreElement: function(element) {
            var prev = $(element).data(ACCORDION_ELEMENT_PREV),
                parent = $(element).data(ACCORDION_ELEMENT_PARENT);

            if ($(prev).length > 0) {
                $(element).insertAfter(prev);
            }
            else {
                $(element).prependTo(parent);
            }

            $(element)
                .removeData(ACCORDION_ELEMENT_PARENT)
                .removeData(ACCORDION_ELEMENT_PREV)
                .removeClass('sui-accordion-elm');
        },

        _restoreAll: function() {
            var self = this;

            $(self.element).find('.sui-accordion-elm').each(function() {
                self._restoreElement($(this));
            });
        },

        _render: function() {
            var self = this,
                options = self.options,
                data = self.dataSource.view,
                element = $(self.element),
                total = data.length;

            // empty the rendering element
	        element.empty();

            if (data) {
                each(data, function(index, item) {
                    var itemTitle,
                        itemContent,
                        titleElement,
                        bodyElement,
                        contentElement,
                        bodyElementId = strid(),
                        // construct the LI element for the item and add it to the element
                        itemElement = $('<li class="sui-accordion-item ' + (index + 1 >= total ? 'sui-accordion-item-last ' : '') + 'sui-accordion-item-collapsed"/>')
                            .data(ACCORDION_ITEM_INDEX_KEY, index)
                            .data(ACCORDION_ITEM_DATA_KEY, item)
                            .appendTo(element);

                    // append the title element and fill its content
                    // execute the title format and if not undefined or null, 
                    // set the return value as title's HTML
                    titleElement = $('<div class="sui-accordion-item-title"/>')
                        .click(function(event) {
                            if (self._enabled) {
                                self._itemClick($(itemElement));
                            }
                        })
                        .appendTo(itemElement);

                    itemTitle = shieldFormat.call(self, options.titleTemplate, item, index, titleElement);
                    if (isDefined(itemTitle) && !isNull(itemTitle)) {
                        titleElement.html(itemTitle);
                    }

                    // add an empty content element, to be filled when expanded for the first time
                    bodyElement = $('<div class="sui-accordion-item-body"/>')
                        .appendTo(itemElement)
                        .hide();

                    // ARIA
                    titleElement
                        .attr(ROLE, "button")
                        .attr(ARIA_CONTROLS, bodyElementId)
                        .attr(ARIA_EXPANDED, FALSE);
                    bodyElement.attr(ID, bodyElementId);

                    // add an empty content body element, to be filled when expanded for the first time
                    contentElement = $('<div class="sui-accordion-item-body-content"/>')
                        .appendTo(bodyElement);

                    // if any child elements, add a child accordion with them
                    if (shieldIs.array(item.items) && item.items.length > 0) {
                        $('<div/>')
                            .appendTo(bodyElement)
                            .shieldAccordion({
                                cls: "sui-accordion-item-body-items " + (options.cls ? (' ' + options.cls) : ''),
                                enabled: options.enabled,
                                animation: options.animation,
                                mode: options.mode,
                                dataSource: {
                                    data: item.items
                                },
                                titleTemplate: options.titleTemplate,
                                contentTemplate: options.contentTemplate,
                                //width: options.width,
                                //height: options.height,
                                //maxHeight: options.maxHeight,
                                events: options.events
                            });
                    }
                });
            }
        },

        // toggle an item element
        _itemClick: function(itemElement) {
            var self = this,
                options = self.options,
                isCollapsed = itemElement.hasClass('sui-accordion-item-collapsed');

            if (options.mode == SINGLE) {
                // do anything only if the current element is collapsed
                if (isCollapsed) {
                    // collapse the open item and expand the given one
                    self._collapse(itemElement.siblings('.sui-accordion-item').not('.sui-accordion-item-collapsed').first(), false, true);
                    self._expand(itemElement, false, false);
                }
            }
            else {
                if (isCollapsed) {
                    self._expand(itemElement, false, false);
                }
                else {
                    self._collapse(itemElement, false, false);
                }
            }
        },

        _expand: function(itemElement, noAnimation, noEvent) {
            var self = this,
                options = self.options,
                animationEnabled = options.animation.enabled && !noAnimation,
                animationDuration = options.animation.duration,
                itemContent,
                titleElement,
                bodyElement = $(itemElement).children('.sui-accordion-item-body').first(),
                contentElement,
                index = itemElement.data(ACCORDION_ITEM_INDEX_KEY),
                item = itemElement.data(ACCORDION_ITEM_DATA_KEY),
                evt;

            if (!noEvent) {
                evt = self.trigger('expand', {item: item, index: index, element: itemElement});
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            // load the content of this item if not already loaded
            if (itemElement.data(ACCORDION_ITEM_LOADED_KEY) !== 1) {
                itemElement.data(ACCORDION_ITEM_LOADED_KEY, 1);

                contentElement = itemElement.children('.sui-accordion-item-body').first().children('.sui-accordion-item-body-content').first();

                itemContent = shieldFormat.call(self, options.contentTemplate, item, index, contentElement);
                if (isDefined(itemContent) && !isNull(itemContent)) {
                    contentElement.html(itemContent);
                }
            }

            itemElement.removeClass('sui-accordion-item-collapsed')
                .addClass('sui-accordion-item-expanded');

            // ARIA
            titleElement = $(itemElement).children('.sui-accordion-item-title').first();
            titleElement.attr(ARIA_EXPANDED, TRUE);
            if (options.mode == SINGLE) {
                titleElement.attr(ARIA_DISABLED, TRUE);
            }

            // handle the display with animation
            if (animationEnabled) {
                bodyElement.slideDown(animationDuration);
            }
            else {
                bodyElement.show();
            }
        },

        _collapse: function(itemElement, noAnimation, noEvent) {
            var self = this,
                options = self.options,
                animationEnabled = options.animation.enabled && !noAnimation,
                animationDuration = options.animation.duration,
                bodyElement = $(itemElement).children('.sui-accordion-item-body').first(),
                index = itemElement.data(ACCORDION_ITEM_INDEX_KEY),
                item = itemElement.data(ACCORDION_ITEM_DATA_KEY),
                evt;

            if (!noEvent) {
                evt = self.trigger('collapse', {item: item, index: index, element: itemElement});
                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            itemElement.removeClass('sui-accordion-item-expanded')
                .addClass('sui-accordion-item-collapsed');

            // ARIA
            $(itemElement).children('.sui-accordion-item-title').first()
                .attr(ARIA_EXPANDED, FALSE)
                .removeAttr(ARIA_DISABLED);

            // handle the display with animation
            if (animationEnabled) {
                bodyElement.slideUp(animationDuration);
            }
            else {
                bodyElement.hide();
            }
        },

        // setter/getter for the expanded index/indices of the accordion
        expanded: function() {
            var self = this,
				element = $(self.element),
				original = self._original,
				args = [].slice.call(arguments),
                indexList,
                bExpanded,
                noAnimation,
                itemElements;

            if (args.length > 0) {
                // setter
                indexList = to.array(args[0]);
                bExpanded = isDefined(args[1]) ? !!args[1] : true;
                noAnimation = isDefined(args[2]) ? !!args[2] : true;

                itemElements = element.children();

                map(indexList, function(index) {
                    // skip negative indices
                    if (index >= 0) {
                        if (bExpanded) {
                            self._expand($(itemElements[index]), noAnimation, true);
                        }
                        else {
                            self._collapse($(itemElements[index]), noAnimation, true);
                        }
                    }
                });
            }
            else {
                // getter
                return map(element.children('.sui-accordion-item').not('.sui-accordion-item-collapsed'), function(item) {
                    return item.data(ACCORDION_ITEM_INDEX_KEY);
                });
            }
        },

		// setter/getter for the enabled state of the accordion
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
						.removeClass("sui-accordion-disabled");
					original.removeAttr(DISABLED);
				}
				else {
					element
						.attr(DISABLED, DISABLED)
						.addClass("sui-accordion-disabled");
					original.attr(DISABLED, DISABLED);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

		// accordion destructor
        destroy: function() {
            var self = this;

            if (self.dataSource) {
				self.dataSource.off(".shieldAccordion" + self.getInstanceId());
			}

            self._restoreAll();

            $(self.element).remove();

            if (self._original) {
                self._original
                    .unwrap()
                    .show();
            }

            self._original = self._dsLoadedOnce = self._fromUL = self._currItemEl = UNDEFINED;

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
	});
	Accordion.defaults = accordionDefaults;
    shield.ui.plugin("Accordion", Accordion);


    // Tabs class - tabs defaults
    tabsDefaults = {
        cls: UNDEFINED,
        active: UNDEFINED,  // undefined, false or int
        collapsible: false,
        animation: {
            enabled: true,
            activateDuration: 160,
            deactivateDuration: 60
        },
        titleTemplate: "{title}",
        titleClsTemplate: "{titleCls}",
        itemClsTemplate: "{itemCls}",
        hrefTemplate: "{href}",
        contentTemplate: "{content}",
        disabledTemplate: "{disabled}",
        iconUrlTemplate: "{iconUrl}",
        iconClsTemplate: "{iconCls}",
        position: TOP,
        dataSource: UNDEFINED,
        readDataSource: true,
        trigger: CLICK, // click or mouseenter
        events: {
            // select - before tab is selected
            // activate - after tab has been activated (animation done)
            // load - after content has been loaded (if href specified for an item)
        }
    };
    // Public methods:
    //      bool enabled(index)	/	void enabled(index, bool)
    //      int active()        /   void active(index, bool)
    //      object item(index)
    //      list enabledIndices()
    //      
	Tabs = Widget.extend({
        // Tabs constructor
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
                element = $(self.element),
                tabList = $(element).children('ul, ol').first(),
                options = self.options,
                position = options.position,
                dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
                cls = options.cls,
                eventNS;

            eventNS = self._eventNS = '.shieldTabs' + self.getInstanceId();

            // init tab list vars
            if (tabList.length <= 0) {
                tabList = null;
                self._noTabList = true;
            }
            else {
                self._noTabList = false;
            }
            self._tabList = tabList;

            // add classes
            element.addClass('sui-tabs sui-tabs-' + position + (cls ? (' ' + cls) : ''));

            element.on(KEYDOWN + eventNS, proxy(self._keydown, self));

            // init the datasource
			if (dataSourceOpts) {
                // init from options
                self.dataSource = DataSource.create(dataSourceOpts);
            }
            else if (tabList) {
                // construct a dataSource, passing the original UL as data, 
                // so that it gets passed to the parsing function
                self.dataSource = DataSource.create({
                    data: tabList, // pass the jquery object of the list of tabs in the underlying element
                    schema: {
                        parse: function(ul) {
                            var result = [];

                            $(ul).children('li').each(function() {
                                var item = $(this),
                                    dict = {
                                        title: item.html(),
                                        titleCls: item.attr('data-title-class'),
                                        itemCls: item.attr('data-item-class'),
                                        href: item.attr('data-href'),
                                        disabled: item.attr('data-disabled') ? !!item.attr('data-disabled') : (isDefined(item.attr(DISABLED)) && item.attr(DISABLED) !== null),
                                        iconUrl: item.attr('data-icon-url'),
                                        iconCls: item.attr('data-icon-cls')
                                    };

                                result.push(dict);
                            });

                            return result;
                        }
					}
                });
            }
            else {
                self.destroy();
				error("shieldTabs: No dataSource or tabs UL element found.", dieOnError);
				return;
            }

            // win resize event handler
            $(win).on(RESIZE + eventNS, proxy(self._adjustTabListHeight, self));

            // hide all divs
            $(element).children('div').hide();

            // the handler for data source on change
	        self.dataSource.on(CHANGE + eventNS, proxy(self._dsChange, self));

            // ARIA
            element.attr(ROLE, "tablist");
            if (position == LEFT || position == RIGHT) {
                element.attr("aria-orientation", VERTICAL);
            }

            // read the data source if there are no DS options provided, 
            // or there are such and the option to read it is set
            if (!dataSourceOpts || options.readDataSource) {
                self.dataSource.read();
            }
        },

        _dsChange: function() {
            this._render();
        },

        _getItemIcon: function(item) {
            var options = this.options,
                iconUrl = shieldFormat(options.iconUrlTemplate, item),
                iconCls;

            if (iconUrl && iconUrl !== "undefined") {
                return $('<span class="sui-tabs-tab-icon"/>')
                    .append('<img src="' + iconUrl + '"/>');
            }
            else {
                iconCls = shieldFormat(options.iconClsTemplate, item);
                if (iconCls && iconCls !== "undefined") {
                    return $('<span class="sui-tabs-tab-icon"/>')
                        .addClass(iconCls);
                }
            }

            return UNDEFINED;
        },

        _render: function() {
            var self = this,
                element = $(self.element),
                options = self.options,
                active = options.active,
                tabList = self._tabList,
                divs,
                data = self.dataSource.view || [],
                dataLength = data.length,
                i,
                li,
                tab,
                div,
                item,
                disabledIndices = [];

            // if initialized, reset the tabList and divs, so that they are recreated by the code below
            // NOTE: we want this behavior so that changes in the DS are reflected after the initial render
            if (self._initialized) {
                $(tabList).remove();
                $(element).children('div').remove();
                self._tabList = tabList = self._divs = divs = UNDEFINED;
            }

            // initialize the tablist if not initialized
            if (!tabList) {
                self._tabList = tabList = $('<ul/>').prependTo(element);

                // add the list items to the tablist
                for (i=0; i<dataLength; i++) {
                    item = data[i];

                    tabList.append($('<li/>')
                        .append(
                            self._getItemIcon(item),    // this might return undefined if no icon needed
                            '<span class="sui-tabs-tab-text">' + shieldFormat(options.titleTemplate, item) + '</span>'
                        )
                    );
                }
            }

            // if bottom position, move the tabList to the end
            if (options.position == BOTTOM) {
                tabList.appendTo(element);
            }

            // add tablist styles
            tabList.addClass('sui-tabs-tablist' + (options.collapsible ? ' sui-tabs-tablist-collapsible' : ''));

            // add ARIA roles for tabs
            tabList.children('li').each(function() {
                if (!$(this).attr(ID)) {
                    $(this).attr(ID, strid());
                }
                $(this).attr(ROLE, "tab");
            });

            // if initial rendering, add tabindex for the element so that it can be selected on focus
            if (!self._initialized && !isDefined(element.attr(TABINDEX))) {
                element.attr(TABINDEX, "0");
            }

            // save the height of the tab list element
            self._tabListHeight = tabList.outerHeight();

            // init the content items div-s if not present
            if ($(element).children('div').length <= 0) {
                for (i=0; i<dataLength; i++) {
                    $(element).append('<div class="sui-tabs-cust"/>');
                }
            }
            self._divs = divs = $(element).children('div');
            $(divs).addClass('sui-tabs-item');

            // hide all divs - again
            $(divs).hide();

            // complete initialization
            for (i=0; i<dataLength; i++) {
                item = data[i];
                tab = tabList.children('li:eq(' + i + ')');
                div = $(divs[i]);

                var titleCls = shieldFormat(options.titleClsTemplate, item),
                    itemCls = shieldFormat(options.itemClsTemplate, item),
                    disabled = shieldFormat(options.disabledTemplate, item);

                if (titleCls && titleCls !== "undefined") {
                    tab.addClass(titleCls);
                }

                if (itemCls && itemCls !== "undefined") {
                    div.addClass(itemCls);
                }

                if ((isBoolean(disabled) && disabled) || (disabled === "true" || disabled === "1" || disabled === 1)) {
                    disabledIndices.push(i);
                }

                // setup tab list events
                tab.on(options.trigger + self._eventNS, proxy(self._select, self, i, tab, div));

                // ARIA
                div
                    .attr(ROLE, "tabpanel")
                    .attr(ARIA_DESCRIBEDBY, tab.attr(ID));
                if (!div.attr(ID)) {
                    div.attr(ID, strid());
                }
                tab.attr(ARIA_CONTROLS, div.attr(ID));
            }

            // mark this as rendered initially
            self._initialized = true;

            // activate a tab if not false
            if (active !== false) {
                active = isNumber(active) ? active : 0;
                active = mathMax(0, mathMin(active, divs.length - 1));

                self._selectedIndex = active;
                self._activate(active, true, false);
            }

            // if anything to disable, call the method
            // NOTE: the first one is not an index
            if (disabledIndices.length > 0) {
                for (i=0; i<disabledIndices.length; i++) {
                    self.enabled(disabledIndices[i], false);
                }
            }
        },

        _select: function(index, tab, div) {
            var self = this,
                options = self.options,
                collapsible = options.collapsible,
                active,
                activate,
                data = self.dataSource.view || [],
                evt;

            // do not do anything if not enabled
            if (!self.enabled(index)) {
                return;
            }

            // if already selected and not collapsible, do not do anything
            if (index === self._selectedIndex && !collapsible) {
                return;
            }

            tab = tab || $(self._tabList).children('li:eq(' + index + ')');
            div = div || $(self._divs[index]);

            active = $(tab).hasClass('sui-tabs-tab-active');
            activate = !(active && collapsible && options.trigger !== MOUSEENTER);

            evt = self.trigger("select", {tab: tab, content: div, active: active, activate: activate, index: index, item: data[index]});
            if (evt.isDefaultPrevented()) {
                return;
            }

            self._selectedIndex = index;
            self._activate(index, activate, true, tab, div);
        },

        _activate: function(index, active, fireEvent, tab, div) {
            var self = this,
                options = self.options,
                animation = options.animation,
                animationEnabled = animation.enabled,
                data = self.dataSource.view || [],
                item,
                evt,
                href,
                content,
                postDeactivate,
                postActivate;

            // do not do anything if not enabled
            if (!self.enabled(index)) {
                return;
            }

            // if deactivating and not currently active, return
            if (!active && index !== self._activeIndex) {
                return;
            }

            tab = tab || $(self._tabList).children('li:eq(' + index + ')');
            div = div || $(self._divs[index]);
            item = data[index];

            // finish all animations with the divs
            $(self._divs).stop(true, true);

            // mark all tabs as deactivated
            $(self._tabList).children('li')
                .removeClass('sui-tabs-tab-active')
                .attr(ARIA_SELECTED, FALSE);

            postDeactivate = function() {
                // define a function containing code to execute after activating a tab
                postActivate = function() {
                    // fire the event 
                    if (fireEvent) {
                        evt = self.trigger("activate", {tab: tab, content: div, active: active, index: index, item: item});
                    }
                    self._adjustTabListHeight();
                };

                if (active) {
                    self._activeIndex = index;

                    $(tab)
                        .addClass('sui-tabs-tab-active')
                        .attr(ARIA_SELECTED, TRUE);     // ARIA

                    // if href specified, load it via ajax
                    href = shieldFormat(options.hrefTemplate, item);
                    if (href && href !== "undefined") {
                        $(div).load(href, UNDEFINED, function(responseText, textStatus, jqXHR) {
                            self.trigger("load", {responseText: responseText, textStatus: textStatus, jqXHR: jqXHR, tab: tab, content: div, active: active, index: index, item: item});
                            self._adjustTabListHeight();
                        });
                    }
                    else {
                        // href not specified - check for content
                        content = shieldFormat(options.contentTemplate, item);
                        if (content && content !== "undefined") {
                            $(div).html(content);
                        }
                    }

                    // show the div, animating it optionally
                    $(div).fadeIn(animationEnabled ? animation.activateDuration : 0, postActivate);
                }
                else {
                    self._activeIndex = UNDEFINED;
                    postActivate();
                }
            };

            if (isDefined(self._activeIndex)) {
                // hide all divs but this one
                $(self._divs).each(function(i) {
                    if (i !== self._activeIndex) {
                        $(this).hide();
                    }
                    else {
                        $(this).fadeOut(animationEnabled ? animation.deactivateDuration : 0, postDeactivate);
                    }
                });
            }
            else {
                postDeactivate();
            }
        },

        _adjustTabListHeight: function() {
            var self = this,
                position = self.options.position,
                tabList,
                divInnerHeight,
                lastLi;

            if (position == LEFT || position == RIGHT && self._divs && self._divs[self._activeIndex]) {
                tabList = $(self._tabList);
                divInnerHeight = $(self._divs[self._activeIndex]).innerHeight();

                tabList.css('min-height', divInnerHeight);

                lastLi = $(tabList.children('li').last());

                if (self._tabListHeight >= divInnerHeight) {
                    lastLi.addClass('sui-tabs-tab-last-bottom');
                }
                else {
                    lastLi.removeClass('sui-tabs-tab-last-bottom');
                }
            }
        },

        _keydown: function(event) {
            var self = this,
                prevent;

            // NOTE: since we are preventing events here, make sure we prevent events
            // fired only for the tab-related stuff like navigation;
            // So, if the event.target is not the tab container element, return.
            if ($(self.element)[0] !== $(event.target)[0]) {
                return;
            }

            switch (event.keyCode) {
                case keyCode.UP:
                case keyCode.LEFT:
                    self._selectPrevNext(event, true);
                    prevent = true;
                    break;
                case keyCode.DOWN:
                case keyCode.RIGHT:
                    self._selectPrevNext(event, false);
                    prevent = true;
                    break;
                case keyCode.SPACE:
                    if (self.options.collapsible) {
                        // toggle active state if collapsible
                        self._toggleCurrent(event);
                    }
                    prevent = true;
                    break;
                default:
                    break;
            }

            if (prevent) {
                event.preventDefault();
            }
        },

        _toggleCurrent: function(event) {
            var self = this,
                selectedIndex = self._selectedIndex;

            if (isDefined(selectedIndex)) {
                self._activate(selectedIndex, selectedIndex !== self._activeIndex, true);
            }
        },

        _selectPrevNext: function(event, isPrev) {
            var self = this,
                selectedIndex = self._selectedIndex,
                index = isDefined(selectedIndex) ? (isPrev ? self._getPrevSelectableIndex() : self._getNextSelectableIndex()) : self._getFirstSelectableIndex();

            if (isDefined(index) && index !== selectedIndex) {
                self._select(index);
            }
        },

        _getFirstSelectableIndex: function() {
            var self = this,
                index;

            $(self._tabList).children('li').each(function(i) {
                if (self.enabled(i)) {
                    index = i;
                    return false;
                }
            });

            return index;
        },

        _getNextSelectableIndex: function() {
            var self = this,
                selectedIndex = self._selectedIndex,
                tabs = $(self._tabList).children('li'),
                tabsLength = tabs.length,
                i;

            // try to find selectable tab after the currently selected index
            if (selectedIndex < tabsLength - 1) {
                for (i=selectedIndex+1; i<tabsLength; i++) {
                    if (self.enabled(i)) {
                        return i;
                    }
                }
            }
            
            // try to find selectable tab before the currently selected index
            if (selectedIndex > 0) {
                for (i=0; i<selectedIndex; i++) {
                    if (self.enabled(i)) {
                        return i;
                    }
                }
            }

            return UNDEFINED;
        },

        _getPrevSelectableIndex: function() {
            var self = this,
                selectedIndex = self._selectedIndex,
                tabs = $(self._tabList).children('li'),
                tabsLength = tabs.length,
                i;

            // try to find selectable tab before the currently selected index
            if (selectedIndex > 0) {
                for (i=selectedIndex-1; i>=0; i--) {
                    if (self.enabled(i)) {
                        return i;
                    }
                }
            }

            // try to find selectable tab after the currently selected index
            if (selectedIndex < tabsLength - 1) {
                for (i=tabsLength-1; i>selectedIndex; i--) {
                    if (self.enabled(i)) {
                        return i;
                    }
                }
            }

            return UNDEFINED;
        },

        // bool enabled(index) / void enabled(index, bool)
        enabled: function() {
            var self = this,
                args = [].slice.call(arguments),
                index = args[0],
                tab;

            // find the tab by index
            tab = $(self._tabList).children('li:eq(' + index + ')');

            if (tab.length > 0) {
                if (args.length > 1) {
                    // setter
                    if (args[1]) {
                        // enabled
                        $(tab).removeClass('sui-tabs-tab-disabled');
                    }
                    else {
                        // disabled
                        $(tab).addClass('sui-tabs-tab-disabled');
                    }
                }
                else {
                    // getter
                    return !$(tab).hasClass('sui-tabs-tab-disabled');
                }
            }
        },

        // list enabledIndices()
        enabledIndices: function() {
            var self = this,
                result = [];

            $(self._tabList).children('li').each(function(index, li) {
                if (!$(this).hasClass('sui-tabs-tab-disabled')) {
                    result.push(index);
                }
            });

            return result;
        },

        // int active() / void active(index, bool)
        active: function() {
            var self = this,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                // setter
                self._activate(args[0], args[1], false);
            }
            else {
                // getter
                return self._activeIndex;
            }
        },

        // object content(index)
        content: function(index) {
            return $(this._divs)[index];
        },

        // Tabs destructor
        destroy: function() {
            var self = this,
                element = $(self.element),
                options = self.options,
                cls = options.cls,
                tabList = self._tabList,
                eventNS = self._eventNS;

            if (self.dataSource) {
				self.dataSource.off(CHANGE + eventNS);
			}

            $(win).off(eventNS);

            $(element).removeClass('sui-tabs sui-tabs-' + options.position + (cls ? (' ' + cls) : ''));

            // delete the custom divs
            $(element).children('div').removeClass('sui-tabs-item');
            $(element).children('.sui-tabs-cust').remove();
            self._divs = null;

            // clean some tabs data
            $(tabList).children('li')
                .removeClass('sui-unselectable')
                .off(eventNS);
            $(tabList).removeClass('sui-tabs-tablist');

            // if there was no tablist initially, remove the one we created
            if (self._noTabList) {
                $(tabList).remove();
            }

            self._tabList = self._noTabList = self._activeIndex = self._selectedIndex = self._initialized = self._tabListHeight = UNDEFINED;

            // call the base destroy
            Widget.fn.destroy.call(self);
        }
    });
    Tabs.defaults = tabsDefaults;
    shield.ui.plugin("Tabs", Tabs);

})(jQuery, shield, this);