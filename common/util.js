(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        keyCode = shield.Constants.KeyCode,
        error = shield.error,

        doc = document,
        mathAbs = Math.abs,
        mathMin = Math.min,
        mathMax = Math.max,
		mathRound = Math.round,
        mathFloor = Math.floor,

        extend = $.extend,
        proxy = $.proxy,
		each = $.each,
		isWindow = $.isWindow,

        isDefined = shield.is.defined,
        isFunction = shield.is.func,
        isNumber = shield.is.number,
        isObject = shield.is.object,
        isNull = shield.is["null"],
        isString = shield.is.string,
        isArray = shield.is.array,
        toInt = shield.to["int"],
        toNumber = shield.to.number,
        toString = shield.to.string,

		cachedScrollbarWidth,
		rhorizontal = /left|center|right/,
		rvertical = /top|center|bottom/,
		roffset = /[\+\-]\d+(\.[\d]+)?%?/,
		rposition = /^\w+/,
		rpercent = /%$/,

        MOUSEDOWN = "mousedown",
        MOUSEUP = "mouseup",
        MOUSEMOVE = "mousemove",
        KEYDOWN = "keydown",
        START = "start",
        STOP = "stop",
        RESIZE = "resize",
        RESIZED = "resized",
        DRAG = "drag",
        DROP = "drop",
        CANCEL = "cancel",
        DISABLED = "disabled",
        PX = "px",
		LEFT = "left",
		RIGHT = "right",
		TOP = "top",
		BOTTOM = "bottom",
		MIDDLE = "middle",
		CENTER = "center",
		OVERFLOW = "overflow",
		AUTO = "auto",
        POSITION = "position",
        ABSOLUTE = "absolute",
        RELATIVE = "relative",
		OVERFLOWX = "overflow-x",
		OVERFLOWY = "overflow-y",
		SCROLL = "scroll",
		HORIZONTAL = "horizontal",
		VERTICAL = "vertical",
		MY = "my",
		AT = "at",
		MARGINLEFT = "marginLeft",
		MARGINRIGHT = "marginRight",
		MARGINTOP = "marginTop",
		MARGINBOTTOM = "marginBottom",
		FLIP = "flip",
        POINTER = "pointer",
        FIT = "fit",
        INTERSECT = "intersect",
        TOUCH = "touch",

        SUI_RESIZABLE_CLS = "sui-resizable",
        SUI_RESIZABLE_DISABLED_CLS = SUI_RESIZABLE_CLS + "-" + DISABLED,
        SUI_DRAGGABLE_CLS = "sui-draggable",
        SUI_DRAGGABLE_DISABLED_CLS = SUI_DRAGGABLE_CLS + "-" + DISABLED,
        SUI_DRAGGABLE_DRAGGING_CLS = SUI_DRAGGABLE_CLS + "-dragging",
        SUI_UNSELECTABLE_CLS = "sui-unselectable",
        SUI_DROPPABLE_CLS = "sui-droppable",
        SUI_DROPPABLE_DISABLED_CLS = SUI_DROPPABLE_CLS + "-" + DISABLED,
        SUI_DROPPABLE_HOVER_CLS = SUI_DROPPABLE_CLS + "-over",

        MouseTracker, mouseTrackerInstance, mouseTrackerInstances = 0,
        Util,
        Position, Overflow,
        DDManager,
        Draggable, draggableDefaults,
        Droppable, droppableDefaults,
        Resizable, resizableDefaults;


    // Some utility functions
    function getScrollbarWidth() {
		if (isDefined(cachedScrollbarWidth)) { 
            return cachedScrollbarWidth; 
        }

		var widthBefore, 
            widthAfter,
			div = $('<div style="width:50px;position:absolute;overflow:hidden;height:50px;display:block;">' + 
                '<div style="width:auto;height:100px;"></div>' + 
            '</div>'),
			innerDiv = div.children()[0];

		$(doc.body).append(div);

		widthBefore = innerDiv.offsetWidth;

		div.css(OVERFLOW, SCROLL);

		widthAfter = innerDiv.offsetWidth;

		if (widthBefore === widthAfter) { 
            widthAfter = div[0].clientWidth; 
        }

		div.remove();

		return (cachedScrollbarWidth = widthBefore - widthAfter);
	}

    function getScrollInfo(within) {
		var overflowX = within.isWindow || within.isDocument ? "" : within.element.css(OVERFLOWX),
			overflowY = within.isWindow || within.isDocument ? "" : within.element.css(OVERFLOWY),
			hasOverflowX = overflowX === SCROLL || ( overflowX === AUTO && within.width < within.element[0].scrollWidth ),
			hasOverflowY = overflowY === SCROLL || ( overflowY === AUTO && within.height < within.element[0].scrollHeight );

		return {
			width: hasOverflowY ? getScrollbarWidth() : 0,
			height: hasOverflowX ? getScrollbarWidth() : 0
		};
	}

    function getWithinInfo(element) {
		var withinElement = $(element || win),
			isWindowElement = isWindow(withinElement[0]),
			isDocument = !!withinElement[0] && withinElement[0].nodeType === 9;

		return {
			element: withinElement,
			isWindow: isWindowElement,
			isDocument: isDocument,
			offset: isWindowElement ? {left: 0, top: 0} : (withinElement.offset() || {left: 0, top: 0}),
			scrollLeft: withinElement.scrollLeft(),
			scrollTop: withinElement.scrollTop(),
			width: isWindowElement || isDocument ? withinElement.width() : withinElement.outerWidth(),
			height: isWindowElement || isDocument ? withinElement.height() : withinElement.outerHeight()
		};
	}

	function getOffsets(offsets, width, height) {
		return [
			toNumber(offsets[0]) * ( rpercent.test(offsets[0]) ? width / 100 : 1 ),
			toNumber(offsets[1]) * ( rpercent.test(offsets[1]) ? height / 100 : 1 )
		];
	}

	function parseCssInt(element, property) {
		var value = element.css(property);
        return value ? toInt(value) || 0 : 0;
	}

	function getDimensions(elem) {
		var raw = elem[0];

		if (raw.nodeType === 9) {
			return {
				width: elem.width(),
				height: elem.height(),
				offset: { top: 0, left: 0 }
			};
		}
		if (isWindow(raw)) {
			return {
				width: elem.width(),
				height: elem.height(),
				offset: { top: elem.scrollTop(), left: elem.scrollLeft() }
			};
		}
		if (raw.preventDefault) {
			return {
				width: 0,
				height: 0,
				offset: { top: raw.pageY, left: raw.pageX }
			};
		}

		return {
			width: elem.outerWidth(),
			height: elem.outerHeight(),
			offset: elem.offset()
		};
	}

    // returns the maximum z-index css property for the elements
    // matching the selector, optionally contained within the parent
    function getMaxZIndex(selector, parent) {
        var max = 0,
            elements = isDefined(parent) ? $(parent).find(selector) : $(selector);

        elements.each(function(index) {
            max = mathMax(max, parseCssInt($(this), 'z-index'));
        });

        return max;
    }

    function getCoordinates(e) {
        return (e.pageX || e.pageY) ?
            {
                x: e.pageX,
                y: e.pageY
            } :
            {
                x: (e.clientX + doc.body.scrollLeft - doc.body.clientLeft),
                y: (e.clientY + doc.body.scrollTop  - doc.body.clientTop)
            };
    }

    // A utility namespace
    Util = {};
    Util.GetWithinInfo = getWithinInfo;
    Util.GetMaxZIndex = getMaxZIndex;
    Util.GetCoordinates = getCoordinates;
    shield.ui.Util = Util;


    // A singleton MouseTracker class for getting 
    // the current mouse position relative to the document
    MouseTracker = function() {
        mouseTrackerInstances++;

        if (mouseTrackerInstance) {
            return mouseTrackerInstance;
        }

        this.init();

        mouseTrackerInstance = this;
    };
    MouseTracker.prototype = {
        _pos: null,

        init: function() {
            var self = this;
            $(doc).on(MOUSEMOVE + ".suiMouseTracker", proxy(self._onMouseMove, self));
        },

        _onMouseMove: function(e) {
            this._pos = this.getPosFromEvent(e);
        },

        getPosFromEvent: function(e) {
            return getCoordinates(e);
        },

        getPosition: function(e) {
            var self = this;

            // if current saved pos is null - try to get it from the event
            if (self._pos === null && isDefined(e)) {
                self._pos = self.getPosFromEvent(e);
            }
            return self._pos;
        },

        isInWindow: function(e) {
            var self = this,
                pos = self.getPosition(e),
                posX = pos.x,
                posY = pos.y,
                winScrollTop = $(win).scrollTop(),
                winScrollLeft = $(win).scrollLeft();

            return posX >= winScrollLeft && posX <= winScrollLeft + $(win).width() && 
                posY >= winScrollTop && posY <= winScrollTop + $(win).height();
        },

        destroy: function() {
            var self = this;

            // decrement the instance count and return if any left
            if (--mouseTrackerInstances > 0) {
                return;
            }

            // cleanup
            $(doc).off(MOUSEMOVE + ".suiMouseTracker");
            mouseTrackerInstance = null;
        }
    };
    shield.MouseTracker = MouseTracker;


    // Position utility class
    Position = {};
    Position.Set = function(element, eltarget, setOptions) {
		//if invalid argument - throw exception
        if (!element || !eltarget || !setOptions) {
			throw "Invalid arguments passed to Position.Set";
		}

		var atOffset, 
            targetWidth, 
            targetHeight, 
            targetOffset, 
            basePosition, 
            dimensions,
			options = {
				my: setOptions.source,
				at: setOptions.target,
				collision: setOptions.overflow,
				inside: setOptions.inside
			},
			target = $(eltarget),
			within = getWithinInfo(options.inside),
			scrollInfo = getScrollInfo(within),
			collision = (options.collision || FLIP).split(" "),
			offsets = {};

		dimensions = getDimensions(target);

		if (target[0].preventDefault) {
			// force left top to allow flipping
			options.at = "left top";
		}

		targetWidth = dimensions.width;
		targetHeight = dimensions.height;
		targetOffset = dimensions.offset;

		// clone to reuse original targetOffset later
		basePosition = extend({}, targetOffset);

		// force my and at to have valid horizontal and vertical positions
		// if a value is missing or invalid, it will be converted to center
		each([MY, AT], function() {
			var self = this,
				pos = (options[self] || "").split(" "),
				horizontalOffset,
				verticalOffset;

			if (pos.length === 1) {
				pos = rhorizontal.test(pos[0]) ?
					pos.concat([CENTER]) :
					rvertical.test(pos[0]) ?
						[CENTER].concat(pos) :
						[CENTER, CENTER];
			}
			pos[0] = rhorizontal.test(pos[0]) ? pos[0] : CENTER;
			pos[1] = rvertical.test(pos[1]) ? pos[1] : CENTER;

			// calculate offsets
			horizontalOffset = roffset.exec(pos[0]);
			verticalOffset = roffset.exec(pos[1]);
			offsets[self] = [
				horizontalOffset ? horizontalOffset[0] : 0,
				verticalOffset ? verticalOffset[0] : 0
			];

			// reduce to just the positions without the offsets
			options[self] = [
				rposition.exec(pos[0])[0],
				rposition.exec(pos[1])[0]
			];
		});

		// normalize collision option
		if (collision.length === 1) {
			collision[1] = collision[0];
		}

		if (options.at[0] === RIGHT) {
			basePosition.left += targetWidth;
		}
        else if (options.at[0] === CENTER) {
			basePosition.left += targetWidth / 2;
		}

		if (options.at[1] === BOTTOM) {
			basePosition.top += targetHeight;
		}
        else if (options.at[1] === CENTER) {
			basePosition.top += targetHeight / 2;
		}

		atOffset = getOffsets(offsets.at, targetWidth, targetHeight);
		basePosition.left += atOffset[0];
		basePosition.top += atOffset[1];

		var collisionPosition,
            callbackFunction,
			elem = $(element),
			elemWidth = elem.outerWidth(),
			elemHeight = elem.outerHeight(),
			marginLeft = parseCssInt(elem, MARGINLEFT),
			marginTop = parseCssInt(elem, MARGINTOP),
			collisionWidth = elemWidth + marginLeft + parseCssInt(elem, MARGINRIGHT) + scrollInfo.width,
			collisionHeight = elemHeight + marginTop + parseCssInt(elem, MARGINBOTTOM) + scrollInfo.height,
			position = extend({}, basePosition),
			myOffset = getOffsets(offsets.my, elem.outerWidth(), elem.outerHeight());

		if (options.my[0] === RIGHT) {
			position.left -= elemWidth;
		}
        else if (options.my[0] === CENTER) {
			position.left -= elemWidth / 2;
		}

		if (options.my[1] === BOTTOM) {
			position.top -= elemHeight;
		}
        else if (options.my[1] === CENTER) {
			position.top -= elemHeight / 2;
		}

		position.left += myOffset[0];
		position.top += myOffset[1];

        // round
        position.left = mathRound(position.left);
        position.top = mathRound(position.top);

		collisionPosition = {
			marginLeft: marginLeft,
			marginTop: marginTop
		};

		each([LEFT, TOP], function(i, dir) {
			if (Overflow[collision[i]]) {
				Overflow[collision[i]][dir](position, {
					targetWidth: targetWidth,
					targetHeight: targetHeight,
					elemWidth: elemWidth,
					elemHeight: elemHeight,
					collisionPosition: collisionPosition,
					collisionWidth: collisionWidth,
					collisionHeight: collisionHeight,
					offset: [atOffset[0] + myOffset[0], atOffset[1] + myOffset[1]],
					my: options.my,
					at: options.at,
					within: within,
					elem: elem
				});
			}
		});

        // if there is a callback defined, init it and collect the positioning info in advance,
        // so that it gets called later with the correct info
		if (isFunction(setOptions.callback)) {
			callbackFunction = function() {
				var left = targetOffset.left - position.left,
					right = left + targetWidth - elemWidth,
					top = targetOffset.top - position.top,
					bottom = top + targetHeight - elemHeight,
					feedback = {
						target: {
							element: target,
							left: targetOffset.left,
							top: targetOffset.top,
							width: targetWidth,
							height: targetHeight
						},
						element: {
							element: elem,
							left: position.left,
							top: position.top,
							width: elemWidth,
							height: elemHeight
						},
						horizontal: right < 0 ? LEFT : left > 0 ? RIGHT : CENTER,
						vertical: bottom < 0 ? TOP : top > 0 ? BOTTOM : MIDDLE
					};

				if (targetWidth <= elemWidth && mathAbs(left + right) <= targetWidth) {
					feedback.horizontal = CENTER;
				}

				if (targetHeight <= elemHeight && mathAbs(top + bottom) <= targetHeight) {
					feedback.vertical = MIDDLE;
				}

				if (mathMax(mathAbs(left), mathAbs(right)) > mathMax(mathAbs(top), mathAbs(bottom))) {
					feedback.important = HORIZONTAL;
				}
                else {
					feedback.important = VERTICAL;
				}

				setOptions.callback(feedback);
			};
		}

        // set the position of the element
		elem.offset(position);

        // apply any callback functions
		if (callbackFunction) { 
            callbackFunction();
        }
	};

	Overflow = {
		fit: {
			left: function(position, data) {
				var within = data.within,
					withinOffset = within.isWindow ? within.scrollLeft : within.offset.left,
					outerWidth = within.width,
					collisionPosLeft = position.left - data.collisionPosition.marginLeft,
					overLeft = withinOffset - collisionPosLeft,
					overRight = collisionPosLeft + data.collisionWidth - outerWidth - withinOffset,
					newOverRight;

				if (data.collisionWidth > outerWidth) {
                    // element is wider than within

					if (overLeft > 0 && overRight <= 0) {
                        // element is initially over the left side of within
						newOverRight = position.left + overLeft + data.collisionWidth - outerWidth - withinOffset;
						position.left += overLeft - newOverRight;
					}
                    else if (overRight > 0 && overLeft <= 0) {
                        // element is initially over right side of within
						position.left = withinOffset;
					}
                    else {
                        // element is initially over both left and right sides of within
						if (overLeft > overRight) {
							position.left = withinOffset + outerWidth - data.collisionWidth;
						}
                        else {
							position.left = withinOffset;
						}
					}
				}
                else if (overLeft > 0) {
                    // too far left -> align with left edge
					position.left += overLeft;
				}
                else if (overRight > 0) {
                    // too far right -> align with right edge
					position.left -= overRight;
				}
                else {
                    // adjust based on position and margin
					position.left = mathMax(position.left - collisionPosLeft, position.left);
				}
			},
			top: function(position, data) {
				var within = data.within,
					withinOffset = within.isWindow ? within.scrollTop : within.offset.top,
					outerHeight = data.within.height,
					collisionPosTop = position.top - data.collisionPosition.marginTop,
					overTop = withinOffset - collisionPosTop,
					overBottom = collisionPosTop + data.collisionHeight - outerHeight - withinOffset,
					newOverBottom;

				if ( data.collisionHeight > outerHeight ) {
                    // element is taller than within
					
					if (overTop > 0 && overBottom <= 0) {
                        // element is initially over the top of within
						newOverBottom = position.top + overTop + data.collisionHeight - outerHeight - withinOffset;
						position.top += overTop - newOverBottom;
					}
                    else if (overBottom > 0 && overTop <= 0) {
                        // element is initially over bottom of within
						position.top = withinOffset;
					}
                    else {
                        // element is initially over both top and bottom of within
						if (overTop > overBottom) {
							position.top = withinOffset + outerHeight - data.collisionHeight;
						}
                        else {
							position.top = withinOffset;
						}
					}
				}
                else if (overTop > 0) {
                    // too far up -> align with top
					position.top += overTop;
				}
                else if (overBottom > 0) {
                    // too far down -> align with bottom edge
					position.top -= overBottom;
				}
                else {
                    // adjust based on position and margin
					position.top = mathMax(position.top - collisionPosTop, position.top);
				}
			}
		},
		flip: {
			left: function(position, data) {
				var within = data.within,
					withinOffset = within.offset.left + within.scrollLeft,
					outerWidth = within.width,
					offsetLeft = within.isWindow ? within.scrollLeft : within.offset.left,
					collisionPosLeft = position.left - data.collisionPosition.marginLeft,
					overLeft = collisionPosLeft - offsetLeft,
					overRight = collisionPosLeft + data.collisionWidth - outerWidth - offsetLeft,
					myOffset = data.my[0] === LEFT ?
						-data.elemWidth :
						data.my[0] === RIGHT ?
							data.elemWidth :
							0,
					atOffset = data.at[0] === LEFT ?
						data.targetWidth :
						data.at[0] === RIGHT ?
							-data.targetWidth :
							0,
					offset = -2 * data.offset[0],
					newOverRight,
					newOverLeft;

				if (overLeft < 0) {
					newOverRight = position.left + myOffset + atOffset + offset + data.collisionWidth - outerWidth - withinOffset;
					if (newOverRight < 0 || newOverRight < mathAbs(overLeft)) {
						position.left += myOffset + atOffset + offset;
					}
				}
                else if (overRight > 0) {
					newOverLeft = position.left - data.collisionPosition.marginLeft + myOffset + atOffset + offset - offsetLeft;
					if (newOverLeft > 0 || mathAbs(newOverLeft) < overRight) {
						position.left += myOffset + atOffset + offset;
					}
				}
			},
			top: function(position, data) {
				var within = data.within,
					withinOffset = within.offset.top + within.scrollTop,
					outerHeight = within.height,
					offsetTop = within.isWindow ? within.scrollTop : within.offset.top,
					collisionPosTop = position.top - data.collisionPosition.marginTop,
					overTop = collisionPosTop - offsetTop,
					overBottom = collisionPosTop + data.collisionHeight - outerHeight - offsetTop,
					top = data.my[1] === TOP,
					myOffset = top ?
						-data.elemHeight :
						data.my[1] === BOTTOM ?
							data.elemHeight :
							0,
					atOffset = data.at[1] === TOP ?
						data.targetHeight :
						data.at[1] === BOTTOM ?
							-data.targetHeight :
							0,
					offset = -2 * data.offset[1],
					newOverTop,
					newOverBottom;

				if (overTop < 0) {
					newOverBottom = position.top + myOffset + atOffset + offset + data.collisionHeight - outerHeight - withinOffset;
					if ((position.top + myOffset + atOffset + offset) > overTop && (newOverBottom < 0 || newOverBottom < mathAbs(overTop))) {
						position.top += myOffset + atOffset + offset;
					}
				}
                else if (overBottom > 0) {
					newOverTop = position.top - data.collisionPosition.marginTop + myOffset + atOffset + offset - offsetTop;
					if ((position.top + myOffset + atOffset + offset) > overBottom && (newOverTop > 0 || mathAbs(newOverTop) < overBottom)) {
						position.top += myOffset + atOffset + offset;
					}
				}
			}
		},
		flipfit: {
			left: function() {
				Overflow.flip.left.apply(this, arguments);
				Overflow.fit.left.apply(this, arguments);
			},
			top: function() {
				Overflow.flip.top.apply(this, arguments);
				Overflow.fit.top.apply(this, arguments);
			}
		}
	};
    shield.ui.Position = Position;


    // Resizable widget default settings
    resizableDefaults = {
        enabled: true,
        cls: UNDEFINED, // an optional class to add to the element
        iframeFix: false,       // place divs over any iframes that will catch the mousemove events
        resizeCls: UNDEFINED,   // an optional class to add while being resized
        delta: 1,    // minimum distance for which to start resizing
        handles: ["e", "w", "n", "s", "se", "sw", "ne", "nw"],  // which handles (directions) to resize to
        handleWidth: 8,
        handleZIndex: 105,
        minHeight: 16,
        minWidth: 16,
        maxHeight: UNDEFINED,
        maxWidth: UNDEFINED,
        events: {
            // start
            // stop
            // resize
        }
    };
	// Public methods:
    //		bool enabled()	/	void enabled(bEnabled)
    //      bool visible()  /   void visible(boolVisible)
	//		void resize(width, height)
	// Resizable widget class
    Resizable = Widget.extend({
		init: function () {
			// call the parent init
            Widget.fn.init.apply(this, arguments);

            // NOTE: hack the options.handles, because the jQuery.exend
            // will merge the list instead of replacing it
            if (isDefined(this.initialOptions.handles)) {
                this.options.handles = this.initialOptions.handles;
            }

			var self = this,
                element = $(self.element),
                options = self.options,
                cls = options.cls;

            self._eventNS = ".shieldResizable" + self.getInstanceId();

            // init the mouse tracker
            self.mouseTracker = new MouseTracker();

            // add the core and optional classes
            element.addClass(SUI_RESIZABLE_CLS + (cls ? (" " + cls) : ""));

            // init the handles
            self._initHandles();

            // initialize the disabled state
			self.enabled(options.enabled);
        },

        _initHandles: function() {
            var self = this,
                element = $(self.element),
                elementWidth = element.width(),
                elementHeight = element.height(),
                options = self.options,
                handlesOption = options.handles,
                handleWidth = options.handleWidth,
                handleWidthPX = handleWidth + PX,
                cornerWidthPX = (handleWidth + 2) + PX,
                negativeHandleWidthPX = "-" + (handleWidth - 2) + PX,
                handleZIndex = options.handleZIndex,
                handle,
                css,
                i;

            self.handles = [];

            // add the handles in the order of definition in the handles
            for (i=0; i<handlesOption.length; i++) {
                handle = toString(handlesOption[i]).toLowerCase();

                // generate the css style for the handle
                css = {};
                switch(handle)
                {
                    case "e":
                        css = {
                            width: handleWidthPX,
                            height: elementHeight + PX,
                            top: 0,
                            right: negativeHandleWidthPX
                        };
                        break;
                    case "w":
                        css = {
                            width: handleWidthPX,
                            height: elementHeight + PX,
                            top: 0,
                            left: negativeHandleWidthPX
                        };
                        break;
                    case "n":
                        css = {
                            width: "100%",
                            height: handleWidthPX,
                            top: negativeHandleWidthPX
                        };
                        break;
                    case "s":
                        css = {
                            width: "100%",
                            height: handleWidthPX,
                            bottom: negativeHandleWidthPX
                        };
                        break;
                    case "se":
                        css = {
                            width: cornerWidthPX,
                            height: cornerWidthPX,
                            bottom: negativeHandleWidthPX,
                            right: negativeHandleWidthPX
                        };
                        break;
                    case "sw":
                        css = {
                            width: cornerWidthPX,
                            height: cornerWidthPX,
                            bottom: negativeHandleWidthPX,
                            left: negativeHandleWidthPX
                        };
                        break;
                    case "ne":
                        css = {
                            width: cornerWidthPX,
                            height: cornerWidthPX,
                            top: negativeHandleWidthPX,
                            right: negativeHandleWidthPX
                        };
                        break;
                    case "nw":
                        css = {
                            width: cornerWidthPX,
                            height: cornerWidthPX,
                            top: negativeHandleWidthPX,
                            left: negativeHandleWidthPX
                        };
                        break;
                    default:
                        break;
                }
                css.zIndex = handleZIndex;

                // init the handle element and handlers and save them in a var
                self.handles[i] = {
                    type: handle
                };

                self.handles[i][MOUSEDOWN] = proxy(self._handleMouseDown, self, i);

                self.handles[i].element = $('<div class="sui-resizable-handle sui-resizable-dir-' + handle + '"></div>')
                    .appendTo(element)
                    .css(css)
                    .on(MOUSEDOWN, self.handles[i][MOUSEDOWN]);
            }

            // init global document mouseup and mousemove events
            $(doc)
                .on(MOUSEUP + self._eventNS, proxy(self._handleMouseUp, self))
                .on(MOUSEMOVE + self._eventNS, proxy(self._handleMouseMove, self));
        },

        _destroyHandles: function() {
            var self = this,
                handles = self.handles,
                i;

            // clear the global mouseup and mousemove events on the doc
            $(doc).off(self._eventNS);

            // destroy each handle
            for (i=0; i<handles.length; i++) {
                $(self.handles[i].element)
                    .off(MOUSEDOWN, self.handles[i][MOUSEDOWN])
                    .remove();
            }

            self.handles = [];
        },

        _fixIframes: function() {
            var self = this,
                iframeFix = self.options.iframeFix,
                selector;

            if (iframeFix) {
                selector = iframeFix === true ? "iframe" : iframeFix;
                self._fixedFrames = $(doc.body).find(selector).map(function() {
                    var iframe = $(this);

                    return $('<div/>')
                        .css(POSITION, ABSOLUTE)
                        .appendTo(iframe.parent())
                        .outerWidth(iframe.outerWidth())
                        .outerHeight(iframe.outerHeight())
                        .offset(iframe.offset())[0];
                });
            }
        },

        _unfixIframes: function() {
            var self = this;

            if (self._fixedFrames) {
                $(self._fixedFrames).remove();
                delete self._fixedFrames;
            }
        },

        _handleMouseDown: function(handleIndex, event) {
            var self = this;

            // do not do anything if disabled or currently resizing
            if (!self._enabled || !!self.resizing) {
                return;
            }

            self.resizing = true;
            self.resizingHandle = handleIndex;
            self.oldPos = self.mouseTracker.getPosition(event);
            self.startSent = false;

            // add the unselectable class
            $(self.element).addClass(SUI_UNSELECTABLE_CLS);

            self._fixIframes();
        },

        _handleMouseMove: function(event) {
            var self = this,
                element = $(self.element),
                options = self.options,
                delta = options.delta,
                minWidth = options.minWidth,
                maxWidth = options.maxWidth,
                minHeight = options.minHeight,
                maxHeight = options.maxHeight,
                resizeCls = options.resizeCls,
                resizingHandle = self.resizingHandle,
                handles = self.handles,
                mouseTracker = self.mouseTracker,
                oldPos = self.oldPos,
                handle,
                handleType,
                newPos,
                deltaX,
                deltaY,
                sizeDeltaX,
                sizeDeltaY,
                positionDeltaX,
                positionDeltaY,
                cssTop,
                cssLeft,
                currWidth,
                currHeight,
                newWidth,
                newHeight,
                i;

            // do not do anything if the mouse is not over the window
            if (!mouseTracker.isInWindow(event)) {
                return;
            }

            if (!!self.resizing && isDefined(resizingHandle)) {
                // check to see if we can should resize
                newPos = mouseTracker.getPosition(event);

                deltaX = newPos.x - oldPos.x;
                deltaY = newPos.y - oldPos.y;

                handle = handles[resizingHandle];
                handleType = handle.type;

                // do anything only if any delta is bigger than the minimum delta
                if (mathAbs(deltaX) >= delta || mathAbs(deltaY) >= delta) {
                    // if not corner handle, reset one of the deltas 
                    if (!/^(se|sw|ne|nw)$/i.test(handleType)) {
                        if (/^(e|w)$/i.test(handleType)) {
                            // east / west
                            deltaY = 0;
                        }
                        else {
                            // north / south
                            deltaX = 0;
                        }
                    }

                    // if either delta is <= min delta, reset it to 0
                    if (mathAbs(deltaX) < delta) {
                        deltaX = 0;
                    }
                    if (mathAbs(deltaY) < delta) {
                        deltaY = 0;
                    }

                    // calculate the size deltas, which will be used for modifying the current element size
                    // and the position deltas, used for moving the element's top and left css if needed
                    sizeDeltaX = deltaX;
                    sizeDeltaY = deltaY;
                    positionDeltaX = 0;
                    positionDeltaY = 0;
                    // override the above for some handle types
                    switch (handleType)
                    {
                        case "w":
                            sizeDeltaX = -deltaX;
                            positionDeltaX = -sizeDeltaX;
                            break;
                        case "n":
                            sizeDeltaY = -deltaY;
                            positionDeltaY = -sizeDeltaY;
                            break;
                        case "nw":
                            sizeDeltaX = -deltaX;
                            sizeDeltaY = -deltaY;
                            positionDeltaX = -sizeDeltaX;
                            positionDeltaY = -sizeDeltaY;
                            break;
                        case "sw":
                            sizeDeltaX = -deltaX;
                            positionDeltaX = -sizeDeltaX;
                            break;
                        case "ne":
                            sizeDeltaY = -deltaY;
                            positionDeltaY = -sizeDeltaY;
                            break;
                        default:
                            break;
                    }

                    // get the current width and height of the element
                    currWidth = element.width();
                    currHeight = element.height();

                    // get the current position of the element
                    cssTop = parseCssInt(element, TOP);
                    cssLeft = parseCssInt(element, LEFT);

                    // check the deltaX for min/max width
                    if (sizeDeltaX > 0) {
                        // increasing size - check for max width
                        if (isDefined(maxWidth) && currWidth + sizeDeltaX > maxWidth) {
                            sizeDeltaX = maxWidth - currWidth;
                            // update this in order to prevent the element from being moved
                            // NOTE: from the code above, the position delta for a dimension
                            // is always the inverse of the size delta if not 0
                            if (positionDeltaX !== 0) {
                                positionDeltaX = -sizeDeltaX;
                            }
                        }
                        // check for new pos will be < 0
                        if (cssLeft + positionDeltaX < 0) {
                            sizeDeltaX -= cssLeft - positionDeltaX;
                            positionDeltaX = -sizeDeltaX;
                        }
                    }
                    else if (sizeDeltaX < 0) {
                        // decreasing size - check for min width
                        if (isDefined(minWidth) && currWidth + sizeDeltaX < minWidth) {
                            sizeDeltaX = minWidth - currWidth;
                            // update this in order to prevent the element from being moved
                            // NOTE: from the code above, the position delta for a dimension
                            // is always the inverse of the size delta if not 0
                            if (positionDeltaX !== 0) {
                                positionDeltaX = -sizeDeltaX;
                            }
                        }
                    }

                    // check the deltaY for min/max height
                    if (sizeDeltaY > 0) {
                        // increasing size - check for max height
                        if (isDefined(maxHeight) && currHeight + sizeDeltaY > maxHeight) {
                            sizeDeltaY = maxHeight - currHeight;
                            // update this in order to prevent the element from being moved
                            // NOTE: from the code above, the position delta for a dimension
                            // is always the inverse of the size delta if not 0
                            if (positionDeltaY !== 0) {
                                positionDeltaY = -sizeDeltaY;
                            }
                        }
                        // check for new pos will be < 0
                        if (cssTop + positionDeltaY < 0) {
                            sizeDeltaY -= cssTop - positionDeltaY;
                            positionDeltaY = -sizeDeltaY;
                        }
                    }
                    else if (sizeDeltaY < 0) {
                        // decreasing size - check for min height
                        if (isDefined(minHeight) && currHeight + sizeDeltaY < minHeight) {
                            sizeDeltaY = minHeight - currHeight;
                            // update this in order to prevent the element from being moved
                            // NOTE: from the code above, the position delta for a dimension
                            // is always the inverse of the size delta if not 0
                            if (positionDeltaY !== 0) {
                                positionDeltaY = -sizeDeltaY;
                            }
                        }
                    }

                    // if we still have any positive delta for now, resize the element
                    // and update the oldPos accordingly
                    if (sizeDeltaX !== 0 || sizeDeltaY !== 0) {
                        // trigger start if not triggered
                        if (!self.startSent) {
                            self.startSent = true;
                            self.trigger(START);

                            // add any custom class
                            if (resizeCls) {
                                element.addClass(resizeCls);
                            }
                        }

                        // trigger a resize event and handle any prevention
                        var evt = self.trigger(RESIZE, {deltaX: sizeDeltaX, deltaY: sizeDeltaY});
                        if (!evt.isDefaultPrevented()) {
                            // set the new size, inverting the deltas if 
                            element
                                .width(currWidth + sizeDeltaX)
                                .height(currHeight + sizeDeltaY);

                            // update the css position if needed
                            if (positionDeltaX !== 0 || positionDeltaY !== 0) {
                                element.css({
                                    top: (cssTop + positionDeltaY) + PX,
                                    left: (cssLeft + positionDeltaX) + PX
                                });
                            }

                            // update the oldPos
                            self.oldPos.x = self.oldPos.x + deltaX;
                            self.oldPos.y = self.oldPos.y + deltaY;

                            // if there was a vertical change, update the height of any east and west handles
                            if (deltaY !== 0) {
                                for (i=0; i<handles.length; i++) {
                                    // reusing this variable
                                    handle = handles[i];
                                    if (/^(e|w)$/i.test(handle.type)) {
                                        $(handle.element).height(currHeight + sizeDeltaY);
                                    }
                                }
                            }

                            // fire the resized internal event
                            self.trigger(RESIZED);
                        }
                    }
                }
            }
        },

        _handleMouseUp: function(event) {
            var self = this,
                // indicate to trigger a stop event if a start one has triggered
                triggerStop = !!self.startSent,
                resizeCls = self.options.resizeCls;

            self._unfixIframes();

            if (!self.resizing) {
                return;
            }

            self.resizing = false;
            self.resizingHandle = UNDEFINED;
            self.oldPos = UNDEFINED;
            self.startSent = false;

            if (triggerStop) {
                self.trigger(STOP);
            }

            // remove the unselectable and any custom class
            $(self.element).removeClass(SUI_UNSELECTABLE_CLS + (resizeCls ? " " + resizeCls : ""));
        },

        // resize the element
        resize: function(width, height) {
            var self = this,
                options = self.options;

            // bind the width between min and max
            width = mathMax(mathMin(width, options.maxWidth), options.minWidth);

            // bind the height between min and max
            height = mathMax(mathMin(height, options.maxHeight), options.minHeight);

            // resize the element
            $(self.element)
                .width(width)
                .height(height);
        },

		// setter/getter for the Resizable enabled state
		enabled: function() {
			var self = this,
				element = $(self.element),
				args = [].slice.call(arguments),
				bEnabled;

			if (args.length > 0) {
				// setter
				bEnabled = !!args[0];

				if (bEnabled) {
					element.removeClass(SUI_RESIZABLE_DISABLED_CLS);
				}
				else {
					element.addClass(SUI_RESIZABLE_DISABLED_CLS);
				}

				self._enabled = bEnabled;
			}
			else {
				// getter
				return self._enabled;
			}
		},

        // resizable destructor
		destroy: function() {
		    var self = this,
                cls = self.options.cls;

            // destroy the mouse tracker
            self.mouseTracker.destroy();
            self.mouseTracker = null;

            // remove added classes
            $(self.element).removeClass(SUI_RESIZABLE_CLS + (cls ? (" " + cls) : ""));

            // destroy the handles
		    self._destroyHandles();

		    Widget.fn.destroy.call(self);
		}
	});
    Resizable.defaults = resizableDefaults;
    shield.ui.plugin("Resizable", Resizable);


    // DDManager - drag & drop manager static class
    DDManager = {
        droppables: { "default": [] },

        Register: function(droppable) {
            var scope = droppable.options.scope;

            DDManager.droppables[scope] = DDManager.droppables[scope] || [];
            DDManager.droppables[scope].push(droppable);
        },

        UnRegister: function(droppable) {
            var scope = droppable.options.scope,
                droppables = DDManager.droppables[scope],
                i;

            for (i=0; i<droppables.length; i++) {
                if (droppables[i] === droppable) {
                    droppables.splice(i, 1);
                }
            }
        },

        PrepareOffsets: function(draggable, event) {
            var droppables = DDManager.droppables[draggable.options.scope] || [],
                draggableHelper = $(draggable.helper || draggable.element),
                enabled,
                visible,
                i,
                j;

            for (i=0; i<droppables.length; i++) {
                enabled = droppables[i].enabled();
                visible = droppables[i].visible();

                droppables[i].ddIsEnabled = enabled;
                droppables[i].ddIsVisible = visible;

                if (!enabled || !visible || (draggable && !droppables[i].accepts(draggable.element)) || (draggable && draggable.element.get(0) === droppables[i].element.get(0))) {
                    continue;
                }

                droppables[i].ddOffset = droppables[i].element.offset();
			    droppables[i].proportions({
                    width: droppables[i].element[0].offsetWidth,
                    height: droppables[i].element[0].offsetHeight
                });
            }

            draggable.proportions({
                width: draggableHelper[0].offsetWidth,
                height: draggableHelper[0].offsetHeight
            });
        },

        DragStart: function(draggable, event) {
            DDManager.PrepareOffsets(draggable, event);
        },

        // NOTE: not used at the moment
        //DragStop: function(draggable, event) {},

        // called from the Draggable widget when an item is being dragged
        Drag: function(draggable, event) {
            var droppables = DDManager.droppables[draggable.options.scope] || [],
                droppablesLen = droppables.length,
                intersects,
                i;

            for (i=0; i<droppablesLen; i++) {
                if (!droppables[i].ddIsEnabled || !droppables[i].ddIsVisible || (draggable && !droppables[i].accepts(draggable.element)) || (draggable && draggable.element.get(0) === droppables[i].element.get(0))) {
                    continue;
                }

                intersects = DDManager.Intersects(draggable, droppables[i], event);

                if (intersects) {
                    if (!droppables[i].ddIsOver) {
                        droppables[i].ddIsOver = true;
                        droppables[i].over(draggable, event);
                    }
                }
                else {
                    if (droppables[i].ddIsOver) {
                        droppables[i].ddIsOver = false;
                        droppables[i].out(draggable, event);
                    }
                }
            }
        },

        // called from the Draggable widget when an item is dropped (before Draggable stop event is called)
        Drop: function(draggable, event) {
            var droppables = DDManager.droppables[draggable.options.scope] || [],
                droppablesLen = droppables.length,
                intersects,
                i,
                cancelled,
                skipAnimation,
                evt;

            for (i=0; i<droppablesLen; i++) {
                if (!droppables[i].ddIsEnabled || !droppables[i].ddIsVisible || (draggable && !droppables[i].accepts(draggable.element)) || (draggable && draggable.element.get(0) === droppables[i].element.get(0))) {
                    continue;
                }

                droppables[i].stop();

                intersects = DDManager.Intersects(draggable, droppables[i], event);

                droppables[i].ddIsOver = false;

                if (intersects) {
                    evt = droppables[i].drop(draggable, event);
                    if (evt.isDefaultPrevented()) {
                        cancelled = true;
                    }
                    if (evt.skipAnimation) {
                        skipAnimation = true;
                    }
                }
            }

            return {
                cancelled: cancelled,
                skipAnimation: skipAnimation
            };
        },

        Intersects: function(draggable, droppable, event) {
            var tolerance = droppable.options.tolerance,
                toleranceX = isObject(tolerance) ? tolerance.x : tolerance,
                toleranceY = isObject(tolerance) ? tolerance.y : tolerance,
                proportions = droppable.proportions(),
                offset = droppable.ddOffset,
                width = proportions.width,
                height = proportions.height,
                left = offset.left,
                top = offset.top,
                intersectsX,
                intersectsY,
                draggableProportions,
                draggableWidth,
                draggableHeight,
                draggableOffset,
                draggableLeft,
                draggableTop,
                pos;

            // check intersectsX
            if (toleranceX == POINTER) {
                var mt = new MouseTracker();
                pos = mt.getPosition(event);
                mt.destroy();

                intersectsX = left <= pos.x && (left + width) >= pos.x;
            }
            else {
                draggableProportions = draggable.proportions();
                draggableWidth = draggableProportions.width;
                draggableHeight = draggableProportions.height;
                draggableOffset = $(draggable.helper || draggable.element).offset();
                draggableLeft = draggableOffset.left;
                draggableTop = draggableOffset.top;

                if (toleranceX == FIT) {
                    intersectsX = DDManager._linesOverlap(draggableLeft, draggableLeft + draggableWidth, left, left + width, draggableWidth);
                }
                else if (toleranceX == INTERSECT) {
                    intersectsX = DDManager._linesOverlap(draggableLeft, draggableLeft + draggableWidth, left, left + width, draggableWidth/2);
                }
                else { // touch
                    intersectsX = DDManager._linesOverlap(draggableLeft, draggableLeft + draggableWidth, left, left + width, 0);
                }
            }

            if (!intersectsX) {
                return false;
            }

            // check intersectsY
            if (toleranceY == POINTER) {
                if (!pos) {
                    var mt2 = new MouseTracker();
                    pos = mt2.getPosition(event);
                    mt2.destroy();
                }

                intersectsY = top <= pos.y && (top + height) >= pos.y;
            }
            else {
                if (!draggableProportions) {
                    draggableProportions = draggable.proportions();
                    draggableWidth = draggableProportions.width;
                    draggableHeight = draggableProportions.height;
                    draggableOffset = $(draggable.helper || draggable.element).offset();
                    draggableLeft = draggableOffset.left;
                    draggableTop = draggableOffset.top;
                }

                if (toleranceY == FIT) {
                    intersectsY = DDManager._linesOverlap(draggableTop, draggableTop + draggableHeight, top, top + height, draggableHeight);
                }
                else if (toleranceY == INTERSECT) {
                    intersectsY = DDManager._linesOverlap(draggableTop, draggableTop + draggableHeight, top, top + height, draggableHeight/2);
                }
                else { // touch
                    intersectsY = DDManager._linesOverlap(draggableTop, draggableTop + draggableHeight, top, top + height, 0);
                }
            }

            return intersectsX && intersectsY;
        },

        _linesOverlap: function(firstStart, firstEnd, secondStart, secondEnd, min) {
            if (!isDefined(min)) {
                min = 0;
            }

            if (firstStart < secondStart && firstEnd < secondEnd) {
                return firstEnd - secondStart > min;
            }
            else if (firstStart > secondStart && firstEnd > secondEnd) {
                return secondEnd - firstStart > min;
            }
            else {
                return true;
            }
        }
    };
    shield.ui.DDManager = DDManager;


    // Draggable widget default settings
    draggableDefaults = {
        enabled: true,
        iframeFix: false,       // place divs over any iframes that will catch the mousemove events
        cls: UNDEFINED,         // an optional class to add to the element
        dragCls: UNDEFINED,     // an optional class to add while being dragged
        scope: "default",       // for grouping draggable and droppable items
        handle: UNDEFINED,      // an optional handle to drag the element from
		direction: UNDEFINED,   // horizontal or vertical
		min: UNDEFINED,         // if direction defined
		max: UNDEFINED,         // if direction defined
        step: UNDEFINED,
		allowedPositions: UNDEFINED,  // an array of discrete values (if defined - apply step drag - used with direction conjunction)
        stack: true,            // adjusts the zIndex of the element being dragged - false, true (means to parent) or if string or jquery el - relative to it
        helper: UNDEFINED,      // a string or function for a helper element to be shown when dragged (instead of moving the original underlying element)
        // UNDEFINED means original will be moved; "clone" means a jQuery.clone() will be made; function(params); and HTML or selector string are supported
        appendTo: "parent",     // a string (parent|body|jquery-selector) identifying the element to add the helper to, if not part of the body
        animation: {
            enabled: true,
            revertDuration: 200
        },
        events: {
            // start
            // drag
            // stop
        }
    };
    // public methods:
    //      bool enabled() / void enabled(bool)
    // Draggable class
    Draggable = Widget.extend({
        init: function () {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
                element = $(self.element),
                options = self.options,
                cls = options.cls,
                cssPosition;

            self._eventNS = ".shieldDraggable" + self.getInstanceId();

            // init the mouse tracker
            self.mouseTracker = new MouseTracker();

            // add the core and optional classes
            element.addClass(SUI_DRAGGABLE_CLS + (cls ? (" " + cls) : ""));

            // make sure element's position is absolute or relative
            cssPosition = element.css(POSITION);
            if (cssPosition !== RELATIVE && cssPosition !== ABSOLUTE) {
                self._origPosStyle = cssPosition;
                element.css(POSITION, RELATIVE);
            }

            // initialize the disabled state
            self.enabled(options.enabled);

            self.startSent = false;
        },

        proportions: function() {
            var self = this;

            if (arguments.length > 0) {
                self._proportions = arguments[0];
            }
            else {
                return self._proportions ? self._proportions : self._proportions = {
                    width: self.element[0].offsetWidth,
                    height: self.element[0].offsetHeight
                };
            }
        },

        _fixIframes: function() {
            var self = this,
                iframeFix = self.options.iframeFix,
                selector;

            if (iframeFix) {
                selector = iframeFix === true ? "iframe" : iframeFix;
                self._fixedFrames = $(doc.body).find(selector).map(function() {
                    var iframe = $(this);

                    return $('<div/>')
                        .css(POSITION, ABSOLUTE)
                        .appendTo(iframe.parent())
                        .outerWidth(iframe.outerWidth())
                        .outerHeight(iframe.outerHeight())
                        .offset(iframe.offset())[0];
                });
            }
        },

        _unfixIframes: function() {
            var self = this;

            if (self._fixedFrames) {
                $(self._fixedFrames).remove();
                delete self._fixedFrames;
            }
        },

        _handleMouseDown: function(event) {
            var self = this,
                eventNS = self._eventNS;

            if (!self._enabled || self._dragging) {
                return;
            }

            $(doc.body).addClass(SUI_UNSELECTABLE_CLS);

            self._dragging = true;
            self.startSent = false;
			self.helper = self._isCustomHelper = null;

            // save the current mouse position
            self.stepPosition = self.mousePos = self.mouseTracker.getPosition(event);

            // add mousemove, mouseup and keydown handlers
            $(doc).on(MOUSEMOVE + eventNS, proxy(self._handleMouseMove, self))
                .on(MOUSEUP + eventNS, proxy(self._handleMouseUp, self))
                .on(KEYDOWN + eventNS, proxy(self._handleKeyDown, self));

            self._fixIframes();
        },

        _initHelper: function(event) {
            var self = this,
                element = self.element,
                options = self.options,
                helperOption = options.helper,
                appendTo = options.appendTo,
                cls = options.cls,
                dragCls = options.dragCls,
                helper;

            if (self._helperInitialized) {
                return;
            }

            // init the helper - the element being dragged
            if (helperOption && helperOption !== "original") {
                if (isFunction(helperOption)) {
                    helper = helperOption.call(self, {position: self.oriPosition, event: event});
                }
                else if (helperOption == "clone") {
                    helper = element.clone();
                }
                else {
                    helper = $(helperOption);
                }

                // make sure the helper is in the body
                if (!helper.parents("body").length) {
                    if (appendTo === "parent") {
                        element.after(helper);
                    }
                    else if (appendTo && appendTo !== "body") {
                        helper.appendTo($(appendTo));
                    }
                    else {
                        helper.appendTo(doc.body);
                    }
                }

                // make sure position is absolute or fixed
                if (!/(fixed|absolute)/i.test(helper.css(POSITION))) {
                    helper.css(POSITION, ABSOLUTE);
                }

                // position the custom helper on top of the element
                Position.Set(helper, element, {
                    source: "left top",
                    target: "left top",
                    overflow: "none"
                });

                self._isCustomHelper = true;
            }
            else {
                helper = element;
                self._isCustomHelper = false;
            }
            self.helper = helper;

            // add dragging classes to the helper
            helper.addClass(
                SUI_UNSELECTABLE_CLS + " " + 
                SUI_DRAGGABLE_CLS + (cls ? (" " + cls) : "") + " " + 
                SUI_DRAGGABLE_DRAGGING_CLS + (dragCls ? (" " + dragCls) : "")
            );

            // save the original position of the helper
            self.oriPosition = {
                left: parseCssInt(helper, LEFT),
                top: parseCssInt(helper, TOP)
            };

            self._helperInitialized = true;
        },

        _handleMouseMove: function(event) {
            var self = this,
                options = self.options,
                step = options.step,
                calculatedStep,
                stepX,
                stepY,
				direction = options.direction,
				allowedPositions = options.allowedPositions,
				stepDrag = allowedPositions !== UNDEFINED && allowedPositions.length > 0,
				min = options.min,
				max = options.max,
                mouseTracker = self.mouseTracker,
                newPos = mouseTracker.getPosition(event),
                cssTop, 
                cssLeft, 
                leftPos, 
                topPos,
				deltaX, 
                deltaY,
                helper,
                helperWidth,
                helperHeight;

            // do not do anything if the mouse is not over the window
            if (!mouseTracker.isInWindow(event)) {
                return;
            }

            if (self._dragging) {
                // make sure the helper is initialized
                self._initHelper(event);

                // get some helper info
                helper = $(self.helper);
                helperWidth = helper.width();
                helperHeight = helper.height();

                // get the top and left position of the helper
                cssTop = parseCssInt(helper, TOP);
                cssLeft = parseCssInt(helper, LEFT);

				if (!stepDrag) {
					deltaX = direction == VERTICAL ? 0 : newPos.x - self.mousePos.x;
					deltaY = direction == HORIZONTAL ? 0 : newPos.y - self.mousePos.y;

                    // bind the movement deltas by the step if defined
                    // (make the delta multiple of the step)
                    if (isDefined(step)) {
                        if (isFunction(step)) {
                            calculatedStep = step.call(this, {
								deltaX: deltaX, 
								deltaY: deltaY, 
								element: helper, 
								domEvent: event,
								
								helperLeft: parseCssInt(helper, LEFT), 
								helperTop: parseCssInt(helper, TOP), 
								mouse: newPos
							});
                        }
                        else {
                            calculatedStep = step;
                        }

                        if (isNumber(calculatedStep)) {
                            stepX = stepY = calculatedStep;
                        }
                        else if (isObject(calculatedStep)) {
                            stepX = calculatedStep.x;
                            stepY = calculatedStep.y;
                        }

                        // if no movement should be performed, because the X and Y steps are greater than the deltas,
                        // simply return - this will cancel the movement of the element
                        if ((isDefined(stepX) && mathAbs(deltaX) < stepX) && (isDefined(stepY) && mathAbs(deltaY) < stepY)) {
                            return;
                        }

                        // limit the deltas to be multiples of the steps
                        if (isDefined(stepX) && stepX > 1 && deltaX % stepX !== 0) {
                            deltaX = (deltaX >= 0 ? 1 : -1) * mathFloor(mathAbs(deltaX)/stepX) * stepX;
                        }
                        if (isDefined(stepY) && stepY > 1 && deltaY % stepY !== 0) {
                            deltaY = (deltaY >= 0 ? 1 : -1) * mathFloor(mathAbs(deltaY)/stepY) * stepY;
                        }
                    }

					leftPos = cssLeft + deltaX;
					topPos = mathMax(0, cssTop + deltaY);
				}
                else {
					var indexX = UNDEFINED, 
						indexY = UNDEFINED,
                        stepDeltaX,
						stepDeltaY,
						offsetX,
						offsetY,
                        marginX = UNDEFINED,
						marginY = UNDEFINED,
						i,
                        allowedPosition;

					//delta between start drag point and current point on x axis
					stepDeltaX = newPos.x - self.stepPosition.x;
					//delta between start drag point and current point on y axis
					stepDeltaY = newPos.y - self.stepPosition.y;
					
					offsetX = cssLeft + stepDeltaX;
					offsetY = cssTop + stepDeltaY;
					
					for(i = 0; i < allowedPositions.length; i++) {
						allowedPosition = allowedPositions[i];
						// check for closest element on the x axis
						if (allowedPosition.x !== UNDEFINED && (marginX === UNDEFINED || marginX > mathAbs(offsetX - allowedPosition.x))) {
							marginX = mathAbs(offsetX - allowedPosition.x); indexX = i;
						}
						
						// check for closest element on the y axis
						if (allowedPosition.y !== UNDEFINED && (marginY === UNDEFINED || marginY > mathAbs(offsetY - allowedPosition.y))) {
							marginY = mathAbs(offsetY - allowedPosition.y); indexY = i;
						}						
					}
					
					//set current element left&top					
					leftPos = cssLeft;
					topPos = cssTop;
					
					if (indexX !== UNDEFINED) {
						leftPos = allowedPositions[indexX].x;
						self.stepPosition.x += allowedPositions[indexX].x - cssLeft;
					}
					if (indexY !== UNDEFINED) {
						topPos = allowedPositions[indexY].y;
						self.stepPosition.y += allowedPositions[indexY].y - cssTop;
					}
				}

                // limit the movement if horizontal or vertical
				if (direction == HORIZONTAL) {
					if (min !== UNDEFINED) {
						leftPos = mathMax(min, leftPos);
						if (leftPos === min) {
							deltaX = 0;
						}
					}
					if (max !== UNDEFINED) {
						leftPos = mathMin(max - helperWidth, leftPos);
						if (leftPos === max - helperWidth) {
							deltaX = 0;
						}
					}
				}
				if (direction == VERTICAL) {
					if (min) {
						topPos = mathMax(min, topPos);
						if (topPos === min) {
							deltaY = 0;
						}
					}
					if (max) {
						topPos = mathMin(max - helperHeight, topPos);
						if (topPos === max - helperHeight) {
							deltaY = 0;
						}
					}
				}

                // update the position
                helper.css({
                    left: leftPos,
                    top: topPos
                });

                // update the old position with the new one, as we have applied the movement
                self.mousePos = newPos;

                if (!self.startSent) {
                    self.startSent = true;
                    self.trigger(START, {element: helper, domEvent: event});

                    // adjust the zIndex if needed - only once per drag
                    self._adjustZIndex();

                    // inform the drag manager about the starting of the drag
                    DDManager.DragStart(self, event);
                }

                self.trigger(DRAG, {deltaX: deltaX, deltaY: deltaY, element: helper, domEvent: event});

                // inform the drag manager about the dragging
                DDManager.Drag(self, event);
            }
        },

        _handleMouseUp: function(event) {
            var self = this,
                element = self.element,
                helper = self.helper,
                animation = self.options.animation,
                evt,
                dropResult,
                cancelled,
                skipAnimation;

            self._unfixIframes();

            $(doc.body).removeClass(SUI_UNSELECTABLE_CLS);

            if (self._dragging) {
                // fire stop event if start was fired
                // (this means element was dragged)
                if (self.startSent) {
                    // send dropped - it will return True if at least one droppable prevented the event
                    dropResult = DDManager.Drop(self, event);
                    cancelled = dropResult.cancelled;
                    skipAnimation = dropResult.skipAnimation;

                    // send stop event
                    evt = self.trigger(STOP, {left: parseCssInt(helper, LEFT), top: parseCssInt(helper, TOP), element: helper, domEvent: event, cancelled: cancelled, skipAnimation: skipAnimation});

                    skipAnimation = evt.skipAnimation;
                    cancelled = evt.cancelled;

                    if (cancelled === true || evt.isDefaultPrevented()) {
                        // if the event is prevented, revert the element to the original position
                        $(helper).animate({
                            left: self.oriPosition.left,
                            top: self.oriPosition.top
                        }, (!skipAnimation && animation && animation.enabled) ? animation.revertDuration : 0, proxy(self._endDrag, self));                        
                    }
                    else {
                        // event is not prevented - if helper is custom, move
                        // the original element where the helper is
                        if (self._isCustomHelper) {
                            Position.Set(element, helper, {
                                source: "left top",
                                target: "left top",
                                overflow: "none"
                            });
                            // adjust the z-index of the element
                            self._adjustZIndex(element);
                        }

                        self._endDrag();
                    }
                }
                else {
                    self._endDrag();
                }
            }
        },

        _adjustZIndex: function(element) {
            var self = this,
                stack = self.options.stack;

            if (stack === false) {
                return;
            }

            if (!isDefined(element)) {
                element = self.helper;
            }

            $(element).css('z-index', (stack === true ? getMaxZIndex("." + SUI_DRAGGABLE_CLS) : getMaxZIndex(stack)) + 1);
        },

        _handleKeyDown: function(event) {
            var self = this,
                code = event.keyCode;

            switch (code) {
                case keyCode.ESC: {
                    if (self._dragging) {
                        // restore the original position
                        self.helper.css({                            
                            left: self.oriPosition.left + PX,
                            top: self.oriPosition.top + PX
                        });

                        self.trigger(CANCEL);

                        self._unfixIframes();

                        self._endDrag();
                    }
                    break;
                }
            }
        },

        _endDrag: function () {
            var self = this,
                dragCls = self.options.dragCls;

            self._dragging = false;

            if (self._isCustomHelper) {
                // remove the helper if different from element
                $(self.helper).remove();
            }
            else {
                // handle is the underlying element, so just remove the dragging classes
                $(self.helper).removeClass(SUI_UNSELECTABLE_CLS + " " + SUI_DRAGGABLE_DRAGGING_CLS + (dragCls ? (" " + dragCls) : ""));
            }

            // remove handlers
            $(doc).off(self._eventNS);

            self.mousePos = self.oriPosition = self.helper = self._isCustomHelper = self._helperInitialized = null;
        },

        // setter/getter for the Draggable enabled state
        enabled: function () {
            var self = this,
				element = $(self.element),
                options = self.options,
                handle = options.handle ? $(options.handle) : element,
				args = [].slice.call(arguments),
				bEnabled;

            if (args.length > 0) {
                // setter
                bEnabled = !!args[0];

                if (bEnabled) {
                    element.removeClass(SUI_DRAGGABLE_DISABLED_CLS);

                    // init a global document mousedown eventhandler
                    if (!self._mouseDownProxy) {
                        self._mouseDownProxy = proxy(self._handleMouseDown, self);
                        handle.on(MOUSEDOWN, self._mouseDownProxy);
                    }
                }
                else {
                    element.addClass(SUI_DRAGGABLE_DISABLED_CLS);

                    // remove mousedown eventhandler
                    if (self._mouseDownProxy) {
                        handle.off(MOUSEDOWN, self._mouseDownProxy);
                        self._mouseDownProxy = null;
                    }
                }

                self._enabled = bEnabled;
            }
            else {
                // getter
                return self._enabled;
            }
        },

        // draggable destructor
        destroy: function () {
            var self = this,
                cls = self.options.cls;

            // destroy the mouse tracker
            if (self.mouseTracker) {
                self.mouseTracker.destroy();
                self.mouseTracker = null;
            }

            // remove added classes
            $(self.element).removeClass(SUI_DRAGGABLE_CLS + (cls ? (" " + cls) : ""));

            if (self._origPosStyle) {
                $(self.element).css(POSITION, self._origPosStyle);
                self._origPosStyle = null;
            }

            Widget.fn.destroy.call(self);
        }
    });
    Draggable.defaults = draggableDefaults;
    shield.ui.plugin("Draggable", Draggable);


    // Droppable widget default settings
    droppableDefaults = {
        enabled: true,
        accepts: "*",           // element, jQuery, String to describe the elements that can be dropped inside (REQUIRED)
        cls: UNDEFINED,         // an optional class to add to the element
        hoverCls: UNDEFINED,    // an optional class to add to the target while an acceptable element is dragged inside it
        tolerance: "intersect", // fit, intersect, pointer, touch - the mode for testing whether a draggable element is over the droppable
        scope: "default",       // for grouping draggable and droppable items
        events: {
            // over
            // out
            // drop
        }
    };
    // public methods
    //      bool enabled() / void enabled(bool)
    // Droppable class
    Droppable = Widget.extend({
        init: function () {
            Widget.fn.init.apply(this, arguments);

            var self = this,
                element = $(self.element),
                options = self.options,
                dieOnError = options.dieOnError,
                accepts = options.accepts,
                cls = options.cls;

            // check the accepts option
            if (!isString(accepts) && !isArray(accepts) && !(accepts instanceof $) && !isFunction(accepts)) {
                error("shieldDroppable: The accepts option must be a string, array, function or jQuery object.", dieOnError);
				return;
            }

            // generate an instance-unique event namespace
            self._eventNS = ".shieldDroppable" + self.getInstanceId();

            element.addClass(SUI_DROPPABLE_CLS + (cls ? (' ' + cls) : ''));

            // add the draggable to the Drag Drop Manager
            DDManager.Register(self);

            // initialize the disabled state
			self.enabled(options.enabled);
        },

        accepts: function(draggableElement) {
            var accepts = this.options.accepts;

            if (isFunction(accepts)) {
                return accepts.call(this, draggableElement);
            }
            else {
                return $(draggableElement).is(accepts);
            }
        },

        proportions: function() {
            var self = this;

            if (arguments.length > 0) {
                self._proportions = arguments[0];
            }
            else {
                return self._proportions ? self._proportions : self._proportions = {
                    width: self.element[0].offsetWidth,
                    height: self.element[0].offsetHeight
                };
            }
        },

        over: function(draggable, event) {
            var self = this,
                hoverCls = self.options.hoverCls,
                evt = self.trigger("over", {draggable: draggable.element, droppable: this.element, domEvent: event});

            if (!evt.isDefaultPrevented()) {
                $(self.element).addClass(SUI_DROPPABLE_HOVER_CLS + (hoverCls ? (' ' + hoverCls) : ''));
            }
        },

        out: function(draggable, event) {
            var self = this,
                hoverCls = self.options.hoverCls;

            self.trigger("out", {draggable: draggable.element, droppable: this.element, domEvent: event});
            $(self.element).removeClass(SUI_DROPPABLE_HOVER_CLS + (hoverCls ? (' ' + hoverCls) : ''));
        },

        stop: function() {
            var hoverCls = this.options.hoverCls;
            $(this.element).removeClass(SUI_DROPPABLE_HOVER_CLS + (hoverCls ? (' ' + hoverCls) : ''));
        },

        drop: function(draggable, event) {
            return this.trigger(DROP, {
                draggable: draggable.element,
                droppable: this.element,
                cancelled: event.cancelled,                
                skipAnimation: event.skipAnimation,
                domEvent: event
            });
        },

        // setter/getter for the Droppable enabled state
        enabled: function () {
            var self = this,
                args = [].slice.call(arguments),
				bEnabled;

            if (args.length > 0) {
                // setter
                bEnabled = !!args[0];

                if (bEnabled) {
                    $(self.element).removeClass(SUI_DROPPABLE_DISABLED_CLS);
                }
                else {
                    $(self.element).addClass(SUI_DROPPABLE_DISABLED_CLS);
                }

                self._enabled = bEnabled;
            }
            else {
                // getter
                return self._enabled;
            }
        },

        destroy: function() {
            var self = this,
                cls = self.options.cls;

            DDManager.UnRegister(self);

            // remove added classes
            $(self.element).removeClass(SUI_DROPPABLE_CLS + SUI_DROPPABLE_DISABLED_CLS + SUI_UNSELECTABLE_CLS + (cls ? (' ' + cls) : ''));

            self._enabled = self._proportions = UNDEFINED;

            Widget.fn.destroy.call(self);
        }
    });
    Droppable.defaults = droppableDefaults;
    shield.ui.plugin("Droppable", Droppable);

})(jQuery, shield, this);