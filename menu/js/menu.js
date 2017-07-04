(function ($, shield, win, UNDEFINED) {
    //"use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
        Position = shield.ui.Position,
        keyCode = shield.Constants.KeyCode,
        strid = shield.strid,

        doc = document,
        proxy = $.proxy,
        each = $.each,
        grep = $.grep,
        extend = $.extend,

        error = shield.error,
        shieldFormat = shield.format,
        isDefined = shield.is.defined,
        isBoolean = shield.is["boolean"],
        isInteger = shield.is.integer,
        isFunc = shield.is.func,

        ID = "id",
        ROLE = "role",
        TRUE = "true",
        FALSE = "false",
        ARIA_EXPANDED = "aria-expanded",
        ARIA_ACTIVEDESCENDANT = "aria-activedescendant",
        HORIZONTAL = "horizontal",
        VERTICAL = "vertical",
        CLICK = "click",
        FOCUS = "focus",
        BLUR = "blur",
        CHANGE = "change",
        KEYDOWN = "keydown",
        TABINDEX = "tabindex",
        DISABLED = "disabled",
        SUI_MENU_ITEM_LEVEL = "sui-menu-item-level",
        SUI_MENU_ITEM_EXPANDED = "sui-menu-item-expanded",
        SUI_MENU_ITEM_DISABLED = "sui-menu-item-disabled",
        SUI_MENU_ITEM_SELECTED = "sui-menu-item-selected",
        SUI_MENU_ITEM_INDEX = "sui-menu-item-index",
        SUI_MENU_ITEM_HOVER_CLS = "sui-menu-item-hover",
        SUI_MENU_ITEM_DATA_ITEM = "sui-menu-item-data-item",
        SUI_MENU_ITEM_PARENT = "sui-menu-item-parent",
        SUI_MENU_ITEM_CHILD_CONTAINER = "sui-menu-item-cc",
        SUI_MENU_ITEM_CHILD_CONTAINER_HOVER = "sui-menu-item-cc-hover",
        SUI_MENU_ITEM_CHILD_PARENT = "sui-menu-item-cc-parent",

        menuDefaults, Menu,
        contextMenuDefaults, ContextMenu, currentContextMenu, currentContextMenuTarget;


    // Menu default settings
    menuDefaults = {
        cls: UNDEFINED,
        width: UNDEFINED,
        height: UNDEFINED,
        dataSource: UNDEFINED,
        readDataSource: true,
        orientation: HORIZONTAL,    // "horizontal" or "vertical"
        delay: 100,
        animation: {
            enabled: true,			// enable menu animation
			openDelay: 100,			// animation delay for showing a menu
			closeDelay: 50			// animation delay for hiding a menu
        },
        contentTemplate: "{content}",
        overflow: "flipfit",    // "flipfit", "fit", "flip" or UNDEFINED
        events: {
            // focus
            // blur
            // expand
            // collapse
            // click
            // select
        }
    };
    // Public methods:
    //      bool visible()  /   void visible(boolVisible)
    //      bool enabled(i, j, ...)   /   void enabled(boolEnable, i, j, ...)
    //      bool expanded(i, j, ...)  /   void expanded(boolExpand, i, j, ...)
    //      bool selected(i, j, ...)  /   void selected(boolSelect, i, j, ...)
    //      list selectedIndex()
    //      object selectedData()
    //      jquery selectedItem()
	// Menu widget class
    Menu = Widget.extend({
		init: function () {
			// call the parent init
            Widget.fn.init.apply(this, arguments);

			var self = this,
				element = $(self.element),
				options = self.options,
                dieOnError = options.dieOnError,
				dataSourceOpts = options.dataSource,
                cls = options.cls,
                renderTo = options.renderToINTERNAL,
                wrapOriginal = options.wrapOriginalINTERNAL,
                original,
                originalTabindex,
                tagname,
                parseUlFunc,
                eventNS,
                doWrap = isDefined(wrapOriginal) ? wrapOriginal : true;

			// save the original element and other initializations
			self._original = original = $(self.element);
			self._tagname = tagname = original.prop("tagName").toLowerCase();

            self._isContext = options.isContextINTERNAL;

            eventNS = self._eventNS = '.shieldMenu' + self.getInstanceId();

            // wrap original element and hide it
            // wrap the original (underlying) element into a span
			if (doWrap) {
				self.wrapper = original.wrap("<div/>").parent();
				self._isWrapped = true;
			}
			else {
				self._isWrapped = false;
			}

            // hide the original element
            original.hide();

            // create a new element to render the listbox in
			self.element = element = $('<ul class="sui-menu sui-menu-top sui-menu-' + options.orientation + (cls ? (' ' + cls) : '') + '"/>')
				.on(FOCUS + eventNS, proxy(self._focus, self))
				.on(BLUR + eventNS, proxy(self._blur, self))
                .on(KEYDOWN + eventNS, proxy(self._keydown, self));

            // add the new element after the original element we just hid
			if ($(renderTo).length > 0) {
				$(renderTo).append(element);
			}
			else {
				original.after(element);
			}

            // apply width and/or height if specified
			if (isDefined(options.width)) {
				element.css("width", options.width);
			}
            if (isDefined(options.minWidth)) {
				element.css("minWidth", options.minWidth);
			}
			if (isDefined(options.height)) {
				element.css("height", options.height);
			}

			// add tabindex for the element so that it can be selected on focus
			originalTabindex = original.attr(TABINDEX);
			element.attr(TABINDEX, isDefined(originalTabindex) ? originalTabindex : "0");

            // see if RTL
            self._isRtl = shield.support.isRtl(element);

            // init the datasource
			if (dataSourceOpts) {
				// init from options
                self.dataSource = DataSource.create(dataSourceOpts);
            }
            else if (tagname === "ul") {
                // define a function to parse a UL and return a list of dicts for its items
                parseUlFunc = function(ul) {
                    var result = [];

                    $(ul).children('li').each(function() {
                        var item = $(this),
                            hasChildrenULs = item.children('ul').length > 0,
                            dict = {
                                cls: item.attr('data-class'),
                                content: hasChildrenULs ? item.children().not('ul').first().html() : item.html(),
                                href: item.attr('data-href') ? item.attr('data-href') : item.children().not('ul').first().attr('href'),
                                disabled: item.attr('data-disabled') ? item.attr('data-disabled') : (isDefined(item.attr(DISABLED)) && item.attr(DISABLED) !== null),
                                separator: item.attr('data-role') === 'separator',
                                iconUrl: item.attr('data-icon-url'),
                                iconCls: item.attr('data-icon-cls')
                            };

                        // if any child UL elements, parse and add the first one's items to the dict
                        if (hasChildrenULs) {
                            dict.items = parseUlFunc(item.children('ul')[0]);
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
            }
            else {
                self.destroy();
				error("shieldMenu: No dataSource or underlying UL element found.", dieOnError);
				return;
            }

            // the handler for data source on change
	        self.dataSource.on(CHANGE + eventNS, proxy(self._dsChange, self));

            // ARIA
            element
                .attr(ROLE, self._isContext ? "menu" : "menubar")
                .attr("aria-orientation", options.orientation);

            // read the data source
            if (options.readDataSource) {
                self.dataSource.read();
            }
        },

        // override this in order for base refresh() to work with the correct element
        refresh: function (options) {
            this.refreshWithElement(this._original, options);
        },

        _isFocused: function() {
            return $(this.element).hasClass('sui-menu-focus');
        },

        _focus: function(event) {
            var self = this;

            if (self._blurTimeout) {
                clearTimeout(self._blurTimeout);
                self._blurTimeout = null;
            }

            if (self._isFocused()) {
                return;
            }

            $(self.element).addClass('sui-menu-focus');

            // make sure that the element has focus
            // WARNING: this might be tricky
            $(self.element).focus();

            self.trigger(FOCUS);
        },

        _blur: function(event) {
            var self = this;

            if (!self._isFocused()) {
                return;
            }

            if (self._blurTimeout) {
                clearTimeout(self._blurTimeout);
            }

            self._blurTimeout = setTimeout(function() {
                $(self.element).removeClass('sui-menu-focus');

                self._collapseAll();
                self._deselectAll();

                self.trigger(BLUR);
            }, 100);
        },

        _dsChange: function() {
            var self = this;

            // initial render of the menu - render to the top element
            self._renderItems(self.dataSource.view, self.element, 0, null);
        },

        _getItemIcon: function(item) {
            var listItemIconEl = $('<span class="sui-menu-item-icon"/>');

            if (item.iconUrl) {
                listItemIconEl.append('<img src="' + item.iconUrl + '"/>');
            }
            else if (item.iconCls) {
                listItemIconEl.addClass(item.iconCls);
            }

            return listItemIconEl;
        },

        _renderItems: function(items, element, level, parent) {
            var self = this,
                options = self.options,
                i,
                itemsLength = (items || []).length,
                oneItemHasIcon = grep(items || [], function(item) { return item.iconUrl || item.iconCls; }).length > 0,
                item,
                itemDisabled,
                label,
                itemHref,
                isSeparator,
                listItem,
                listItemInner,
                listItemIconEl,
                hasIcon,
                hasChildren,
                childContainer,
                childUL;

            for (i=0; i<itemsLength; i++) {
                item = items[i];
                itemDisabled = !!item.disabled;
                itemHref = item.href;
                isSeparator = item.separator;
                hasChildren = !isSeparator && item.items && item.items.length > 0;
                hasIcon = item.iconUrl || item.iconCls;
                label = isSeparator ? '&nbsp;' : shieldFormat.call(self, options.contentTemplate, item);

                listItemInner = $('<a class="sui-menu-item-link" ' + (itemHref ? 'href="' + itemHref + '"' : '') + ' tabindex="-1"/>')
                    .append('<span class="sui-menu-item-text' + (hasChildren ? ' sui-menu-item-text-hc' : '') + '">' + label + '</span>');

                listItem = $('<li class="sui-menu-item sui-unselectable' + (itemDisabled ? ' sui-menu-item-disabled' : '') + (isSeparator ? ' sui-menu-item-separator' : '') + (item.cls ? (' ' + item.cls) : '') + '"/>')
                    .on("selectstart", function() { return false; })
                    .appendTo(element)
                    .data(SUI_MENU_ITEM_DATA_ITEM, item)
                    .data(SUI_MENU_ITEM_PARENT, parent)
                    .data(SUI_MENU_ITEM_LEVEL, level)
                    .data(SUI_MENU_ITEM_DISABLED, itemDisabled)
                    .data(SUI_MENU_ITEM_INDEX, i)
                    // ARIA
                    .attr(ROLE, isSeparator ? "separator" : "menuitem")
                    .attr(ID, strid())
                    .append(listItemInner);

                // ARIA
                if (isSeparator) {
                    listItem.attr("aria-orientation", (level > 0 || options.orientation === VERTICAL) ? HORIZONTAL : VERTICAL);
                }
                else if (itemDisabled) {
                    listItem.attr("aria-disabled", TRUE);
                }

                listItemInner
                    .click(proxy(self._itemClicked, self, listItem))
                    // NOTE: somehow the anchor element will still get focus, so whenever
                    // this happens, pass the focus to the rendering element
                    .on(FOCUS, proxy(self.focus, self));

                // add an icon element if needed
                if (!isSeparator && oneItemHasIcon && (level > 0 || hasIcon || options.orientation === VERTICAL)) {
                    listItemInner.prepend(self._getItemIcon(item));
                }

                if (hasChildren) {
                    // add carets
                    listItemInner.append(
                        '<span class="sui-menu-item-children-caret"/>'
                    );

                    // add children items in a separate element and setup the events;
                    // render the child container in a visible section so we get its width later 
                    // when we are done rendering it (so we re-set it again)
                    childContainer = $('<div class="sui-menu-submenu"/>')
                        .hide()
                        .data(SUI_MENU_ITEM_CHILD_PARENT, listItem)
                        .appendTo(listItem);

                    childContainer
                        // make the z-index of the child container larger
                        .css('z-index', shield.ui.Util.GetMaxZIndex('.sui-menu, .sui-menu-submenu', doc.body) + 1);

                    // all sub-menus are vertical
                    childUL = $('<ul class="sui-menu sui-menu-vertical"/>')
                        // ARIA
                        .attr(ROLE, "menu")
                        .appendTo(childContainer);

                    self._renderItems(item.items, childUL, level + 1, listItem);

                    listItem
                        .data(SUI_MENU_ITEM_CHILD_CONTAINER, childContainer)
                        // ARIA
                        .attr("aria-haspopup", "true")
                        .hover(proxy(self._itemMouseEnter, self, listItem, true), proxy(self._itemMouseLeave, self, listItem, true));
                }
            }
        },

        _itemMouseEnter: function(listItem, fireEvent) {
            var self = this;

            listItem.addClass(SUI_MENU_ITEM_HOVER_CLS);

            setTimeout(function() {
                if (listItem.hasClass(SUI_MENU_ITEM_HOVER_CLS)) {
                    self._itemExpand(listItem, fireEvent);
                }
            }, self.options.delay);
        },

        _itemMouseLeave: function(listItem, fireEvent) {
            var self = this;

            listItem.removeClass(SUI_MENU_ITEM_HOVER_CLS);

            self._itemCollapse(listItem, true, fireEvent);
        },

        _itemExpand: function(listItem, fireEvent, disableAnimation) {
            var self = this,
                options = self.options,
                animation = options.animation,
                level = listItem.data(SUI_MENU_ITEM_LEVEL),
                childContainer = listItem.data(SUI_MENU_ITEM_CHILD_CONTAINER),
                itemIsTopAndHorizontal = level === 0 && options.orientation === HORIZONTAL,
                item = listItem.data(SUI_MENU_ITEM_DATA_ITEM),
                parent = listItem.data(SUI_MENU_ITEM_PARENT),
                evt;

            // do not do anything if not expandable
            if (!self._isExpandable(listItem)) {
                return;
            }

            // do not do anything if item cannot have focus
            if (!self._canHaveFocus(listItem)) {
                return;
            }

            // no child container - return
            if (!childContainer) {
                return;
            }

            childContainer.stop(true, true);

            // expand parent if not expanded
            if (parent && !self._isExpanded(parent)) {
                self._itemExpand(parent, false, true, true);
            }

            // fire the expand event if specified
            if (fireEvent) {
                evt = self.trigger("expand", { element: listItem, item: item });
            }

            // adjust the width if on level 0 and horizontal
            if (itemIsTopAndHorizontal) {
                childContainer.css('min-width', listItem.outerWidth());
            }

            // show the submenu container
            childContainer.show();

            // position the submenu container
            Position.Set(childContainer, listItem, {
                source: "left top",
                target: itemIsTopAndHorizontal ? "left bottom" : "right top",
                overflow: options.overflow
            });

            // do animation if enabled - hide and then show with animation
            if (!disableAnimation && animation && animation.enabled) {
                childContainer
                    .hide()
                    .slideDown(animation.openDelay, function() {
                        listItem
                            .data(SUI_MENU_ITEM_EXPANDED, true)
                            .attr(ARIA_EXPANDED, TRUE);

                    });
            }
            else {
                listItem
                    .data(SUI_MENU_ITEM_EXPANDED, true)
                    .attr(ARIA_EXPANDED, TRUE);
            }
        },

        _itemCollapse: function(listItem, collapseParent, fireEvent, disableAnimation) {
            var self = this,
                animation = self.options.animation,
                childContainer = listItem.data(SUI_MENU_ITEM_CHILD_CONTAINER),
                item = listItem.data(SUI_MENU_ITEM_DATA_ITEM),
                parent = listItem.data(SUI_MENU_ITEM_PARENT),
                evt;

            // do not collapse if not expanded
            /*if (!self._isExpanded(listItem)) {
                return;
            }*/

            // no child container - return
            if (!childContainer) {
                return;
            }

            childContainer.stop(true, true);

            // fire the collapse event if specified
            if (fireEvent) {
                evt = self.trigger("collapse", { element: listItem, item: item });
            }

            collapseParent = isDefined(collapseParent) ? !!collapseParent : true;

            // collapse all expanded subitems of this item
            $(childContainer).find('ul').first().children().each(function() {
                var li = $(this);
                if (self._isExpanded(li)) {
                    self._itemCollapse(li, collapseParent, false, true);
                }
            });

            // hide the child container
            if (!disableAnimation && animation && animation.enabled) {
                childContainer
                    .slideUp(animation.closeDelay, function() {
                        listItem
                            .data(SUI_MENU_ITEM_EXPANDED, false)
                            .attr(ARIA_EXPANDED, FALSE);

                        // collapse parent if required and mouse not over the parent's child container 
                        // (e.g. the container of the current item)
                        if (collapseParent && parent && !parent.hasClass(SUI_MENU_ITEM_HOVER_CLS)) {
                            self._itemCollapse(parent, true, false, true);
                        }
                    });
            }
            else {
                childContainer.hide();
                listItem
                    .data(SUI_MENU_ITEM_EXPANDED, false)
                    .attr(ARIA_EXPANDED, FALSE);

                // collapse parent if required and mouse not over the parent's child container 
                // (e.g. the container of the current item)
                if (collapseParent) {
                    if (collapseParent && parent && !parent.hasClass(SUI_MENU_ITEM_HOVER_CLS)) {
                        self._itemCollapse(parent, true, false, true);
                    }
                }
            }
        },

        // collapse all open menu items
        _collapseAll: function() {
            var self = this;

            // collapse only top-level items
            $(self.element).children('li').each(function() {
                var listItem = $(this);
                if (self._isExpanded(listItem)) {
                    self._itemCollapse(listItem, false, false, true);
                }
            });
        },

        _isExpandable: function(listItem) {
            return !!listItem.data(SUI_MENU_ITEM_CHILD_CONTAINER);
        },

        _isExpanded: function(listItem) {
            return listItem.data(SUI_MENU_ITEM_EXPANDED) === true;
        },

        // checks if the list item has expanded items under it
        _hasExpanded: function(listItem) {
            var self = this,
                childContainer = listItem.data(SUI_MENU_ITEM_CHILD_CONTAINER);

            // if the item is not expanded it cannot have expanded items 
            if (listItem.data(SUI_MENU_ITEM_EXPANDED) !== true) {
                return false;
            }

            // the list item is expanded; 
            // check the first level children container 
            // for having expanded items being expanded
            return grep($(childContainer).find('ul').first().children(), function(item) {
                return self._isExpanded($(item)) || self._hasExpanded($(item));
            }).length > 0;
        },

        _canHaveFocus: function(listItem) {
            return !listItem.data(SUI_MENU_ITEM_DISABLED) && !listItem.data(SUI_MENU_ITEM_DATA_ITEM).separator;
        },

        _keydown: function(event) {
            var self = this,
                prevent = true,
                selected;

            switch (event.keyCode) {
	            case keyCode.UP:
                    self._move("up", event);
	                break;
	            case keyCode.DOWN:
                    self._move("down", event);
	                break;
                case keyCode.LEFT:
                    self._move("left", event);
                    break;
                case keyCode.RIGHT:
                    self._move("right", event);
                    break;
	            case keyCode.SPACE:
	            case keyCode.ENTER:
                    selected = self._getSelected();
                    if (isDefined(selected)) {
                        if (!self._isExpanded(selected)) {
                            //self._collapseAll();
                            self._itemExpand(selected, true);
                        }
                        self._itemClicked(selected);
                    }
	                break;
	            default:
	                prevent = false;
	                break;
	        }

	        if (prevent) {
	            event.preventDefault();
	        }
        },

        _getFirstSelectableItem: function(menu) {
            var self = this,
                listItem;

            $(menu).children('li').each(function() {
                var li = $(this);
                if (self._canHaveFocus(li)) {
                    listItem = li;
                    return false;
                }
            });

            return listItem;
        },

        _getNextSelectableItem: function(listItem) {
            var self = this,
                ul = listItem.parent(),
                itemIndex = listItem.index(),
                items = ul.children('li'),
                itemsLength = items.length,
                curr,
                i;

            // try to find element after the index
            if (itemIndex < itemsLength - 1) {
                for (i=itemIndex+1; i<itemsLength; i++) {
                    curr = $(items[i]);
                    if (self._canHaveFocus(curr)) {
                        return curr;
                    }
                }
            }
            
            // try to find element before the index
            if (itemIndex > 0) {
                for (i=0; i<itemIndex; i++) {
                    curr = $(items[i]);
                    if (self._canHaveFocus(curr)) {
                        return curr;
                    }
                }
            }

            return listItem;
        },

        _getPrevSelectableItem: function(listItem) {
            var self = this,
                ul = listItem.parent(),
                itemIndex = listItem.index(),
                items = ul.children('li'),
                itemsLength = items.length,
                curr,
                i;

            // try to find element before the current
            if (itemIndex > 0) {
                for (i=itemIndex-1; i>=0; i--) {
                    curr = $(items[i]);
                    if (self._canHaveFocus(curr)) {
                        return curr;
                    }
                }
            }

            // try to find after the current
            if (itemIndex < itemsLength - 1) {
                for (i=itemsLength-1; i>itemIndex; i--) {
                    curr = $(items[i]);
                    if (self._canHaveFocus(curr)) {
                        return curr;
                    }
                }
            }

            return listItem;
        },

        _move: function(direction, event) {
            var self = this,
                current = self._getSelected(),
                currentLayout,
                parent,
                parentLayout,
                select,
                isRtl = self._isRtl;

            if (!isDefined(current)) {
                // nothing selected - select the first selectable item in the top menu
                select = self._getFirstSelectableItem(self.element);
            }
            else {
                // an element was selected
                currentLayout = current.parent().hasClass('sui-menu-vertical') ? VERTICAL : HORIZONTAL;

                parent = current.data(SUI_MENU_ITEM_PARENT);
                parentLayout = parent ? (parent.parent().hasClass('sui-menu-vertical') ? VERTICAL : HORIZONTAL) : UNDEFINED;

                if (currentLayout === HORIZONTAL) {
                    // horizontal - top
                    if (direction === "up") {
                        // collapse the current
                        self._itemCollapse(current, false, true);
                        return;
                    }
                    else if (direction === "down") {
                        if (self._isExpandable(current)) {
                            self._itemExpand(current, true);
                            select = self._getFirstSelectableItem(current.find('.sui-menu-submenu > .sui-menu').first());
                        }
                        else {
                            return;
                        }
                    }
                    else if (direction === "left") {
                        select = self._getPrevSelectableItem(current);
                        if (select === current) {
                            // nothing to select - return
                            return;
                        }
                    }
                    else if (direction === "right") {
                        select = self._getNextSelectableItem(current);
                        if (select === current) {
                            // nothing to select - return
                            return;
                        }
                    }
                    else {
                        return;
                    }
                }
                else {
                    // vertical
                    if (direction === "up") {
                        if (current.index() === 0) {
                            // if first and parent is vertical, select the parent and collapse it
                            if (parent && parentLayout === HORIZONTAL) {
                                select = parent;
                                self._itemCollapse(select, false, true);
                            }
                            else {
                                select = self._getPrevSelectableItem(current);
                                if (select === current) {
                                    // nothing to select - return
                                    return;
                                }
                            }
                        }
                        else {
                            select = self._getPrevSelectableItem(current);
                            if (select === current) {
                                // nothing to select - return
                                return;
                            }
                        }
                    }
                    else if (direction === "down") {
                        select = self._getNextSelectableItem(current);
                        if (select === current) {
                            // nothing to select - return
                            return;
                        }
                    }
                    else if (direction === "left") {
                        if (parent && parentLayout === VERTICAL) {
                            // if parent is vertical, select the parent and collapse it
                            select = parent;
                            self._itemCollapse(select, false, true);
                        }
                        else {
                            return;
                        }
                    }
                    else if (direction === "right") {
                        if (self._isExpandable(current)) {
                            self._itemExpand(current, true);
                            select = self._getFirstSelectableItem(current.find('.sui-menu-submenu > .sui-menu').first());
                        }
                        else {
                            return;
                        }
                    }
                    else {
                        return;
                    }
                }
            }

            // nothing to select - do nothing
            if (!isDefined(select)) {
                return;
            }

            // update the selected item
            self._setSelected(select, true);

            // trigger the select event
            self.trigger("select", { element: select, item: select.data(SUI_MENU_ITEM_DATA_ITEM) });
        },

        _deselectAll: function() {
            var self = this,
                element = self.element;

            $(element).find('.' + SUI_MENU_ITEM_SELECTED).each(function() {
                $(this).removeClass(SUI_MENU_ITEM_SELECTED);
            });

            // ARIA
            element.removeAttr(ARIA_ACTIVEDESCENDANT);
        },

        _setSelected: function(listItem, boolSelected) {
            var self = this,
                element = self.element;

            // do not do anything if item cannot have focus
            if (!self._canHaveFocus(listItem)) {
                return;
            }

            if (boolSelected) {
                // selecting - deselect all other items
                self._deselectAll();
                $(listItem).addClass(SUI_MENU_ITEM_SELECTED);

                // ARIA
                element.attr(ARIA_ACTIVEDESCENDANT, listItem.attr(ID));
            }
            else {
                // deselecting
                $(listItem).removeClass(SUI_MENU_ITEM_SELECTED);

                // ARIA
                element.removeAttr(ARIA_ACTIVEDESCENDANT);
            }
        },

        // returns the first (must be only one) selected menu item
        _getSelected: function() {
            var self = this,
                selected = $(self.element).find('.' + SUI_MENU_ITEM_SELECTED).first();

            return $(selected).length > 0 ? selected : UNDEFINED;
        },

        _isSelected: function(listItem) {
            return $(listItem).hasClass(SUI_MENU_ITEM_SELECTED);
        },

        _itemClicked: function(listItem, event) {
            var self = this,
                item = listItem.data(SUI_MENU_ITEM_DATA_ITEM),
                evt,
                params;

            // if event propagation is stopped, do nothing
            if (event && event.isPropagationStopped()) {
                return;
            }

            // focus the control if not focused
            self._focus();

            // do not do anything if item cannot have focus
            if (!self._canHaveFocus(listItem)) {
                return;
            }

            // if context menu, set the current element in the event params
            params = {item: item};
            if (self._isContext) {
                params.element = currentContextMenuTarget;
            }

            // trigger the event
            evt = self.trigger(CLICK, params);

            if (event) {
                // stop propagation of the click event to the parent listItem
                event.stopPropagation();

                // propagate cancelling to the original event
                if (evt.isDefaultPrevented()) {
                    event.preventDefault();
                }
            }
        },

        // find a listItem by indices list
        _getItemByIndex: function() {
            var self = this,
                args = [].slice.call(arguments),
                listItem = UNDEFINED,
                currIndex,
                i;

            if (args.length > 0) {
                for (i=0; i<args.length; i++) {
                    currIndex = args[i];

                    if (!isInteger(currIndex)) {
                        return UNDEFINED;
                    }

                    // find the element 
                    if (i === 0) {
                        // top-level
                        listItem = $(self.element).children('li:eq(' + currIndex + ')');
                    }
                    else {
                        listItem = $($(listItem).data(SUI_MENU_ITEM_CHILD_CONTAINER)).children('ul').first().children('li:eq(' + currIndex + ')');
                    }

                    if ($(listItem).length <= 0) {
                        return UNDEFINED;
                    }
                }
            }

            return listItem;
        },

        // returns indices list for a given listItem
        _getItemIndex: function(listItem) {
            var self = this,
                result = [];

            do {
                result.unshift(listItem.data(SUI_MENU_ITEM_INDEX));
                listItem = listItem.data(SUI_MENU_ITEM_PARENT);
            } while (listItem);

            return result;
        },

        // set/get the enabled state for a given list item,
        // identified by a list of indices determining its location in the level
        enabled: function() {
            var self = this,
                args = [].slice.call(arguments),
                enabledState = isBoolean(args[0]) ? args.shift() : UNDEFINED,
                listItem;

            // find the item by index list
            listItem = self._getItemByIndex.apply(this, args);

            if (isDefined(listItem)) {
                if (isDefined(enabledState)) {
                    // setter
                    listItem.data(SUI_MENU_ITEM_DISABLED, !enabledState);
                    $(listItem)[enabledState ? "removeClass" : "addClass"]('sui-menu-item-disabled');
                }
                else {
                    // getter
                    return !listItem.data(SUI_MENU_ITEM_DISABLED);
                }
            }
        },

        // set/get the expanded state for a given list item,
        // identified by a list of indices determining its location in the level;
        // on expanding, collapses all other open menu items
        expanded: function() {
            var self = this,
                args = [].slice.call(arguments),
                expandedState = isBoolean(args[0]) ? args.shift() : UNDEFINED,
                listItem;

            // find the item by index list
            listItem = self._getItemByIndex.apply(this, args);

            if (isDefined(listItem)) {
                if (isDefined(expandedState)) {
                    // setter
                    if (expandedState) {
                        // collapse all and expand the given item
                        self._collapseAll();
                        self._itemExpand(listItem, false);
                    }
                    else {
                        self._itemCollapse(listItem, false, false);
                    }
                }
                else {
                    // getter
                    return self._isExpanded(listItem);
                }
            }

            // collapse all
            if (isDefined(expandedState) && expandedState === false && args.length === 0) {
                self._collapseAll();
            }
        },

        // set/get the selected state for a given list item,
        // identified by a list of indices determining its location in the level;
        // deselects all other items on select
        selected: function() {
            var self = this,
                args = [].slice.call(arguments),
                selectedState = isBoolean(args[0]) ? args.shift() : UNDEFINED,
                listItem;

            // find the item by index list
            listItem = self._getItemByIndex.apply(this, args);

            if (isDefined(listItem)) {
                if (isDefined(selectedState)) {
                    // setter
                    self._setSelected(listItem, selectedState);
                }
                else {
                    // getter
                    return self._isSelected(listItem);
                }
            }

            // unselect all
            if (isDefined(selectedState) && selectedState === false && args.length === 0) {
                self._deselectAll();
            }
        },

        selectedIndex: function() {
            var self = this,
                selItem = self._getSelected();

            if (isDefined(selItem)) {
                return self._getItemIndex(selItem);
            }
        },

        selectedData: function() {
            var self = this,
                selItem = self._getSelected();

            if (isDefined(selItem)) {
                return $(selItem).data(SUI_MENU_ITEM_DATA_ITEM);
            }
        },

        selectedItem: function() {
            return this._getSelected();
        },

        // Menu destructor
        destroy: function() {
            var self = this,
                eventNS = self._eventNS;

            if (self.dataSource) {
				self.dataSource.off(CHANGE + eventNS);
			}

            if (self._blurTimeout) {
                clearTimeout(self._blurTimeout);
                self._blurTimeout = null;
            }

            $(self.element)
                .off(eventNS)
                .remove();

            if (self._isWrapped) {
				self._original.unwrap();
			}
			self._original.show();

            self._original = null;

            Widget.fn.destroy.call(self);
        }
    });
    Menu.defaults = menuDefaults;
    shield.ui.plugin("Menu", Menu);


    // ContextMenu defaults
    contextMenuDefaults = extend({}, menuDefaults, {
        // supports all settings from Menu widget, plus the ones below
        orientation: VERTICAL,  // override the default Menu one, which is horizontal
        target: UNDEFINED,
        filter: UNDEFINED,
        focusOnOpen: true,
        minWidth: UNDEFINED
        // events: { open and close }
    });
    // Public methods:
    //      bool visible()		/   void visible(boolVisible, position, target)
    //      bool enabled(i, j, ...)		/   void enabled(boolEnable, i, j, ...)
    //      bool expanded(i, j, ...)	/   void expanded(boolExpand, i, j, ...)
    //      bool selected(i, j, ...)	/   void selected(boolSelect, i, j, ...)
    //      list selectedIndex()
    //      object selectedData()
    //      jquery selectedItem()
    ContextMenu = Widget.extend({
        init: function() {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				element = $(self.element),
				options = self.options,
                eventsOptions = options.events,
                events = {},
                eventNS,
                menuElement;

            // init the event namespace
            eventNS = self._eventNS = '.shieldContextMenu' + self.getInstanceId();

            // init the menu element and the menu
            self.menuElement = menuElement = $('<div class="sui-context-menu"/>')
                .hide()
				.appendTo(doc.body);

            if (options.minWidth) {
                self.menuElement.css("min-width", options.minWidth);
            }

            // convert the Menu events to proxies that will be called with the ContextMenu context
            each(['focus', 'blur', 'expand', 'collapse', 'click', 'select'], function(i, event) {
                var eventFunc = eventsOptions[event];
                if (isFunc(eventFunc)) {
                    events[event] = proxy(eventFunc, self);
                }
            });

            self._menu = new Menu(element, extend({}, options, {
                renderToINTERNAL: menuElement,
                wrapOriginalINTERNAL: false,
                isContextINTERNAL: true,
                events: events
            }));

            // init the mouse tracker
            self._mouseTracker = new shield.MouseTracker();

            // bind the document events
            $(options.target).on("contextmenu" + eventNS, options.filter, function(event) {
                // supress original context menu
                event.preventDefault();

                // open the context menu and pass the event's currentTarget (the element for which the event is supposed to get fired),
                // instead of e.target, which is the actual element on which the event was fired
                self._open(self._mouseTracker.getPosition(event), $(event.currentTarget), true, false);

                return false;
            });

            $(doc).on("mousedown" + eventNS, function(event) {
                if ($(event.target).closest(".sui-context-menu").length <= 0) {
                    // close the currently open menu
                    self._closeOpen(true);
                }
            });
        },

        _open: function(position, target, fireEvent, disableAnimation) {
            var self = this,
                menuElement = self.menuElement,
                options = self.options,
                animation = options.animation,
                focusOnOpen = options.focusOnOpen,
                evt;

            self._closeOpen(false);

            if (fireEvent) {
                evt = self.trigger("open", {element: target});

                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            menuElement.stop(true, true);

            // show the submenu container
            menuElement.show();

            // position the menu container relative to the given position
            Position.Set(menuElement, new shield.Event({pageX: position.x, pageY: position.y}), {
                source: "left top",
                target: "left top",
                overflow: options.overflow
            });

            if (animation && animation.enabled) {
                menuElement
                    .hide()
                    .slideDown(animation.openDelay, function() {
                        currentContextMenu = self;
                        currentContextMenuTarget = target;
                        self._visible = true;
                        if (focusOnOpen) {
                            self.focus();
                        }
                    });
            }
            else {
                currentContextMenu = self;
                currentContextMenuTarget = target;
                self._visible = true;
                if (focusOnOpen) {
                    self.focus();
                }
            }
        },

        _close: function(fireEvent) {
            var self = this,
                menuElement = self.menuElement,
                animation = self.options.animation,
                evt;

            if (fireEvent) {
                evt = self.trigger("close");

                if (evt.isDefaultPrevented()) {
                    return;
                }
            }

            // mark this as closed as soon as possible because this might
            // get executed multiple times
            currentContextMenu = currentContextMenuTarget = null;

            menuElement.stop(true, true);

            if (animation && animation.enabled) {
                menuElement.slideUp(animation.closeDelay, function() {
                    self._visible = false;
                });
            }
            else {
                menuElement.hide();
                self._visible = false;
            }
        },

        // closes any globally opened context menu
        _closeOpen: function(fireEvent) {
            if (currentContextMenu) {
                currentContextMenu.closeINTERNAL(true);
            }
        },

        closeINTERNAL: function(fireEvent) {
            this._close(fireEvent);
        },

        focus: function() {
            $(this.menuElement).find('.sui-menu').first().focus();
        },

        // setter/getter for the visible state of the menu
        visible: function () {
            var self = this,
                args = [].slice.call(arguments),
                bVislble,
                pos;

            if (args.length > 0) {
                // setter
                bVislble = !!args[0];
                pos = args[1] ? args[1] : self._mouseTracker.getPosition();

                if (bVislble) {
                    // show the contextmenu
                    self._open(pos, args[2], false, false);
                }
                else {
                    // hide the contextmenu
                    self._close(false);
                }

                self._visible = bVislble;
            }
            else {
                // getter
				return self._visible;
            }
        },

		// proxy to the menu
		enabled: function() {
			return this._menu.enabled.apply(this._menu, arguments);
		},

		expanded: function() {
			return this._menu.expanded.apply(this._menu, arguments);
		},

		selected: function() {
			return this._menu.selected.apply(this._menu, arguments);
		},

        selectedIndex: function() {
			return this._menu.selectedIndex.apply(this._menu, arguments);
		},

        selectedData: function() {
			return this._menu.selectedData.apply(this._menu, arguments);
		},

        selectedItem: function() {
			return this._menu.selectedItem.apply(this._menu, arguments);
		},

        // contextmenu destructor
        destroy: function() {
            var self = this,
                eventNS = self._eventNS;

            $(doc).off(eventNS);
            $(self.options.target).off(eventNS);

            if (self._mouseTracker) {
                self._mouseTracker.destroy();
                self._mouseTracker = null;
            }

            self._close();

            if (self._menu) {
				self._menu.destroy();
				self._menu = null;
			}
			$(self.menuElement).remove();

            Widget.fn.destroy.call(self);
        }
    });
    ContextMenu.defaults = contextMenuDefaults;
    shield.ui.plugin("ContextMenu", ContextMenu);

})(jQuery, shield, this);