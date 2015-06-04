(function ($, shield, win, UNDEFINED) {
    "use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
        shieldFormat = shield.format,
        support = shield.support,
        get = shield.get,

        is = shield.is,
        isFunc = is.func,
        isString = is.string,
        isObject = is.object,
        isBoolean = is["boolean"],
        isDefined = is.defined,
        isNumber = is.number,
        isUndefined = is["undefined"],

		doc = document,
        abs = Math.abs,
        mathMin = Math.min,
        mathMax = Math.max,

        each = $.each,
        proxy = $.proxy,
        extend = $.extend,
		map = $.map,
        inArray = $.inArray,

		userAgent = navigator.userAgent,
		isOpera = win.opera,
		isIE = /msie/i.test(userAgent) && !isOpera,
        isIE7 = isIE && doc.documentMode === 7,
        isIE8 = isIE && doc.documentMode === 8,
        isIE10 = isIE && doc.documentMode === 10,
		docMode8 = doc.documentMode === 8,
		isWebKit = /AppleWebKit/.test(userAgent),
		isFirefox = /Firefox/.test(userAgent),

        HEIGHT = "height",
        WIDTH = "width",
        SELECTABLE = "sui-selectable",
        SELECTED = "sui-selected",

        CHANGE = "change",
        START = "start",
        SCROLL = "scroll",
        COMMAND = "command",
        SELECTIONCHANGED = "selectionChanged",
        DATABOUND = "dataBound",
        MOUSEDOWN = "mousedown",
        MOUSEMOVE = "mousemove",
        MOUSEUP = "mouseup",
        RESIZE = "resize",
        CLICK = "click",
        DOUBLECLICK = "dblclick",
        SORT = "sort",
        DETAILCREATED = "detailCreated",
        COLUMNREORDER = "columnReorder",
        GROUPSREORDER = "groupsReorder",
        GROUP = "group",
        UNGROUP = "ungroup",
        EDITORCREATING = "editorCreating",
        FILTERWIDGETCREATING = "filterWidgetCreating",
        GETCUSTOMFILTERVALUE = "getCustomFilterValue",
        CLEARFILTER = "clearFilter",
        EXPANDBUTTONCREATE = "expandButtonCreate",
        CANCEL = "cancel",
        EDIT = "edit",
        INSERT = "insert",
        SAVE = "save",
        DELETE = "delete",
        ERROR = "error",
        COLLAPSE = "collapse",
        EXPAND = "expand",

        defaults;


    function normalizeAttributes(attributes) {
        var attr,
            result = " ";

        if (attributes) {
            if (isString(attributes)) {
                return attributes;
            }

            for (attr in attributes) {
                if (attributes.hasOwnProperty(attr)) {
                    result += attr + '="' + attributes[attr] + '"';
                }
            }
        }

        return result;
    }

    function getElementsFromEvent(e, element) {
        var cell = $(e.target).closest(".sui-cell", element);

        if (!cell.length) {
            return null;
        }

        var row = cell[0].parentNode,
            currentCell = cell[0];

        if (row == null || currentCell == null) {
            return null;
        }
        else {
            return {
                "row": row,
                "cell": currentCell
            };
        }
    }


    // the default configuration options for the grid
    defaults = {
        columns: [],
        rowHover: true,
        scrolling: false,
        paging: false,
        columnReorder: false,
        showHeader: true,
        grouping: {
            showGroupHeader: false,
            allowDragToGroup: false,
            message: "Drag a column header here to group by a column"
        }
    };


    // Toolbar class
    // class which describes the toolbar of the grid
    var Toolbar = Class.extend({
        init: function (options, grid) {
            var self = this,
                toolbar,
                position,
                currentToolbarWrapper,
                toolbars,
                i;

            self._grid = grid;

            for (i = 0; i < options.length; i++) {
                toolbar = options[i];
                position = toolbar.position ? toolbar.position : "top";
                currentToolbarWrapper = $("<div class='sui-toolbar'></div>");

                if (position === "top") {
                    toolbars = grid.element.find(".sui-toolbar");
                    if (toolbars.length > 0) {
                        $(toolbars[0]).after(currentToolbarWrapper);
                    }
                    else {
                        grid.element.prepend(currentToolbarWrapper);
                    }
                }
                else {
                    currentToolbarWrapper.addClass("sui-toolbar-bottom");
                    currentToolbarWrapper.appendTo(grid.element);
                }

                if (toolbar.template) {
                    self._initializeTemplate(toolbar, currentToolbarWrapper);
                }
                else {
                    if (toolbar.buttons.length > 0) {
                        self._buildButtons(currentToolbarWrapper, toolbar);
                    }
                }
            }
        },

        // build all buttons and add them into the toolbar
        _buildButtons: function (currentToolbarWrapper, toolbar) {
            var self = this,
                buttons = toolbar.buttons,
                i;

            for (i = 0; i < buttons.length; i++) {
                self._buildButton(buttons[i], currentToolbarWrapper);
            }
        },

        // build single shildui button and appned it to the toolbar
        _buildButton: function (buttonOptions, toolbar) {
            var self = this,
                commandName = buttonOptions.commandName,
                commandHandler = buttonOptions.click,
                wrapperButton,
                btn;

            if (shield.ui.Button) {
                wrapperButton = $("<button type='button'>" + buttonOptions.caption + "</button>")
                    .appendTo(toolbar);

                // override the command handler if a commandName is set
                if (commandName === "insert") {
                    commandHandler = self._insertButtonClicked;
                }
                else if (commandName === "save") {
                    commandHandler = self._saveButtonClicked;
                }
                else if (commandName === "cancel") {
                    commandHandler = self._cancelButtonClicked;
                }

                // build the button with the given options
                btn = new shield.ui.Button(wrapperButton, {
                    cls: buttonOptions.cls,
                    events: {
                        click: proxy(commandHandler, self._grid)
                    }
                });
            }
        },

        // handle the click event of insert button
        _insertButtonClicked: function (e) {
            var self = this,
                options = self.options,
                newRowPosition = options.editing.insertNewRowAt,
                dataSource = self.dataSource,
                model,
                row,
                index,
                //pager = self.pager,
                //editIndex = pager ? pager.pageSize() * (pager.currentPage - 1) : 0,
                args,
                key;

            self._editingInProcess = true;

            args = self.trigger(COMMAND, { commandName: INSERT, cancel: false });

            if (args.cancel) {
                return;
            }

            if (newRowPosition === "pagebottom") {
                // insert at the bottom of the page
                index = mathMax(0, self.contentTable.find("tbody > tr").length - 1);
            }
            else {
                // insert at the top of the page
                index = 0;
            }

            // insert an empty item
            model = dataSource.insertView(index, {});

            // make all fields in the model null
            for (key in model.fields) {
                if (model.fields.hasOwnProperty(key)) {
                    model.data[key] = null;
                }
            }

            self._editing._insertedItems.push(model);

            row = self.contentTable.find("tbody > tr").eq(index);

            self._editing._putRowInEditMode(row, 0);
            self.trigger(INSERT);
        },

        // handle the click event of save button
        _saveButtonClicked: function (e) {
            var self = this,
                rowIndex,
                editableCells = self.contentTable.find(".sui-editable-cell"),
                args;

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                self._updateItem(rowIndex, null);
                if (self._errorDuringEdit) {
                    self._errorDuringEdit = false;
                    return;
                }
            }

            args = self.trigger(COMMAND, { commandName: SAVE, cancel: false });

            if (!args.cancel) {
                // save the datasource, this will trigger a datasource change event
                self.dataSource.save();
                self.trigger(SAVE);
            }
        },

        // handle the click event of cancel button
        _cancelButtonClicked: function (e) {
            var self = this,
                args = self.trigger(COMMAND, { commandName: CANCEL, cancel: false });

            if (!args.cancel) {
                self.dataSource.cancel();
                self.trigger(CANCEL);
            }
        },

        // initialize template and instantiate it into the toolbar
        _initializeTemplate: function (toolbar, container) {
            var self = this,
                template = toolbar.template,
                isNull = is["null"];

            // if template is defined (string or function) - use it for the cell value, 
            // otherwise use the format string or function.
            if (isFunc(template)) {
                // template is a function - execute it passing the container;
                // if the result is not null, undefined or an empty string, add it as a value
                var value = template.call(self._grid, container);
                if (isDefined(value) && !isNull(value) && value !== "") {
                    container.html(value);
                }
            }
            else {
                // template is a string
                container.html(template);
            }
        },

        destroy: function () {
            this._grid = null;
        }
    });


    // Editing class
    // class which describes the editing into the grid
    var Editing = Class.extend({
        init: function (options, grid) {
            var self = this;

            self._grid = grid;
            self.options = options;

            self._editors = {};
            self._insertedItems = [];
            if (options.enabled) {
                self._initEditing();
            }

            self._grid.dataSource.on(ERROR, self._dsErrorHandler = proxy(self._dsError, self));
        },

        _dsError: function (e) {
            var self = this,
                editor = self._editors[e.path];

            self._grid.trigger(ERROR, { type: e.type, path: e.path, value: e.value, editor: editor, reason: e.reason });
            self._errorDuringEdit = true;
        },

        // initialize editing. Attach events to the cell. 
        _initEditing: function () {
            var self = this,
                options = self.options,
                optionsEvent = options.event;

            if (isUndefined(optionsEvent)) {
                return;
            }
            if (optionsEvent === "click") {
                self._grid.element.on(CLICK, ".sui-cell", self._editingTriggeredHandler = proxy(self._editingTriggered, self));
            }
            else if (optionsEvent === "doubleclick") {
                self._grid.element.on(DOUBLECLICK, ".sui-cell", self._editingTriggeredHandler = proxy(self._editingTriggered, self));
            }

            $(doc).on(CLICK, self._documentClickedHandler = proxy(self._documentClicked, self));
        },

        // update previous item which was in edit mode and put current item in edit mode
        _editingTriggered: function (e) {
            var self = this,
                cell = e.target,
                row = $(e.target).parent(),
                rowIndex = row.get(0).rowIndex,
                options = self.options,
                mode = options.mode,
                type = options.type,
                ds = self._grid.dataSource,
                isBatch = options.batch,
                editableCells,
                currentRowIndex,
                args = self._grid.trigger(COMMAND, { commandName: EDIT, cancel: false, row: row, cell: cell });

            if (args.cancel) {
                return;
            }

            if (isBatch) {
                editableCells = self._grid.contentTable.find(".sui-editable-cell");
                if (editableCells.length > 0) {
                    rowIndex = editableCells.get(0).parentNode.rowIndex;

                    if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                        var allUpdatedCellsKyes = self._grid._updateItem(rowIndex, cell);
                        if (self._errorDuringEdit) {
                            self._errorDuringEdit = false;
                            allUpdatedCellsKyes = null;
                            return;
                        }
                        currentRowIndex = row.get(0).rowIndex;

                        self._grid._putRowInViewMode(rowIndex, null);

                        // batch update with updated cells
                        if (!self._grid._populateInsertedItem && allUpdatedCellsKyes && allUpdatedCellsKyes.length > 0) {
                            self._grid._renderUpdateMarkers(allUpdatedCellsKyes, rowIndex);
                        }

                        self._grid._populateInsertedItem = false;

                        if (currentRowIndex === rowIndex) {
                            cell = self._grid.contentTable.find("tbody > tr").eq(rowIndex).get(0).cells[cell.cellIndex];
                        }

                        rowIndex = currentRowIndex;
                    }
                    else {
                        return;
                    }
                }

                if (isUndefined(type) || type === 'cell') {
                    self._putCellInEditMode(cell, rowIndex);
                }
                else if (type === 'row') {
                    self._putRowInEditMode(row, cell.cellIndex);
                }
                else {
                    // error when options.type is not "row" or "cell"
                    shield.error("Invalid editing.type declaration. The editing.type must be 'row' or 'cell'.", this.options.dieOnError);
                }
            }
            else {
                if (ds.tracker && ds.tracker.changes && ds.tracker.changes.added && ds.tracker.changes.added.length > 0) {
                    if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                        ds.cancel();
                    }
                }
                else {
                    if (isUndefined(mode) || mode === 'inline') {
                        editableCells = self._grid.contentTable.find(".sui-editable-cell");
                        if (editableCells.length > 0) {
                            rowIndex = editableCells.get(0).parentNode.rowIndex;

                            if (row.get(0).nodeName.toUpperCase() === "TR" && (row.get(0).rowIndex != rowIndex || type != 'row')) {
                                self._grid._updateItem(rowIndex, cell);
                                if (self._errorDuringEdit) {
                                    self._errorDuringEdit = false;
                                    return;
                                }
                                currentRowIndex = row.get(0).rowIndex;
                                self._grid._closeAllEditedRows();

                                if (currentRowIndex === rowIndex) {
                                    cell = self._grid.contentTable.find("tbody > tr").eq(rowIndex).get(0).cells[cell.cellIndex];
                                }

                                rowIndex = currentRowIndex;
                            }
                            else {
                                return;
                            }
                        }

                        if (isUndefined(type) || type === 'cell') {
                            self._putCellInEditMode(cell, rowIndex);
                        }
                        else if (type === 'row') {
                            self._putRowInEditMode(row, cell.cellIndex);
                        }
                        else {
                            // error when options.type is not "row" or "cell"
                            shield.error("Invalid editing.type declaration. The editing.type must be 'row' or 'cell'.", this.options.dieOnError);
                        }
                    }
                }
            }

            self._grid.trigger(EDIT, { row: row, cell: cell });
        },

        _documentClicked: function (e) {
            var self = this,
                isBatch = self.options.batch,
                target = $(e.target),
                editableCells,
                rowIndex;

            if (self._grid._editingInProcess ||
                self._grid._preventClosingEditors) {
                self._grid._editingInProcess = false;
                return;
            }

            if (!target.hasClass("sui-cell") &&
                !target.parents().hasClass("sui-cell") &&
                !target.parents().hasClass("sui-calendar") &&
                !target.parents().hasClass("sui-listbox")) {

                editableCells = this._grid.contentTable.find(".sui-editable-cell");
                if (editableCells.length > 0) {
                    rowIndex = editableCells.get(0).parentNode.rowIndex;
                    var allUpdatedCellsKyes = self._grid._updateItem(rowIndex, null);
                    if (self._errorDuringEdit) {
                        self._errorDuringEdit = false;
                        return;
                    }

                    self._grid._putRowInViewMode(rowIndex, null);

                    // batch update with updated cells
                    if (isBatch && !self._grid._populateInsertedItem && allUpdatedCellsKyes && allUpdatedCellsKyes.length > 0) {
                        self._grid._renderUpdateMarkers(allUpdatedCellsKyes, rowIndex);
                    }

                    self._grid._populateInsertedItem = false;
                }
            }
        },

        _getColumnIndex: function(cell) {
            // get column index from cell index
            return cell.cellIndex - $(cell.parentNode).find(".sui-indent-cell, .sui-expand-cell, .sui-expand-cell-disabled, .sui-collapse-cell").length;
        },

        _putCellInEditMode: function (cell, rowIndex) {
            var self = this,
                columnIndex = self._getColumnIndex(cell),
                grid = self._grid,
                ds = grid.dataSource,
                dataItem, 
                column = grid.columns[columnIndex],
                rows,
                i;
 
            if (!column || !column.field) {
                return;
            }

            if (ds.group && ds.group.length > 0) {
                rows = self._grid.contentTable.find(".sui-row, .sui-alt-row");
                for (i = 0; i < rows.length; i++) {
                    if (rows[i] == cell.parentNode) {
                        rowIndex = i;
                        break;
                    }
                }
            }

            dataItem = ds.editView(rowIndex).data;

            var columnType = ds.schema.options.fields[column.field].type,
                value = get(dataItem, column.field),
                shouldFocusControl = false;

            if (arguments.length > 2) {
                if (arguments[2] == columnIndex) {
                    shouldFocusControl = true;
                }
            }
            else {
                shouldFocusControl = true;
            }

            if (column.editor) {
                self._instantiateCustomEditor(column, cell, dataItem, rowIndex, shouldFocusControl);
            }
            else {
                switch (columnType) {
                    case Number:
                        self._instantiateNumeric(cell, value, shouldFocusControl);
                        break;
                    case Date:
                        self._instantiateDatePicker(cell, value, shouldFocusControl);
                        break;
                    case String:
                        self._instantiateTextBox(cell, value, shouldFocusControl);
                        break;
                    case Boolean:
                        self._instantiateCheckBox(cell, value, shouldFocusControl);
                        break;
                    default:
                }
            }
        },

        _prepareCell: function (cell) {
            $(cell)
                .empty()
                .addClass("sui-editable-cell");
        },

        _instantiateCustomEditor: function (column, cell, dataItem, index, shouldFocusControl) {
            var self = this,
                cellIndex = self._getColumnIndex(cell),
                field = self._grid.columns[cellIndex].field,
                value;

            self._prepareCell(cell);

            value = column.editor.call(self._grid, cell, dataItem, index, shouldFocusControl);

            $(cell).html(value);
            self._editors[field] = "custom";
        },

        _instantiateNumeric: function (cell, value, shouldFocusControl) {
            var self = this,
                input,
                wrapperInput = $("<input />"),
                cellIndex = self._getColumnIndex(cell),
                field = self._grid.columns[cellIndex].field;

            self._prepareCell(cell);

            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.NumericTextBox) {
                input = new shield.ui.NumericTextBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateDatePicker: function (cell, value, shouldFocusControl) {
            var self = this,
               input,
               wrapperInput = $("<input />"),
               cellIndex = self._getColumnIndex(cell),
               field = self._grid.columns[cellIndex].field;

            self._prepareCell(cell);

            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.DatePicker) {
                input = new shield.ui.DatePicker(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateTextBox: function (cell, value, shouldFocusControl) {
            var self = this,
                input,
                wrapperInput = $("<input type='text' />"),
                cellIndex = self._getColumnIndex(cell),
                field = self._grid.columns[cellIndex].field;

            self._prepareCell(cell);

            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.TextBox) {
                input = new shield.ui.TextBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                self._editors[field] = input;
            }
        },

        _instantiateCheckBox: function (cell, value, shouldFocusControl) {
            var self = this,
                input,
                wrapperInput = $("<input type='checkbox' />"),
                cellIndex = self._getColumnIndex(cell),
                field = self._grid.columns[cellIndex].field;

            self._prepareCell(cell);

            wrapperInput.appendTo(cell);

            var args = self._grid.trigger(EDITORCREATING, { field: field, options: {} });
            var options = extend({}, args.options, { value: value });

            if (shield.ui.CheckBox) {
                input = new shield.ui.CheckBox(wrapperInput, options);

                if (shouldFocusControl) {
                    input.focus();
                }

                input.checked(value);

                self._editors[field] = input;
            }
        },

        _putRowInEditMode: function (row, cellIndex) {
            var self = this,
                cells = row.find(".sui-cell"),
                buttonsCells,
                i;

            for (i = 0; i < cells.length; i++) {
                self._putCellInEditMode(
                    cells[i], 
                    row.get(0).rowIndex, 
                    // NOTE: for determining this index, see how the _getColumnIndex works
                    cellIndex - row.find(".sui-indent-cell, .sui-expand-cell, .sui-expand-cell-disabled, .sui-collapse-cell").length
                );
            }

            buttonsCells = row.find(".sui-edit");
            if (buttonsCells.length > 0) {
                self._grid._changeEditColumnButtons(row.get(0).rowIndex, $(row.find(".sui-button-cell")[0]));
            }
        },

        _destroyRow: function (rowIndex) {
            var self = this,
                grid = self._grid,
                row = grid.contentTable.find("tbody > tr").eq(rowIndex),
                columns = grid.columns,
                i,
                colEditor;

            for (i = 0; i < columns.length; i++) {
                colEditor = self._editors[columns[i].field];
                if (colEditor) {
                    if (isFunc(colEditor.destroy)) {
                        self._editors[columns[i].field].destroy();
                    }
                    delete self._editors[columns[i].field];
                }
            }

            row.remove();
        },

        destroy: function () {
            var self = this,
                i,
                el;

            self._grid.dataSource.off(ERROR, self._dsErrorHandler);
            self._grid.element.off(CLICK, ".sui-cell", self._editingTriggeredHandler);
            self._grid.element.off(DOUBLECLICK, ".sui-cell", self._editingTriggeredHandler);
            $(doc).off(CLICK, self._documentClickedHandler);

            if (self._editors) {
                for (i = 0; i < self._editors.length; i++) {
                    el = self._editors[i].editor.element();
                    self._editors[i].editor.destroy();
                    el.remove();
                }
            }

            self._editingTriggeredHandler =
                self._dsErrorHandler =
                self._documentClickedHandler =
                self._grid =
                self._errorDuringEdit =
                self.options = null;
        }
    });


    // Column class
    var Column = Class.extend({
        init: function (options) {
            var self = this;

            if (isString(options)) {
                self.field = options;
            }
            else if (isObject(options)) {
                self.field = options.field;
                self.title = options.title;
                self.format = options.format;
                self.width = options.width;
                self.minWidth = options.minWidth;
                self.maxWidth = options.maxWidth;
                self.resizable = options.resizable != null ? !!options.resizable : true;
                self.attributes = options.attributes;
                self.headerAttributes = options.headerAttributes;
                self.headerTemplate = options.headerTemplate;
                self.columnTemplate = options.columnTemplate;
                self.footerTemplate = options.footerTemplate;
                self.groupFooterTemplate = options.groupFooterTemplate;
                self.buttons = options.buttons;
                self.editor = options.editor;
                self.customFilter = options.customFilter;
                self.sortable = options.sortable;
                self.filterable = options.filterable;
            }
        },
        destroy: function () {
            var self = this;

            if (self.buttons) {
                self.buttons.length = 0;
            }
            // set the fields to null
            self.field =
                self.title =
                self.editor =
                self.format =
                self.width =
                self.minWidth =
                self.maxWidth =
                self.resizable =
                self.attributes =
                self.headerAttributes =
                self.headerTemplate =
                self.buttons =
                self.customFilter =
                self.footerTemplate =
                self.groupFooterTemplate =
                self.sortable =
                self.filterable =
                self.columnTemplate = null;
        }
    });


    // ColumnResizing class
    var ColumnResizing = Class.extend({
        options: {
            ns: ".shieldGridColumnResizing",
            width: 12,
            offset: 6,
            min: 12
        },

        init: function (grid) {
            var self = this;

            self.grid = grid;
            self.options = extend(true, {}, ColumnResizing.fn.options);

            grid.headerTable.on(MOUSEMOVE + self.options.ns, ".sui-headercell", proxy(self._showHandle, self));
        },

        _showHandle: function (e) {
            if (this.resizing) {
                return;
            }

            var self = this,
                options = self.options,
                grid = self.grid,
                handle = self.handle,
                x = e.pageX,
                params = self.params = self._params($(e.currentTarget)),
                isAtNextCellEdge = x >= params.offset.left && x <= (params.offset.left + options.offset) && params.header.index() > 0;

            if (params.isRtl) {
                isAtNextCellEdge = x >= (params.offset.left + params.width - options.offset) && x <= (params.offset.left + params.width) && params.header.index() > 0;
            }

            // cursor is at leftmost edge of the header -> use the previous header
            if (isAtNextCellEdge) {
                params = self.params = self._params(params.header.prev());
            }

            if (!params.column.resizable) {
                return;
            }

            if (x >= params.threshold && x <= params.edge + options.offset) {
                if (!handle) {
                    handle = self.handle = $('<div class="sui-resizable-handle"/>')
                        .on(MOUSEDOWN + options.ns, proxy(self._down, self))
                        .appendTo(params.header.parents(".sui-headercontent"));
                }

                handle.css({
                    top: params.position.top,
                    left: handle.parent()[0].scrollLeft + params.handleLeft,
                    width: options.width,
                    height: params.height
                }).show();
            }
            else if (handle) {
                handle.hide();
            }
        },

        _params: function (header) {
            var self = this,
                options = self.options,
                offset = header.offset(),
                position = header.position(),
                isRtl = support.isRtl(self.grid.element),
                width = header.outerWidth(),
                edge = offset.left + (isRtl ? options.width : width),
                index = header.index(),
                column = self.grid.columns[index],
                min = column.minWidth >= 0 ? +column.minWidth : options.min,
                max = column.maxWidth >= min ? +column.maxWidth : null;

            return {
                header: header,
                index: index,
                column: column,
                min: min,
                max: max,
                offset: offset,
                isRtl: isRtl,
                width: width,
                current: width,
                height: header.outerHeight(),
                edge: edge,
                threshold: edge - options.width + (isRtl ? -1 : 1) * options.offset,
                position: position,
                handleLeft: position.left + (isRtl ? options.width : width) - options.width + (isRtl ? -1 : 1) * options.offset
            };
        },

        _down: function (e) {
            var self = this,
                grid = self.grid,
                params = self.params,
                selector;

            //do not trigger for any button other than left button
            if (e.button > 1 || !params) {
                return;
            }

            selector = "> colgroup col:nth-child(" + (params.index + 1) + ")";

            params.origin = e.pageX;

            params.cols = $()
                .add(grid.headerTable.find(selector))
                .add(grid.contentTable.find(selector));

            self.resizing = true;

            self.handle.hide();

            $(doc)
                .on(MOUSEMOVE + self.options.ns, proxy(self._move, self))
                .on(MOUSEUP + self.options.ns, proxy(self._up, self));

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                params = self.params,
                diff = (params.isRtl ? -1 : 1) * (e.pageX - params.origin),
                width = mathMax(params.width + diff, params.min);

            if (params.max) {
                width = mathMin(width, params.max);
            }

            // clean up if, by any chance, MOUSEMOVE has fired before MOUSEDOWN
            if (!self.resizing) {
                self._up();
                return;
            }

            if (width !== params.current) {
                params.cols.width(params.current = width);
            }
        },

        _up: function () {
            var self = this,
                grid = self.grid,
                index = self.params.index,
                width = self.params.current,
                column = grid.columns[index] || {},
                columnOption = (grid.options.columns || [])[index] || {};

            self.resizing = false;
            self.params = null;

            column.width = columnOption.width = width + "px";

            $(doc).off(self.options.ns);

            shield.selection(true);
        },

        destroy: function () {
            var self = this;

            self._up();

            self.grid.headerTable.off(self.options.ns);

            self.grid = null;

            if (self.handle) {
                self.handle
                    .off(self.options.ns)
                    .remove();

                self.handle = null;
            }
        }
    });

    // Filtering class
    var Filtering = Class.extend({
        init: function (grid) {
            var self = this;

            self.grid = grid;
            self._filters = {};

            self._createFilterRow();
        },

        _createFilterRow: function () {
            var self = this,
                grid = self.grid,
                table = grid.headerTable,
                thead = table.find(">thead"),
                tr = $("<tr class='sui-filter-row' />"),
                indentCellsCount = thead.find(".sui-indent-cell").length,
                schema = grid.dataSource.schema,
                columnType,
                dataField,
                cell,
                columns = grid.columns,
                fields,
                i,
                j;

            for (i = 0; i < indentCellsCount; i++) {
                $('<th class="sui-indent-cell">').appendTo(tr);
            }

            if (schema && schema.options.fields) {
                fields = schema.options.fields;
            }

            for (j = 0; j < columns.length; j++) {
                columnType = fields ? fields[columns[j].field].type : null;

                dataField = columns[j].field ? columns[j].field.replace(/[\"\']/g, "@") : '';
                cell = $("<th class='sui-filter-cell'  data-field='" + dataField + "' />");
                cell.appendTo(tr);

                if (columns[j].filterable !== false) {
                    // add filtering controls only if dataField defined
                    if (dataField.length > 0) {
                        self._initializeEditor(cell, columnType, columns[j].field, columns[j]);
                        self._appendFilterButton(cell);
                    }
                }
            }

            tr.appendTo(thead);

            $(doc).on(CLICK, self._documentClickedHandler = proxy(self._documentClicked, self));
        },

        _documentClicked: function (e) {
            var self = this,
                height,
                top;

            if (self.listBox && !$(e.target).hasClass("sui-filter-button") && !$(e.target).hasClass("sui-filter-button-content")) {
                self._filterByField = null;
                height = self.listBox.element.parent().height();
                top = self.listBox.element.parent().offset().top;
                if (self._slideUp) {
                    self.listBox.element.parent().animate({
                        height: 0,
                        top: top + height
                    }, 150, function () {
                        self.listBox.element.parent().css({
                            display: "none",
                            height: height
                        });
                    });
                }
                else {
                    self.listBox.element.parent().animate({
                        height: 0
                    }, 150, function () {
                        self.listBox.element.parent().css({
                            display: "none",
                            height: height
                        });
                    });
                }
            }
        },

        _appendFilterButton: function (cell) {
            if (shield.ui.Button) {
                var wrapperButton = $('<button type="button"><span class="sui-sprite sui-filter-button-content"></span></button>')
                    .appendTo(cell);

                // build the button with the given options
                var btn = new shield.ui.Button(wrapperButton, {
                    cls: "sui-filter-button",
                    events: {
                        click: proxy(this._filterButtonClicked, this)
                    }
                });
            }
        },

        _filterButtonClicked: function (e) {
            var self = this,
                grid = self.grid,
                data,
                height,
                top,
                schema = grid.dataSource.schema,
                filtering = grid.options.filtering,
                stringFunc = filtering.stringFunc ? filtering.stringFunc : [{ "func": "eq", "name": "Equal to" }, { "func": "neq", "name": "Not equal to" }, { "func": "con", "name": "Contains" },
                    { "func": "notcon", "name": "Not contains" }, { "func": "starts", "name": "Starts with" }, { "func": "ends", "name": "Ends with" }, { "func": "gt", "name": "Greater than" },
                    { "func": "lt", "name": "Less than" }, { "func": "gte", "name": "Greater than or equal" }, { "func": "lte", "name": "Less than or equal" }, { "func": "isnull", "name": "Is null" }, { "func": "notnull", "name": "Is not null" }],
                nonStingFunc = filtering.nonStingFunc ? filtering.nonStingFunc : [{ "func": "eq", "name": "Equal to" }, { "func": "neq", "name": "Not equal to" }, { "func": "gt", "name": "Greater than" },
                    { "func": "lt", "name": "Less than" }, { "func": "gte", "name": "Greater than or equal" }, { "func": "lte", "name": "Less than or equal" }, { "func": "isnull", "name": "Is null" },
                    { "func": "notnull", "name": "Is not null" }];

            var field = e.target.element.parent().attr("data-field").replace(/[@]/g, "'");
            self._filterByField = field;
            if (schema && schema.options.fields) {
                var fields = schema.options.fields;
                if (fields[field].type == String) {
                    data = stringFunc;
                }
                else {
                    data = nonStingFunc;
                }
            }
            else {
                data = stringFunc;
            }

            if (shield.ui.ListBox) {

                if (!self.listBox) {

                    self._menuWrapper = $("<div style='display: none;' />").appendTo(doc.body);

                    self.listBox = new shield.ui.ListBox(self._menuWrapper, extend({}, {}, {
                        dataSource: {
                            data: data
                        },
                        textTemplate: "{name}",
                        valueTemplate: "{func}",
                        multiple: false,
                        width: 150,
                        maxHeight: 300,
                        events: {
                            select: proxy(self._selectFilterFunction, self)
                        }
                    }));

                    if (self.grid.element.parent().hasClass("sui-rtl")) {
                        self.listBox.element.parent().addClass("sui-rtl");
                    } else {
                        self.listBox.element.parent().css("display", "none");
                    }
                }

                height = self.listBox.element.parent().height();

                self._positionListBox(e);

                if (self._slideUp) {

                    top = e.target.element.offset().top - height;
                    self.listBox.element.parent().css({
                        top: e.target.element.offset().top
                    });

                    self.listBox.element.parent().animate({
                        height: height,
                        top: top - self.listBox.element.parent().innerHeight()
                    }, 150);
                }
                else {
                    self.listBox.element.parent().animate({
                        height: height
                    }, 150);
                }
            }

            self._selectFilterMenuValue();
        },

        _selectFilterMenuValue: function () {
            var self = this,
                field = self._filterByField,
                filter = self.grid.dataSource.filter,
                andFilter,
                selectedValue;

            if (filter && filter.and && filter.and.length > 0) {
                andFilter = filter.and;
                for (var i = 0; i < andFilter.length; i++) {
                    if (andFilter[i].path === field) {
                        selectedValue = andFilter[i].filter;
                    }
                }
            }

            if (selectedValue) {
                self.listBox.values(selectedValue);
            }
            else {
                self.listBox.clearSelection();
            }
        },

        _selectFilterFunction: function (e) {
            var self = this,
                andFilterArr,
                args,
                shouldPushFilter = true,
                value = self._filters[self._filterByField] == "@@custom" ? "@@custom" : self._filters[self._filterByField].value(),
                func = e.item.func,
                currentFilter = { path: self._filterByField, filter: func, value: value };

            if (value == "@@custom") {
                args = self.grid.trigger(GETCUSTOMFILTERVALUE, { field: self._filterByField, value: null });
                value = args.value;
                currentFilter = { path: self._filterByField, filter: func, value: value };
            }
            if ((value === "" || value === null) &&
                func != "notnull" && func != "isnull") {
                return;
            }

            if (self.grid.dataSource.filter && self.grid.dataSource.filter.and) {
                andFilterArr = self.grid.dataSource.filter.and;

                for (var i = 0; i < andFilterArr.length; i++) {
                    if (andFilterArr[i].path === self._filterByField) {
                        andFilterArr[i] = currentFilter;
                        shouldPushFilter = false;
                    }
                }

                if (shouldPushFilter) {
                    andFilterArr.push(currentFilter);
                }
            }
            else {
                self.grid.dataSource.filter = {
                    and: [
                        currentFilter
                    ]
                };
            }

            self.grid.dataSource.read();

            self._addRemoveFilterButton();
        },

        _addRemoveFilterButton: function () {
            var self = this,
                cells,
                $cell,
                cell;

            if (shield.ui.Button) {
                cells = self.grid.headerTable.find(".sui-filter-row > th");

                for (var i = 0; i < cells.length; i++) {
                    $cell = $(cells[i]);

                    if ($cell.attr("data-field") && ($cell.attr("data-field").replace(/[@]/g, "'") == self._filterByField)) {
                        cell = cells[i];
                        break;
                    }
                }
                if ($cell.find(".sui-clear-filter-button").length === 0) {
                    var wrapperButton = $('<button type="button"><span class="sui-sprite sui-clear-filter-button-content"></span></button>')
                        .appendTo(cell);

                    // build the button with the given options
                    var btn = new shield.ui.Button(wrapperButton, {
                        cls: "sui-clear-filter-button",
                        events: {
                            click: proxy(this._clearFilterButtonClicked, this)
                        }
                    });
                }
            }
        },

        _clearFilterButtonClicked: function (e) {
            var self = this,
                element,
                field = e.target.element.parent().attr("data-field").replace(/[@]/g, "'"),
                filters = self.grid.dataSource.filter.and;

            for (var i = 0; i < filters.length; i++) {
                if (filters[i].path == field) {
                    filters.splice(i, 1);
                }
            }

            element = e.target.element;
            e.target.destroy();
            element.remove();

            if (self._filters[field] != "@@custom") {
                self._filters[field].value(null);
            }
            else {
                self.grid.trigger(CLEARFILTER, { field: field, value: null });
            }
            self.grid.dataSource.read();
        },

        _positionListBox: function (e) {
            var self = this,
                button = e.target.element,
                offset = button.offset(),
                top = offset.top,
                left = offset.left,
                elWidth = self.listBox.element.parent().innerWidth(),
                elHeight = self.listBox.element.parent().innerHeight(),
                buttonWidth = button.innerWidth(),
                buttonHeight = button.innerHeight();

            if (left < 0) {
                left = 1;
            }

            if ((left + elWidth) > win.innerWidth) {
                left = win.innerWidth - elWidth - 20;
            }

            self._slideUp = false;

            if (top + elHeight > win.innerHeight) {
                top = top - elHeight;
                buttonHeight = 0;
                self._slideUp = true;
            }

            if (top < 0) {
                top = offset.top;
                buttonHeight = button.innerHeight();
                self._slideUp = false;
            }

            self.listBox.element.parent().css({
                position: 'absolute',
                zIndex: 10002,
                top: top + buttonHeight,
                left: left,
                height: 0,
                display: ""
            });
        },

        _initializeEditor: function (cell, columnType, field, column) {
            var self = this,
                value;

            if (column.customFilter) {
                self._filters[field] = "@@custom";
                column.customFilter.call(self, cell);
            }
            else {
                switch (columnType) {
                    case Number:
                        self._instantiateNumeric(cell, field);
                        break;
                    case Date:
                        self._instantiateDatePicker(cell, field);
                        break;
                    case String:
                        self._instantiateTextBox(cell, field);
                        break;
                    default:
                        self._instantiateTextBox(cell, field);
                        break;
                }
            }
        },

        _instantiateNumeric: function (cell, field) {
            var self = this,
                input,
                wrapperInput = $("<input />");

            wrapperInput.appendTo(cell);

            var args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} });
            var options = extend({}, args.options);

            if (shield.ui.NumericTextBox) {
                input = new shield.ui.NumericTextBox(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        _instantiateDatePicker: function (cell, field) {
            var self = this,
               input,
               wrapperInput = $("<input />");

            wrapperInput.appendTo(cell);

            var args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} });
            var options = extend({}, args.options);

            if (shield.ui.DatePicker) {
                input = new shield.ui.DatePicker(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        _instantiateTextBox: function (cell, field) {
            var self = this,
                input,
                wrapperInput = $("<input type='text' />");

            wrapperInput.appendTo(cell);

            var args = self.grid.trigger(FILTERWIDGETCREATING, { field: field, options: {} });
            var options = extend({}, args.options);

            if (shield.ui.TextBox) {
                input = new shield.ui.TextBox(wrapperInput, options);
                self._filters[field] = input;
            }
        },

        destroy: function () {
            var self = this,
                key;

            self.grid = null;

            for (key in self._filters) {
                if (self._filters.hasOwnProperty(key)) {
                    self._filters[key].destroy();
                    self._filters[key] = null;
                }
            }
            if (self.listBox) {
                self.listBox.destroy();
                self.listBox = null;
            }

            $(doc).off(CLICK, self._documentClickedHandler);

            self._filterByField =
            self._documentClickedHandler =
            self._filters =
            self._slideUp =
            self._menuWrapper = null;
        }
    });


    // Sorting class
    var Sorting = Class.extend({
        init: function (options, grid) {
            var self = this;

            self.grid = grid;
            self.sortExpressions = [];

            if (isBoolean(options)) {
                self.allowUnsort = true;
                self.multiple = false;
                self.firstAscending = true;
                self.ascText = "&#9650;";
                self.descText = "&#9660;";
            }
            else if (isObject(options)) {
                self.allowUnsort = isUndefined(options.allowUnsort) ? true : options.allowUnsort;
                self.multiple = options.multiple;
                self.firstAscending = isUndefined(options.firstAscending) ? true : options.firstAscending;
                self.ascText = isUndefined(options.ascText) ? "&#9650;" : options.ascText;
                self.descText = isUndefined(options.descText) ? "&#9660;" : options.descText;
            }

            self._initialize();
        },

        destroy: function () {
            var self = this;

            self.allowUnsort = self.multiple = self.sortExpressions = null;
            self.length = 0;

            if (self._click) {
                self.grid.headerTable.find(".sui-link").each(function () {
                    $(this).off(CLICK, self._click);
                });
                self._click = null;
            }

            self.grid = null;
        },

        _initialize: function () {
            var self = this,
                grid = self.grid,
                dsSort = grid.dataSource.sort,
                columns = grid.columns,
                headerCells = grid.headerTable.find(".sui-headercell");

            self._click = proxy(self._clickHandler, self);

            headerCells.each(function (index) {
                var that = $(this),
                    text = that.html();

                if (columns[index].sortable !== false) {

                    that.empty();
                    $('<a href="#" class="sui-link"></a>')
                        .appendTo(that)
                        .html(text)
                        .on(CLICK, self._click);
                }
            });

            if (dsSort) {
                for (var i = 0; i < dsSort.length; i++) {
                    var currentSort = dsSort[i];
                    for (var j = 0; j < columns.length; j++) {
                        if (columns[j].sortable !== false) {
                            if (currentSort.path == columns[j].field) {
                                var link = $(headerCells[j]).find(".sui-link"),
                                    sufix = "ascending",
                                    cssClass = "sui-asc",
                                    text = self.ascText;

                                if (currentSort.desc) {
                                    sufix = "descending";
                                    text = self.descText;
                                    cssClass = "sui-desc";
                                }

                                link.addClass(cssClass);

                                $('<span class="sui-' + sufix + '">' + text + '</span>')
                                    .appendTo(link);
                            }
                        }
                    }
                }
            }
        },

        _clickHandler: function (e) {
            var self = this,
                element = $(e.target).closest(".sui-link"),
                grid = self.grid,
                columnIndex = inArray(element.parent().get(0), grid.headerTable.find(".sui-headercell")),
                column = grid.columns[columnIndex];

            if (element.hasClass("sui-desc")) {
                if (self.allowUnsort && self.firstAscending) {
                    self._sortInternal(column, true, true);
                }
                else {
                    self._sortInternal(column, false, false);
                }
            }
            else if (element.hasClass("sui-asc")) {
                if (self.allowUnsort && !self.firstAscending) {
                    self._sortInternal(column, false, true);
                }
                else {
                    self._sortInternal(column, true, false);
                }
            }
            else {
                if (self.firstAscending) {
                    self._sortInternal(column, false, false);
                }
                else {
                    self._sortInternal(column, true, false);
                }
            }

            return false;
        },

        _sortInternal: function (column, desc, unsort) {
            var self = this,
                grid = self.grid,
                dataSource = grid.dataSource,
                dsSort = dataSource.sort,
                args = grid.trigger(COMMAND, { commandName: SORT, cancel: false, column: column, desc: desc, unsort: unsort });

            if (!args.cancel) {
                if (dsSort) {
                    if (!self.multiple && dsSort) {
                        dsSort.length = 0;
                    }
                    else {
                        var item = $.grep(dsSort, function (e) {
                            return (e.path === column.field && e.desc === (unsort ? desc : !desc));
                        });

                        if (item.length > 0) {
                            var index = inArray(item[0], dsSort);
                            dsSort.splice(index, 1);
                        }
                    }

                    if (!unsort) {
                        dsSort.push({ path: column.field, desc: desc });
                    }
                }
                else {
                    if (!unsort) {
                        dsSort = dataSource.sort = [{ path: column.field, desc: desc }];
                    }
                }

                grid._refreshOnSort();

                grid.trigger(SORT, { column: column, desc: desc, unsort: unsort });
            }
        },

        _sort: function (fieldName, desc, unsort) {
            var self = this,
              grid = self.grid,
              dataSource = grid.dataSource,
              item,
              dsSort = dataSource.sort,
              index;

            if (dsSort) {
                item = $.grep(dsSort, function (e) { return (e.path === fieldName && e.desc === desc); });
            }

            if (!item || item.length <= 0) {
                if (!self.multiple && dsSort) {
                    dsSort.length = 0;
                }

                if (dsSort) {
                    var showldRefresh = false;
                    var currentItem = $.grep(dsSort, function (e) { return (e.path === fieldName && e.desc != desc); });
                    if (currentItem && currentItem.length > 0) {
                        index = inArray(currentItem[0], dsSort);
                        dsSort.splice(index, 1);
                        showldRefresh = true;
                    }
                    if (!unsort) {
                        dsSort.push({ path: fieldName, desc: desc });
                        showldRefresh = true;
                    }

                    if (showldRefresh) {
                        grid._refreshOnSort();
                    }
                }
                else {
                    if (!unsort) {
                        dataSource.sort = [{ path: fieldName, desc: desc }];
                        grid._refreshOnSort();
                    }
                }

            }
            else {
                if (unsort) {
                    index = inArray(item[0], dsSort);
                    dsSort.splice(index, 1);
                    grid._refreshOnSort();
                }
            }
        }
    });


    // Selection class
    var Selection = Class.extend({
        init: function (headertable, table, options, grid) {
            var self = this;

            if (isBoolean(options)) {
                self.type = "row";
                self.multiple = false;
                self.toggle = false;
                self.spreadsheet = true;
            }
            else if (isObject(options)) {
                self.type = options.type ? options.type : "row";
                self.multiple = options.multiple;
                self.toggle = options.toggle ? options.toggle : false;
                self.spreadsheet = isUndefined(options.spreadsheet) ? true : options.spreadsheet;
            }

            self.parentGrid = grid;

            table.addClass(SELECTABLE);
            headertable.addClass("sui-non-selectable");
            self.table = table;
            self.lastSelected = null;

            table.on(MOUSEDOWN, self._mouseDown = proxy(self._mouseDownHandler, self));
            table.on(MOUSEMOVE, self._mouseMove = proxy(self._mouseMoveHandler, self));

            $(doc).on(MOUSEUP, self._mouseUp = proxy(self._mouseUpHandler, self));

            // hack for IE<10, the older version of IE do not recognize user-select: none; or -ms-user-select: none;
            if (isIE) {
                table.on("selectstart", self._selectStart = function () { return false; });
            }
            if (self.multiple) {
                self.area = $(doc.createElement('span'));
                self.area.addClass("sui-area sui-area-color");
            }
        },

        destroy: function () {
            var self = this;
            self.parentGrid = null;
            self.type = null;
            self.multiple = null;
            self.lastSelected = null;
            self.toggle = null;
            self.spreadsheet = null;
            self.table.off(MOUSEDOWN, self._mouseDown);
            self._mouseDown = null;
            self.table.off(MOUSEMOVE, self._mouseMove);
            self._mouseMove = null;
            self.table.off(MOUSEUP, self._mouseUp);
            $(doc).off(MOUSEUP, self._mouseUp);
            self._mouseUp = null;
            self.x = null;
            self.y = null;
            self.table.off("selectstart", self._selectStart);
            self._selectStart = null;
            self.elements = null;
            self.table = null;
            if (self.area) {
                self.area.remove();
                self.area = null;
            }
        },

        select: function (el) {
            var self = this;

            if (el) {
                el.each(function () {
                    self._selectElement($(this));
                });

                return;
            }

            return self.table.find("." + SELECTED);
        },

        clear: function () {
            var self = this;

            if (self.type == "row") {
                self._clearSelectedRows();
            }
            else {
                self._clearSelectedCells();
            }
        },

        _getParentTable: function (current) {
            if (!current) {
                return undefined;
            }
            if (current[0].nodeName.toUpperCase() == "TABLE") {
                return current[0];
            }
            if (current.parent()) {
                return this._getParentTable(current.parent());
            }
        },

        _mouseDownHandler: function (e) {
            var self = this,
                x = e.pageX,
                y = e.pageY,
                current = $(e.target);

            self.x = x;
            self.y = y;

            if (current[0].nodeName.toUpperCase() == "TD" &&
                self._getParentTable(current) != self.table[0]) {
                return;
            }

            if ((current.hasClass("sui-cell") || current.hasClass("sui-row") || current.hasClass("sui-alt-row")) &&
                         !current.hasClass("sui-detail-cell") &&
                         !current.hasClass("sui-detail-row") &&
                         !current.hasClass("sui-collapse-cell") &&
                         !current.hasClass("sui-expand-cell") &&
                         !current.hasClass("sui-expand-cell-disabled") &&
                         !current.hasClass("sui-indent-cell")) {

                if (self.multiple) {
                    self.area
                        .appendTo(doc.body)
                        .css({
                            left: x + 1,
                            top: y + 1,
                            width: 0,
                            height: 0
                        });
                }

                $(doc).on(MOUSEMOVE, self._mouseMove);

                shield.selection(false);

                self.elements = getElementsFromEvent(e, self.table);
            }
        },

        _mouseMoveHandler: function (e) {
            var self = this,
                x = e.pageX,
                y = e.pageY,
                start = self.x,
                end = self.y,

            position = {
                left: start > x ? x : start,
                top: end > y ? y : end,
                width: abs(x - self.x),
                height: abs(y - self.y)
            };
            if (self.multiple) {
                self.area.css(position);
            }
            e.preventDefault();
        },

        _mouseUpHandler: function (e) {
            var self = this,
                isCtrlPressed = e.ctrlKey,
                area = self.area,
                elements = self.elements,
                i;

            $(doc).off(MOUSEMOVE, self._mouseMove);

            shield.selection(true);

            if (elements) {
                self.elementsToBeSelected = [];

                if (self.type == "row") {
                    self._performRowSelection(area, isCtrlPressed, elements, e);
                }
                else {
                    self._performCellSelection(area, isCtrlPressed, elements, e)
                }
                var toBeSelected = [];
                for (i = 0; i < self.elementsToBeSelected.length; i++) {
                    var current = self.elementsToBeSelected[i];
                    if ((current.hasClass("sui-cell") || current.hasClass("sui-row") || current.hasClass("sui-alt-row")) &&
                        !current.hasClass("sui-detail-cell") &&
                        !current.hasClass("sui-detail-row") &&
                        !current.hasClass("sui-collapse-cell") &&
                        !current.hasClass("sui-expand-cell") &&
                        !current.hasClass("sui-expand-cell-disabled") &&
                        !current.hasClass("sui-indent-cell")) {
                        toBeSelected.push(current);
                    }
                }

                var args = self.parentGrid.trigger(COMMAND, { commandName: SELECTIONCHANGED, cancel: false, toBeSelected: toBeSelected });

                if (!args.cancel) {
                    for (i = 0; i < toBeSelected.length; i++) {
                        self._selectElement(toBeSelected[i]);
                    }

                    self.parentGrid.trigger(SELECTIONCHANGED);
                    self.elements = null;
                }
            }

            if (area) {
                area.remove();
            }
        },

        _performRowSelection: function (area, isCtrlPressed, elements, e) {
            var self = this;
            if ($(e.target).hasClass("sui-expand-cell") ||
                $(e.target).hasClass("sui-expand-cell-disabled") ||
                $(e.target).hasClass("sui-collapse-cell") ||
                ($(e.target) && $(e.target).parent() &&
                ($(e.target).parent().hasClass("sui-expand-cell") || $(e.target).parent().hasClass("sui-expand-cell-disabled") || $(e.target).parent().hasClass("sui-collapse-cell")))) {
                return;
            }
            if (area && (area.height() === 0 && area.width() === 0)) {
                if (self.multiple) {
                    self._processMultiRowSelection(e, elements);
                }
                else {
                    self._processSingleRowSelection(e, elements);
                }
            }
            else if (!self.multiple) {
                self._processSingleRowSelection(e, elements);
            }
            else {

                var rows = self.table.find(">tbody > tr");

                var last = null;

                each(rows, function (index, item) {
                    var row = $(item),
                        top = row.offset().top;

                    if (top < e.pageY) {
                        last = item.rowIndex;
                    }
                });

                if (!isCtrlPressed) {
                    self._clearSelectedRows();
                }
                self._selectRowRange(elements.row.rowIndex, last, isCtrlPressed);
            }
        },

        _performCellSelection: function (area, isCtrlPressed, elements, e) {
            var self = this;
            if ($(e.target).hasClass("sui-expand-cell") ||
                $(e.target).hasClass("sui-expand-cell-disabled") ||
                $(e.target).hasClass("sui-collapse-cell") ||
                ($(e.target) && $(e.target).parent() &&
                ($(e.target).parent().hasClass("sui-expand-cell") || $(e.target).parent().hasClass("sui-expand-cell-disabled") || $(e.target).parent().hasClass("sui-collapse-cell")))) {
                return;
            }
            if (area && area.height() === 0 && area.width() === 0) {
                {
                    if (self.multiple) {
                        self._processMultiCellSelection(e, elements);
                    }
                    else {
                        self._processSingleCellSelection(e, elements);
                    }
                }
            }
            else if (!self.multiple) {
                self._processSingleCellSelection(e, elements);
            }
            else {
                var cells = self.table.find(">tbody > tr > td");

                var toBeSelected = [];
                each(cells, function (index, item) {
                    var cell = $(item),
                        cellWidth = cell.get(0).clientWidth,
                        cellHeight = cell.get(0).clientHeight,

                        cellTopY = cell.offset().top,
                        cellLeftY = cell.offset().left,
                        cellBottomY = cellTopY + cellHeight,
                        cellRightX = cellLeftY + cellWidth,

                        leftX = mathMin(e.pageX, self.x),
                        rightX = mathMax(e.pageX, self.x),
                        topY = mathMin(e.pageY, self.y),
                        bottomY = mathMax(e.pageY, self.y),

                        qualifyX = false,
                        qualifyY = false;


                    if (cellTopY < topY) {
                        if (cellBottomY > topY) {
                            qualifyX = true;
                        }
                    }
                    else {
                        if (cellTopY < bottomY) {
                            qualifyX = true;
                        }
                    }

                    if (cellLeftY < leftX) {
                        if (cellRightX > leftX) {
                            qualifyY = true;
                        }
                    }
                    else {
                        if (cellLeftY < rightX) {
                            qualifyY = true;
                        }
                    }

                    if (qualifyX && qualifyY) {
                        toBeSelected.push(item);
                    }
                });
                if (!isCtrlPressed) {
                    self._clearSelectedCells();
                }
                for (var i = 0; i < toBeSelected.length; i++) {
                    var selectedCell = $(toBeSelected[i]);
                    if (selectedCell.hasClass(SELECTED)) {
                        self._deselectElement($(toBeSelected[i]));
                    }
                    else {
                        self.elementsToBeSelected.push($(toBeSelected[i]));
                    }
                }
            }
        },

        _selectRowRange: function (startRowIdex, endRowIndex, isCtrlPressed) {
            var self = this,
                start = mathMin(startRowIdex, endRowIndex),
                end = mathMax(startRowIdex, endRowIndex),
                rows = self.table.find(">tbody > tr");

            for (var i = start; i <= end; i++) {
                var row = $(rows[i]);
                if (isCtrlPressed) {
                    if (row.hasClass(SELECTED)) {
                        self._deselectElement(row);
                    }
                    else {
                        self.elementsToBeSelected.push(row);
                    }
                }
                else {
                    self.elementsToBeSelected.push(row);
                }
            }
        },

        _clearSelectedRows: function () {
            var self = this,
                selectedRows = self.table.find(">tbody>tr." + SELECTED);

            each(selectedRows, function (index, item) {
                self._deselectElement($(item));
            });
        },

        _clearSelectedCells: function () {
            var self = this,
                selectedCells = self.table.find(">tbody > tr > td." + SELECTED);

            each(selectedCells, function (index, item) {
                self._deselectElement($(item));
            });
        },

        _processSingleRowSelection: function (e, elements) {
            var self = this,
               table = self.table,
               toggle = self.toggle,
               multiple = self.multiple,
               row = $(elements.row),
               isSelected = row.hasClass(SELECTED);

            if (!multiple) {
                self._clearSelectedRows();
            }

            if (toggle) {
                if (isSelected) {
                    self._deselectElement(row);
                }
                else {
                    self.elementsToBeSelected.push(row);
                }
            }
            else {
                self._clearSelectedRows();
                self.elementsToBeSelected.push(row);
            }

            self.lastSelected = row;
        },

        _processMultiRowSelection: function (e, elements) {
            var self = this,
                table = self.table,
                isCtrlPressed = e.ctrlKey,
                isShifPressed = e.shiftKey,
                row = $(elements.row);

            if (isCtrlPressed) {
                if (row.hasClass(SELECTED)) {
                    self._deselectElement(row);
                    self.lastSelected = row;
                }
                else {
                    self.elementsToBeSelected.push(row);
                    self.lastSelected = row;
                }
            }
            else if (isShifPressed) {
                var selectedRows = self.table.find(">tbody tr." + SELECTED);
                if (self.lastSelected) {
                    var lastSelectedRow = self.lastSelected,
                        last = lastSelectedRow.get(0).rowIndex,
                        rows = table.find(">tbody > tr"),
                        current = row.get(0).rowIndex,
                        from = mathMin(current, last),
                        to = mathMax(current, last);

                    self._clearSelectedRows();

                    for (var i = from; i <= to; i++) {
                        if (i !== last) {
                            var currentRow = $(rows[i]);
                            self.elementsToBeSelected.push(currentRow);
                        }
                    }
                    self.elementsToBeSelected.push($(rows[last]));
                }
                else {
                    self.elementsToBeSelected.push(row);
                    self.lastSelected = row;
                }
            }
            else {
                self._processSingleRowSelection(e, elements);
            }
        },

        _processSingleCellSelection: function (e, elements) {
            var self = this,
               table = self.table,
               toggle = self.toggle,
               multiple = self.multiple,
               cell = $(elements.cell),
               isSelected = cell.hasClass(SELECTED),
               lastSelected = self.lastSelected;

            if (!multiple) {
                self._clearSelectedCells();
            }
            if (toggle) {
                if (isSelected) {
                    self._deselectElement(cell);
                }
                else {
                    self.elementsToBeSelected.push(cell);
                }
            }
            else {
                self._clearSelectedCells();
                self.elementsToBeSelected.push(cell);
            }

            self.lastSelected = cell;
        },

        _processMultiCellSelection: function (e, elements) {
            var self = this,
                table = self.table,
                isCtrlPressed = e.ctrlKey,
                isShifPressed = e.shiftKey,
                cell = $(elements.cell);
            if (isCtrlPressed) {
                if (cell.hasClass(SELECTED)) {
                    self._deselectElement(cell);
                    self.lastSelected = cell;
                }
                else {
                    self.elementsToBeSelected.push(cell);
                    self.lastSelected = cell;
                }
            }
            else if (isShifPressed) {
                if (self.lastSelected) {
                    var lastSelectedCell = self.lastSelected,
                        tableElement = self.table.get(0),
                        columnsLength = tableElement.rows[0].cells.length,
                        lastRowIndex = lastSelectedCell.parent().get(0).rowIndex,
                        last = lastRowIndex * columnsLength + lastSelectedCell.get(0).cellIndex,
                        cells = table.find(">tbody > tr > td"),
                        currentRowIndex = cell.parent().get(0).rowIndex,
                        current = currentRowIndex * columnsLength + cell.get(0).cellIndex,
                        from = mathMin(current, last),
                        to = mathMax(current, last),
                        i;

                    self._clearSelectedCells();

                    if (self.spreadsheet) {
                        var lastSelectedCellIndex = lastSelectedCell[0].cellIndex,
                        currentCellIndex = cell[0].cellIndex;

                        from = mathMin(lastSelectedCellIndex, currentCellIndex);
                        to = mathMax(lastSelectedCellIndex, currentCellIndex);

                        var fromRow = mathMin(lastRowIndex, currentRowIndex),
                            toRow = mathMax(lastRowIndex, currentRowIndex);

                        for (i = fromRow ; i <= toRow; i++) {
                            var r = tableElement.rows[i],
                                j;
                            for (j = from; j <= to; j++) {
                                self.elementsToBeSelected.push($(r.cells[j]));
                            }
                        }
                    }
                    else {
                        for (i = from; i <= to; i++) {
                            if (i !== last) {
                                var currentRow = $(cells[i]);
                                self.elementsToBeSelected.push(currentRow);
                            }
                        }
                    }
                    self.elementsToBeSelected.push($(cells[last]));
                }
                else {
                    self.elementsToBeSelected.push(cell);
                    self.lastSelected = cell;
                }
            }
            else {
                self._processSingleCellSelection(e, elements);
            }
        },

        _selectElement: function (el) {
            el.addClass(SELECTED);
        },

        _deselectElement: function (el) {
            el.removeClass(SELECTED);
        }
    });

    // GroupReorder class
    var GroupReorder = Class.extend({
        init: function (grid) {
            var self = this;
            self.grid = grid;
            self.options = extend(true, {}, GroupReorder.fn.options);
            self._events(true);
        },

        options: {
            ns: ".shieldGridGroupReorder",
            returnDuration: 50,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div style='border-color:transparent;' class='sui-grid sui-grid-core'><div class='sui-group-panel-indicator'><span class='sui-group-title'>{0}</span><span class='sui-group-close-button'></span></div></div>"
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self.options.ns, ".sui-group-panel-indicator", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self.options.ns, ".sui-group-panel-indicator", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-group-panel-indicator"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                ns = self.options.ns,
                x = e.pageX,
                y = e.pageY;

            self.dataField = target.attr("data-field");

            //do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }

            self._moveProxy = proxy(self._move, self);
            self._upProxy = proxy(self._up, self);

            $(doc)
                .on(MOUSEMOVE + ns, self._moveProxy)
                .on(MOUSEUP + ns, self._upProxy);

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                // find the index of the target element, in the set of all header cells
                // in the parent row, skipping indent and other non sui-headercell cells
                index: target.parent().find(".sui-group-panel-indicator").index(target),
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;

            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);

                self._indicator();
            }
        },

        _positions: function (target) {
            var items = target.parent().children(".sui-group-panel-indicator"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGrid;

            for (i = 0; i < start.positions.length; i++) {
                pos = start.positions[i];

                isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                if (isOnHeader && isOnGrid) {
                    return i;
                }
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-group-panel-indicator"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }

            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }

                if (index !== start.index) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);

                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs,
                dataField = self.dataField;

            self._detachDocumentEvents();
            if (dragged) {
                if (newIndex != null && newIndex > -1) {
                    dragged.remove();

                    commandArgs = grid.trigger(COMMAND, { commandName: GROUPSREORDER, cancel: false, index: start.index, newIndex: newIndex });

                    if (!commandArgs.cancel) {
                        var groups = grid.dataSource.group;

                        for (var i = 0; i < groups.length; i++) {
                            if (groups[i].field == dataField) {
                                var tmp = groups[i];
                                groups[i] = groups[newIndex];
                                groups[newIndex] = tmp;
                                break;
                            }
                        }
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);

                    if (self.grid.dataSource.group) {
                        commandArgs = grid.trigger(COMMAND, { commandName: UNGROUP, cancel: false, field: dataField });

                        if (!commandArgs.cancel) {
                            self.grid.ungroup(dataField);
                            grid.trigger(UNGROUP, commandArgs);
                        }
                    }
                }
            }

            self.dragged = self.dataField = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(options.ns);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;
                grid.dataSource.read();
                grid.trigger(GROUPSREORDER, commandArgs);
            }
        },

        _detachDocumentEvents: function () {
            var self = this,
                ns = self.options.ns;

            self._moveProxy =
            self._upProxy = null;

            $(doc)
                .off(MOUSEMOVE + ns, self._moveProxy)
                .off(MOUSEUP + ns, self._upProxy);
        },

        destroy: function () {
            var self = this;

            self.dataField = null;
            self._detachDocumentEvents();
            self._events(false);
        }
    });

    // ColumnGroupReorder class
    var ColumnGroupReorder = Class.extend({
        init: function (grid) {
            var self = this;
            self.grid = grid;
            self.options = extend(true, {}, ColumnReorder.fn.options);
            self._events(true);
            grid.headerTable.addClass("sui-reorderable");
        },

        options: {
            ns: ".shieldGridColumnGroupReorder",
            returnDuration: 150,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div class='sui-grid sui-grid-core'><div class='sui-gridheader'><table class='sui-table'><thead><tr class='sui-columnheader'><th class='sui-headercell'>{0}</th></tr></thead></table></div></div>"
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self.options.ns, ".sui-headercell", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self.options.ns, ".sui-headercell", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-headercell"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                ns = self.options.ns,
                x = e.pageX,
                y = e.pageY;

            //do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }
             
            var field = target.attr("data-field");
            var groups = self.grid.dataSource.group;
            if (groups) {
                for (var j = 0; j < groups.length; j++) {
                    if (field === groups[j].field) {
                        return;
                    }
                }
            }
            
            $(doc)
                .on(MOUSEMOVE + ns, proxy(self._move, self))
                .on(MOUSEUP + ns, proxy(self._up, self));

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                index: 1000,
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;


            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);
                self._indicator();
            }
        },

        _positions: function (target) {
            var items = this.grid.element.find(".sui-group-panel-indicator"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
                if (i == items.length - 1) {
                    pos.push({
                        left: offset.left,
                        top: offset.top,
                        width: item.outerWidth(),
                        height: item.outerHeight()
                    });
                }
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGroupPanel,
                groupPanel = this.grid.element.find(".sui-group-panel"),
                isOnGrid;

            if (start.positions.length > 0) {
                for (i = 0; i < start.positions.length; i++) {
                    pos = start.positions[i];

                    isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                    isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                    isOnGroupPanel = groupPanel.offset().left <= x && x <= (groupPanel.offset().left + groupPanel.width()) && groupPanel.offset().top <= y && y <= (groupPanel.offset().top + groupPanel.height());

                    if (isOnHeader && isOnGrid) {
                        return i;
                    }
                }
            }
            else {
                isOnGroupPanel = groupPanel.offset().left <= x && x <= (groupPanel.offset().left + groupPanel.width()) && groupPanel.offset().top <= y && y <= (groupPanel.offset().top + groupPanel.height());
            }

            if (isOnGroupPanel) {
                this.isOnGroupPanel = true;
                return this.grid.element.find(".sui-group-panel-indicator").length;
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-group-panel-indicator"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }
       
            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }
                if (this.isOnGroupPanel) {
                    oppositeEdgeCondition = false;
                }
                if (position) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);
                    this.isOnGroupPanel = null;
                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
                else {
                    indicatorX = gridLeft + (!oppositeEdgeCondition ? 0 : start.gridPosition.width);
                    this.isOnGroupPanel = null;
                    indicator.css({
                        left: indicatorX,
                        top: start.gridPosition.top,
                        height: self.grid.element.find(".sui-group-panel-empty").outerHeight()
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs;

            if (dragged) {
                dragged
                    .css({
                        left: start.x - start.left,
                        top: start.y - start.top,
                        transition: shieldFormat("left {0} {1}ms, top {0} {1}ms", options.returnEasing, options.returnDuration)
                    });

                if (newIndex != null && newIndex > -1) {
                    dragged.remove();
                    var dataField = start.target.attr("data-field");

                    commandArgs = grid.trigger(COMMAND, { commandName: GROUP, cancel: false, field: dataField, index: newIndex });

                    if (!commandArgs.cancel) {
                        grid.group(dataField, newIndex, "asc");
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);
                }
            }

            self.dragged = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(options.ns);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;
                grid.dataSource.read();
                grid.trigger(GROUP, commandArgs);
            }
        },

        destroy: function () {
            this._events(false);
            this.grid.headerTable.removeClass("sui-reorderable");
        }
    });

    // ColumnReorder class
    var ColumnReorder = Class.extend({
        init: function (grid) {
            var self = this;
            self.grid = grid;
            self.options = extend(true, {}, ColumnReorder.fn.options);
            self._events(true);
            grid.headerTable.addClass("sui-reorderable");
        },

        options: {
            ns: ".shieldGridColumnReorder",
            returnDuration: 150,
            returnEasing: "ease-out",
            dragTreshold: 20,
            draggedTemplate: "<div class='sui-grid sui-grid-core'><div class='sui-gridheader'><table class='sui-table'><thead><tr class='sui-columnheader'><th class='sui-headercell'>{0}</th></tr></thead></table></div></div>"
        },

        _events: function (on) {
            var self = this,
                gridElement = self.grid.element;

            if (on) {
                self._downProxy = proxy(self._down, self);
                gridElement.on(MOUSEDOWN + self.options.ns, ".sui-headercell", self._downProxy);
            }
            else {
                gridElement.off(MOUSEDOWN + self.options.ns, ".sui-headercell", self._downProxy);
                self._downProxy = null;
            }
        },

        _down: function (e) {
            var self = this,
                // get the first element having that class, starting with the event's target
                // and traversing up in the dom through its ancestors (parents)
                target = $(e.target).closest(".sui-headercell"),
                offset = target.offset(),
                gridEl = self.grid.element,
                gridOffset = gridEl.offset(),
                ns = self.options.ns,
                x = e.pageX,
                y = e.pageY;

            // do not trigger for any button other than left button
            if (e.button > 1) {
                return;
            }

            $(doc)
                .on(MOUSEMOVE + ns, proxy(self._move, self))
                .on(MOUSEUP + ns, proxy(self._up, self));

            self.start = {
                left: x - offset.left,
                top: y - offset.top,
                x: x,
                y: y,
                target: target,
                // find the index of the target element, in the set of all header cells
                // in the parent row, skipping indent and other non sui-headercell cells
                index: target.parent().find(".sui-headercell").index(target),
                positions: self._positions(target),
                gridPosition: {
                    left: gridOffset.left,
                    top: gridOffset.top,
                    width: gridEl.outerWidth(),
                    height: gridEl.outerHeight()
                },
                isRtl: support.isRtl(gridEl)
            };

            shield.selection(false);

            return false;
        },

        _move: function (e) {
            var self = this,
                options = self.options,
                dragged = self.dragged,
                start = self.start,
                x = e.pageX,
                y = e.pageY,
                treshold = options.dragTreshold;

            if (!dragged) {
                if (abs(start.x - x) > treshold || abs(start.y - y) > treshold) {
                    self.dragged = $(shieldFormat(options.draggedTemplate, start.target.html()))
                        .css({
                            position: "absolute",
                            left: x - start.left,
                            top: y - start.top,
                            zIndex: 999
                        })
                        .find("table").css("width", "auto")
                        .end()
                        .find("th")
                        .attr("style", start.target[0].style.cssText)
                        .css({
                            width: start.target.width(),
                            height: start.target.height()
                        })
                        .end()
                        .appendTo(doc.body)
                }
            }
            else {
                dragged.css({
                    left: x - start.left,
                    top: y - start.top
                });

                self.hovered = self._index(x, y);

                self._indicator();
            }
        },

        _positions: function (target) {
            var items = target.parent().children(".sui-headercell"),
                i = 0,
                item,
                offset,
                pos = [];

            for (i; i < items.length; i++) {
                item = items.eq(i);
                offset = item.offset();

                pos.push({
                    left: offset.left,
                    top: offset.top,
                    width: item.outerWidth(),
                    height: item.outerHeight()
                });
            }

            return pos;
        },

        _index: function (x, y) {
            var start = this.start,
                gpos = start.gridPosition,
                pos,
                i,
                isOnHeader,
                isOnGrid;

            for (i = 0; i < start.positions.length; i++) {
                pos = start.positions[i];

                isOnHeader = pos.left <= x && x <= (pos.left + pos.width) && pos.top <= y && y <= (pos.top + pos.height);
                isOnGrid = gpos.left <= x && x <= (gpos.left + gpos.width) && gpos.top <= y && y <= (gpos.top + gpos.height);

                if (isOnHeader && isOnGrid) {
                    return i;
                }
            }

            return -1;
        },

        _indicator: function () {
            var self = this,
                start = self.start,
                index = self.hovered,
                position = start.positions[index],
                indicator = self.reorderIndicator,
                gridLeft = start.gridPosition.left,
                gridRight = start.gridPosition.left + start.gridPosition.width,
                items = start.target.parent().children(".sui-headercell"),
                oppositeEdgeCondition = start.isRtl ? (start.index < index) : (start.index > index),
                indicatorX;

            items.removeClass("sui-reorder-target");

            if (indicator) {
                indicator.hide();
            }

            if (index != null && index > -1) {
                items.eq(index).addClass("sui-reorder-target");

                if (!indicator) {
                    indicator = self.reorderIndicator = $("<div class='sui-grid-reorder-indicator'><span class='sui-grid-indicator-top' /><span class='sui-grid-indicator-bottom' /></div>")
                        .appendTo(doc.body);
                }

                if (index !== start.index) {
                    indicatorX = position.left + (oppositeEdgeCondition ? 0 : position.width);

                    indicator.css({
                        left: mathMin(mathMax(gridLeft, indicatorX), gridRight),
                        top: position.top,
                        height: position.height
                    }).show();
                }
            }
        },

        _up: function (e) {
            var self = this,
                options = self.options,
                grid = self.grid,
                dragged = self.dragged,
                start = self.start,
                newIndex = self.hovered,
                commandArgs;

            if (dragged) {
                dragged
                    .css({
                        left: start.x - start.left,
                        top: start.y - start.top,
                        transition: shieldFormat("left {0} {1}ms, top {0} {1}ms", options.returnEasing, options.returnDuration)
                    });

                if (newIndex != null && newIndex > -1) {
                    dragged.remove();

                    commandArgs = grid.trigger(COMMAND, { commandName: COLUMNREORDER, cancel: false, index: start.index, newIndex: newIndex });

                    if (!commandArgs.cancel) {
                        grid.reorderColumn(start.index, newIndex);
                    }
                }
                else {
                    //animate return
                    setTimeout(function () {
                        dragged.remove();
                    }, support.transitions ? options.returnDuration : 0);
                }
            }

            self.dragged = self.hovered = newIndex = null;

            self._indicator();

            if (self.reorderIndicator) {
                self.reorderIndicator.remove();
                self.reorderIndicator = null;
            }

            self.start = null;

            $(doc).off(options.ns);

            shield.selection(true);

            if (commandArgs && !commandArgs.cancel) {
                delete commandArgs.cancel;
                delete commandArgs.commandName;

                grid.trigger(COLUMNREORDER, commandArgs);
            }
        },

        destroy: function () {
            this._events(false);
            this.grid.headerTable.removeClass("sui-reorderable");
        }
    });


    // Grid class encapsulating the main grid logic
    var Grid = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            this.refresh();

            
        },

        // destructor
        destroy: function () {
            this._destroyInternal();
            Widget.fn.destroy.call(this);
        },

        _destroyInternal: function () {
            var self = this,
                options = self.options,
                i,
                key,
                el;

            //when the grid is never initialized, there's nothing to destroy
            if (!self.contentWrapper) {
                return;
            }

            if (self._markedCells) {
                for (key in self._markedCells) {
                    if (self._markedCells.hasOwnProperty(key)) {
                        self._markedCells[key].length = 0;
                    }
                }
                self._markedCells = null;
            }

            $(win).off(RESIZE + self._rsNS);
            self._resize = self._rsNS = null;

            if (self.sorting) {
                self.sorting.destroy();
                self.sorting = null;
            }

            if (self.virtualizedContainer) {
                self.virtualizedContainer.destroy();
                self.virtualizedContainer = null;
            }

            for (i = 0; i < self.columns; i++) {
                self.columns[i].destroy();
            }

            if (self.contentWrapper) {
                self.contentWrapper.off(SCROLL, self._hScrollHandler);
            }

            self._hScrollHandler =
                self.scrollableWrapper = null;

            if (self._selectable) {
                self._selectable.destroy();
                self._selectable = null;
            }

            if (self.options.scrolling) {
                self.contentWrapper.parent().remove();
                self.headerWrapper.parent().remove();
            }
            else {
                self.contentWrapper.remove();
                self.headerWrapper.remove();
            }

            if (self._hasDetailTemplate()) {
                self.contentTable
                    .off(CLICK, ".sui-expand-cell", self._toggleDetailTemplateHandler)
                    .off(CLICK, ".sui-collapse-cell", self._toggleDetailTemplateHandler);
                self._toggleDetailTemplateHandler = null;
            }

            self.columns =
                self.contentWrapper =
                self.headerWrapper =
                self.contentTable =
                self.hederTable = null;

            if (self._buttons) {
                for (i = 0; i < self._buttons.length; i++) {
                    el = self._buttons[i].button.element;
                    self._buttons[i].button.destroy();
                    el.remove();
                }
                self._buttons.length = 0;
            }

            if (self.pager) {
                self.pager.destroy();
                self.pager = null;

                if (self.pagerWrapper) {
                    self.pagerWrapper.parent().remove();
                    self.pagerWrapper = null;
                }
            }

            if (self.loadingPanel) {
                self.loadingPanel = null;
                clearTimeout(self.loadingPanelTimeout);
                self.loadingPanelTimeout = null;
            }

            if (self._columnResizing) {
                self._columnResizing.destroy();
                self._columnResizing = null;
            }

            if (self._toolbar) {
                self._toolbar.destroy();
                self._toolbar = null;
            }

            if (self._editing) {
                self._editing.destroy();
                self._editing = null;
            }

            if (self._columnReorder) {
                self._columnReorder.destroy();
                self._columnReorder = null;
            }

            self._sortingInProgress =
                self._scrollLeft =
                self._scrollTop =
                self._populateInsertedItem =
                self._preventClosingEditors =
                self._editingInProcess = null;

            if (self._filter) {
                self._filter.destroy();
                self._filter = null;
            }

            if (self._groupReorder) {
                self._groupReorder.destroy();
                self._groupReorder = null;
            }

            if (self._columnGroupReorder) {
                self._columnGroupReorder.destroy();
                self._columnGroupReorder = null;
            }

            // destroy the dataSource last
            self.dataSource.off(CHANGE, self._dsChange);
            self.dataSource.off(START, self._dsStart);
            self._dsChange =
                self._dsStart =
                self.dataSource = null;

            self.element
                .removeClass("sui-grid sui-grid-core")
                .css(HEIGHT, "")
                .empty();
        },

        

        _resizeHandler: function () {
            if (this.options.scrolling) {
                this._scrolling();
            }
        },

        _hasDetailTemplate: function () {
            var options = this.options;
            return options.detailTemplate || (options.events && options.events.detailCreated);
        },

        _hasVirtualScrolling: function () {
            var options = this.options;
            return options.scrolling && options.scrolling.virtual && !options.paging && !this._hasDetailTemplate();
        },

        _canExpandCollapse: function () {
            return this.options.detailExpandCollapse !== false;
        },

        _resolveColumns: function (columns) {
            var gridColumns = this.columns = [];

            if (is.array(columns)) {
                each(columns, function (index, item) {
                    gridColumns.push(new Column(item));
                });
            }
            else {
                // error when columns are not array
                shield.error("Invalid columns declaration. The columns have to be array.", this.options.dieOnError);
            }
        },

        _createWrappers: function () {
            var self = this,
                element = self.element;

            self._wrapper();

            var contentWrapper = $("<div />").prependTo(element);
            contentWrapper.addClass("sui-gridcontent");

            var headerWrapper = $("<div />").prependTo(element);
            headerWrapper.addClass("sui-gridheader");

            if (!self.options.showHeader) {
                headerWrapper.css("display", "none");
                contentWrapper.addClass("sui-no-header");
            }
            self.headerWrapper = headerWrapper;
            self.contentWrapper = contentWrapper;
        },

        _wrapper: function () {
            var height = this.options.height,
                element = this.element;

            if (!element.is("div")) {
                element = element.wrap("<div/>").parent();
            }

            element.addClass("sui-grid sui-grid-core");

            if (element) {
                element.css(HEIGHT, height);
            }
        },

        _createGroupPanel: function () {
            var self = this,
                groupHeaderElement,
                group,
                groupPanel,
                shouldAttachGroupreordering = false,
                dataSource = self.dataSource;

            groupPanel = self.element.find(".sui-group-panel");
            if (groupPanel.length > 0) {
                groupPanel.remove();
            }

            if (self.options.grouping.showGroupHeader) {
                if (!dataSource.group ||
                    dataSource.group.length === 0) {
                    (self.element).prepend($("<div class='sui-group-panel sui-group-panel-empty' >" + self.options.grouping.message + "</div>"));
                }
                else {
                    groupHeaderElement = $("<div class='sui-group-panel' />");
                    (self.element).prepend(groupHeaderElement);
                    for (var i = 0; i < dataSource.group.length; i++) {
                        group = dataSource.group[i];
                        self._createGroupHeaderIndicator(group, groupHeaderElement);
                        shouldAttachGroupreordering = true;
                    }

                    if (shouldAttachGroupreordering && self.options.grouping.allowDragToGroup) {
                        if (self._groupReorder) {
                            self._groupReorder.destroy();
                        }
                        self._groupReorder = new GroupReorder(self);

                        if (self._columnGroupReorder) {
                            self._columnGroupReorder.destroy();
                        }
                        self._columnGroupReorder = new ColumnGroupReorder(self);
                    }
                }
            }
        },

        _createGroupHeaderIndicator: function (group, groupHeaderElement) {
            var self = this,
                closeButton,
                sortButton,
                indicator;

            indicator = $("<div class='sui-group-panel-indicator' data-field=\"" + group.field + "\" />").appendTo(groupHeaderElement);

            if (group.order == "desc") {
                sortButton = $("<span class='sui-descending'>&#9660;</span>").appendTo(indicator);
            }
            else {
                sortButton = $("<span class='sui-ascending'>&#9650;</span>").appendTo(indicator);
            }

            $("<span class='sui-group-title'>" + group.field + "</span>").appendTo(indicator);
            if (self.options.grouping.allowDragToGroup) {
                closeButton = $("<span class='sui-group-close-button'>&#10006;</span>").appendTo(indicator);
                closeButton.on(CLICK, self._closeButtonClicked = proxy(self._closeButtonClickedHandler, self));
            }
            sortButton.on(CLICK, self._sortButtonClicked = proxy(self._sortButtonClickedHandler, self));
        },

        _sortButtonClickedHandler: function (e) {
            var self = this,
                target = $(e.currentTarget),
                field = target.parent().attr("data-field"),
                groups = self.dataSource.group;

            for (var i = 0; i < groups.length; i++) {
                if (groups[i].field == field) {
                    if (target.hasClass("sui-descending")) {
                        groups[i].order = "asc";
                    }
                    else {
                        groups[i].order = "desc";
                    }
                    self.dataSource.read();
                }
            }
        },

        _closeButtonClickedHandler: function (e) {
            var self = this,
                target = $(e.currentTarget),
                commandArgs,
                field = target.parent().attr("data-field");

            if (self.dataSource.group) {
                commandArgs = self.trigger(COMMAND, { commandName: UNGROUP, cancel: false, field: field });

                if (!commandArgs.cancel) {
                    self.ungroup(field);
                    self.trigger(UNGROUP, commandArgs);
                }
            }
        },

        _createHeaderTable: function () {
            var self = this,
                headerWrapper = self.headerWrapper,
                table = self.element;

            // when the grid is not initialized from table
            if (!table.is("table")) {
                table = headerWrapper.children("table");

                if (!table.length) {
                    table = $("<table />").appendTo(headerWrapper);
                }
            }

            if (isIE7) {
                table.attr("cellspacing", 0);
            }

            table.addClass("sui-table");

            self.headerTable = table;

            self._createTbody(table, true);
            self._createThead(table, true);
            self._createFakeRow(table, self.columns.length);
        },

        _createContentTable: function () {
            var self = this,
                options = self.options,
                contentWrapper = self.contentWrapper,
                table = self.element;

            // when the grid is not initialized from table
            if (!table.is("table")) {
                table = contentWrapper.children("table");

                if (!table.length) {
                    table = $("<table />").appendTo(contentWrapper);
                }
            }

            if (isIE7) {
                table.attr("cellspacing", 0);
            }

            table.addClass("sui-table");

            if (options.rowHover) {
                table.addClass("sui-hover");
            }

            if (self._hasDetailTemplate()) {
                if (self._canExpandCollapse()) {
                    table.addClass("sui-expandable");
                }
                table.on(CLICK, ".sui-expand-cell", self._toggleDetailTemplateHandler = proxy(self._expandCollapseDetailTemplate, self));
                table.on(CLICK, ".sui-collapse-cell", self._toggleDetailTemplateHandler);
            }

            self.contentTable = table;

            self._createTbody(self.contentTable, false);
        },

        _createTbody: function (table, isHeader) {
            var tbody = table.find(">tbody");

            if (!tbody.length) {
                tbody = $("<tbody/>").appendTo(table);
            }

            if (isHeader) {
                tbody.addClass("sui-hide");
            }

            table.tbody = tbody;
        },

        _createThead: function (table) {
            var self = this,
                options = self.options,
                columns = self.columns,
                idx,
                length,
                html = "",
                thead = table.find(">thead"),
                tr,
                text,
                th;

            if (!thead.length) {
                thead = $("<thead/>").insertBefore(table.tbody);
            }

            tr = table.find("tr:has(th):first");

            if (!tr.length) {
                tr = thead.children().first();
                if (!tr.length) {
                    tr = $("<tr/>");
                }
            }

            if (!tr.children().length) {
                for (idx = 0, length = columns.length; idx < length; idx++) {
                    th = columns[idx];
                    text = th.headerTemplate || th.title || th.field || th;
                    html += "<th " + normalizeAttributes(th.headerAttributes) + " data-field=\"" + columns[idx].field+ "\">" + text + "</th>";
                }

                tr.html(html);
            }

            tr.addClass("sui-columnheader");
            tr.find("th").addClass("sui-headercell");

            // Add indent cell when there is detail template.
            if (columns.length && self._hasDetailTemplate() && self._canExpandCollapse()) {
                var indentCell = $('<th class="sui-indent-cell" />');
                if (isIE7) {
                    indentCell.html("&nbsp;");
                }
                indentCell.prependTo(tr);
            }

            tr.appendTo(thead);

            table.thead = thead;
        },

        _createFakeRow: function (table, count) {
            var tbody = table.find(">tbody");
            if (tbody.length) {
                var fakeRow = $("<tr/>");
                for (var i = 0; i < count; i++) {
                    $("<td/>").appendTo(fakeRow);
                }

                fakeRow.appendTo(tbody);
            }
        },

        _createColgroup: function (table) {
            var self = this,
                options = self.options,
                columns = self.columns,
                colgroup = table.find(">colgroup"),
                i,
                len,
                width;

            if (!colgroup.length) {
                colgroup = $("<colgroup/>").prependTo(table);
            }

            colgroup.html("");
            // Add indent cell when there is detail template.
            if (options.columns.length && self._hasDetailTemplate() && self._canExpandCollapse()) {
                $("<col class='sui-indent-col'/>").appendTo(colgroup);
            }

            for (i = 0, len = columns.length; i < len; i++) {
                width = columns[i].width;

                $(
                    width && parseInt(width, 10) !== 0 ?
                        shieldFormat('<col style="width:{0}"/>', isString(width) ? width : width + "px") :
                        "<col />"
                ).appendTo(colgroup);
            }
        },

        _scrolling: function () {
            var self = this,
                element = self.element,
                dataSource = self.dataSource,
                virtual = self._hasVirtualScrolling(),
                headerWrapper = self.headerWrapper,
                contentWrapper = self.contentWrapper,
                headerHeight = headerWrapper.outerHeight(),
                wrapperHeight,
                scrollableWrapper,
                row,
                rowHeight;

            //do not over-initialize, if the scrolling containers have already been created
            if (!headerWrapper.parent().hasClass("sui-gridheader sui-scrolldiv")) {
                headerWrapper.addClass("sui-headercontent").removeClass("sui-gridheader");
                headerWrapper.wrap("<div class='sui-gridheader sui-scrolldiv'></div>");

                contentWrapper.addClass("sui-content").removeClass("sui-gridcontent");
                contentWrapper.wrap("<div class='sui-gridcontent sui-scroller'></div>");

                if (isIE7) {
                    self.headerTable.addClass("sui-table-ie7").removeClass("sui-table");
                    self.contentTable.addClass("sui-table-ie7").removeClass("sui-table");
                }

                $(self.element).find(".sui-scrolldiv").css((support.isRtl(element) ? "padding-left" : "padding-right"), support.scrollbar() - 1);

                scrollableWrapper = self.scrollableWrapper = virtual ? contentWrapper.parent() : contentWrapper;

                scrollableWrapper.on(SCROLL, self._hScrollHandler = proxy(self._hscroll, self));
            }
            else {
                headerHeight = headerWrapper.parent().outerHeight();
            }

            wrapperHeight = element.innerHeight() - headerHeight;

            if (self.pagerWrapper) {
                wrapperHeight -= self.pagerWrapper.outerHeight();
            }

            if (self._toolbar) {
                var toolbars = self.element.find(".sui-toolbar"),
                    sum = 0,
                    i;

                for (i = 0; i < toolbars.length; i++) {
                    sum += $(toolbars[0]).outerHeight();
                }

                // + 1 because the toolbar has a border
                wrapperHeight -= sum + 1;
            }

            var groupPanel = self.element.find(".sui-group-panel");
            if (groupPanel.length > 0) {
                wrapperHeight -= groupPanel.outerHeight();
            }
            //create a jQuery selector with both the contentWrapper and its parent            
            $(contentWrapper).add(contentWrapper.parent()).css({
                height: wrapperHeight,
                width: '100%'
            });

            if (virtual && dataSource.view && dataSource.view.length) {
                if (self.virtualizedContainer) {
                    // NOTE: update the value of total at the virtualizedContainer side,
                    // so that it updates the height of the virtualized and set proper scrolls
                    self.virtualizedContainer.options.total = dataSource.total;

                    self.virtualizedContainer.render();
                }
                else {
                    // construct and append the first row to the table body, 
                    // so that we can take its height, and finally remove it
                    var dataItem = self.dataSource.view[0];
                    row = self._renderRow(0, self.contentTable.tbody, dataItem);
                    rowHeight = row.outerHeight();
                    row.remove();

                    // construct the virtualized container object
                    self.virtualizedContainer = new shield.ui.VirtualizedContainer(scrollableWrapper, {
                        itemHeight: rowHeight,
                        total: dataSource.total,
                        createContainer: function (wrapper) {
                            return wrapper
                                .addClass("sui-content")
                                .append(self.contentTable)
                                .find("tbody")
                                .empty();
                        },
                        getItems: proxy(self._loadVirtualRows, self),
                        // do not call render in the constructor, 
                        // we need to delay it in order to access the virtualizedContainer instance
                        // from the getItems handler
                        skipRender: true
                    });

                    // NOTE: call render()
                    self.virtualizedContainer.render();
                }

                self.contentWrapper = self.virtualizedContainer.element.children().eq(0);
            }
            else {
                // Fix for space under last row when there is only vertical scroll.
                if (isIE && !isIE7 && !isIE8) {
                    var el = contentWrapper.get(0);
                    if (el.scrollWidth <= el.clientWidth) {
                        contentWrapper.css(HEIGHT, wrapperHeight + 1);
                    }
                }
            }
        },

        _loadVirtualRows: function (start, end, done) {
            var self = this,
                dataSource = self.dataSource,
                skip = dataSource.skip != null ? dataSource.skip : 0,
                take = dataSource.take != null ? dataSource.take : dataSource.view.length,
                i,
                wait = 100,
                virtualizedContainerElement = self.virtualizedContainer.container;
            
            if (!self._sortingInProgress && dataSource.remote && (start < skip || end > (skip + take))) {
                clearTimeout(self._loadWaitTimeout);

                self._loadWaitTimeout = setTimeout((function (start, end, done) {
                    return function () {
                        self._loadWaitTimeout = null;

                        dataSource.skip = start;
                        dataSource.take = end - start;

                        self._loadingVirtualRows = true;

                        dataSource.read().then(function () {
                            if (self._loadWaitTimeout) {
                                // another timeout callback was registered
                                return;
                            }

                            // in order to make code render cells first, we are doing what the VirtualizedContainer._renderItems() does
                            // and passing params to it not to do anything but just call the done() handler
                            virtualizedContainerElement.empty();

                            for (i = start; i < end && i < dataSource.total; i++) {
                                var dataItem = self.dataSource.view[i - start];
                                self._renderRow(i - start, virtualizedContainerElement, dataItem);
                            }

                            // as widget-level events fire after the promise callbacks, and as we need the value 
                            // of _loadingVirtualRows in the widget-level CHANGE handler (_renderData), we register
                            // a one-time CHANGE event handler that will clear the property AFTER _renderData
                            dataSource.one(CHANGE, function () {
                                if (!self._loadWaitTimeout) {
                                    self._loadingVirtualRows = false;
                                }
                            });

                            self.loading(false);

                            done([], false);
                        });
                    }
                })(start, end, done), wait);
            }
            else {
                // in order to make code render cells first, we are doing what the VirtualizedContainer._renderItems() does
                // and passing params to it not to do anything but just call the done() handler
                virtualizedContainerElement.empty();

                for (i = start; i < end && i < dataSource.total; i++) {
                    var dataItem = self.dataSource.view[i];
                    self._renderRow(i, virtualizedContainerElement, dataItem);
                }

                done([], false);
            }

            // Check if the vertical scroll is shown and remove the top right gap if the scroll is hidden.
            self._checkIfVerticalScroll();
        },

        _checkIfVerticalScroll: function () {
            var self = this,
                scrolledDiv = self.element.find(".sui-virtualized").get(0),
                parentDiv = self.element.get(0),
                hasVerticalScrollbar = scrolledDiv.scrollHeight > parentDiv.scrollHeight;

            if (hasVerticalScrollbar) {
                self.headerWrapper.parent().css("padding-right", "16px");
                self.headerWrapper.removeClass("sui-grid-no-gap");
            }
            else {
                self.headerWrapper.parent().css("padding-right", "0px");
                self.headerWrapper.addClass("sui-grid-no-gap");
            }
        },

        _hscroll: function (e) {
            var self = this,
                scrollableWrapper = self.scrollableWrapper,
                scrollableElement = scrollableWrapper.get(0),
                headerWrapper = self.headerWrapper,
                contentScrollLeft = scrollableWrapper.scrollLeft(),
                headerScrollLeft = headerWrapper.scrollLeft();

            // Bug in Chrome: https://code.google.com/p/chromium/issues/detail?id=81344
            if (support.isRtl(self.element) &&
                isWebKit && scrollableElement.clientHeight < scrollableElement.scrollHeight) {
                contentScrollLeft = contentScrollLeft + (scrollableElement.offsetWidth - scrollableElement.clientWidth);
            }

            if (contentScrollLeft != headerScrollLeft) {
                headerWrapper.scrollLeft(contentScrollLeft);
            }
        },

        _sorting: function () {
            var self = this,
                sorting = self.options.sorting,
                element = self.element;

            if (sorting && self.columns.length) {
                self.sorting = new Sorting(sorting, self);
            }
        },

        _renderData: function () {
            var self = this,
                data = self.dataSource.view,
                options = self.options,
                scrolling = options.scrolling,
                altRows = isUndefined(options.altRows) ? true : options.altRows,
                rowTemplate = options.rowTemplate,
                altRowTemplate = options.altRowTemplate,
                contentTable = self.contentTable,
                fields,
                evt;

            if (self._loadingVirtualRows) {
                return;
            }

            evt = self.trigger(COMMAND, {commandName: DATABOUND, cancel: false});
            if (evt.cancel) {
                return;
            }

            if (self._sortingInProgress) {
                self._updateGrid();
            }
            else {
                if (!self.columns.length) {
                    fields = [];

                    if (data.length) {
                        each(data[0], function (i, n) {
                            fields.push(i);
                        });
                    }

                    options.columns = fields;
                    self._resolveColumns(fields);
                    self._createThead(self.headerTable, true);
                }

                self._createColgroup(self.headerTable);
            }

            self._createColgroup(self.contentTable);

            // this function is called on a DS.change event, so we can assume sorting is done 
            // so set _sortingInProgress to FALSE in order for the _renderRows() function
            // to work properly in both virtualized and normal mode
            self._sortingInProgress = false;

            self._renderRows();
            self._renderFooter();

            

            self.loading(false);

            

            self.trigger(DATABOUND);

            
        },

        _renderRows: function () {
            var self = this,
                options = self.options,
                dataSource = self.dataSource,
                data = dataSource.view,
                i,
                groups,
                contentTable = self.contentTable;

            // used in editing to keep all updated cells indexes. Used when markers are rendered into each cell.
            if (self._markedCells) {
                for (var key in self._markedCells) {
                    if (self._markedCells.hasOwnProperty(key)) {
                        self._markedCells[key].length = 0;
                    }
                }
                self._markedCells = null;
            }

            contentTable.tbody.empty();

            if (!data || !data.length) {
                if (isUndefined(options.noRecordsTemplate)) {
                    $("<tr><td colspan='" + self.columns.length + "'>" + (options.noRecordsText || "No records to display") + "</td></tr>").appendTo(contentTable.tbody);
                }
                else {
                    $("<td></td>").append(options.noRecordsTemplate).wrap("<tr></tr>").parent().appendTo(contentTable.tbody);
                }

                return;
            }

            //for regular scrolling or no-scrolling, render items in the usual way
            if (!self._hasVirtualScrolling() || self._sortingInProgress) {
                groups = dataSource.group;

                if (groups && groups.length > 0) {
                    var count = 0;
                    self._renderGroupedData(data, count, 0);
                    self.headerTable.find(">colgroup").find(".sui-indent-col").remove();
                    self.headerTable.thead.find(".sui-columnheader > .sui-indent-cell").remove();
                    for (i = 0; i < groups.length; i++) {

                        $("<col class='sui-indent-col'/>").prependTo(self.headerTable.find(">colgroup"));
                        $("<col class='sui-indent-col'/>").prependTo(self.contentTable.find(">colgroup"));

                        $("<th class='sui-indent-cell'/>").prependTo(self.headerTable.thead.find(".sui-columnheader"));
                    }
                    self._addAllIntendCells();
                    self.contentTable.addClass("sui-grouped-table");
                }
                else {
                    self._renderRowsAndDetails(data);
                }
            }

            self._createGroupPanel();

            if (options.scrolling && !self._sortingInProgress) {
                self._scrolling();
            }
        },

        _addAllIntendCells: function () {
            var self = this,
                j,
                rows = self.contentTable.get(0).rows;

            for (var i = 0; i < rows.length; i++) {
                var row = $(rows[i]);
                var groupLevel = parseInt(row.attr("data-group-level"), 10);

                if (row.hasClass("sui-group-header")) {
                    if (groupLevel > 1) {
                        for (j = 0; j < groupLevel - 1; j++) {
                            $("<td class='sui-indent-cell'/>").prependTo(row);
                        }
                    }
                }
                else {
                    for (j = 0; j < groupLevel; j++) {
                        $("<td class='sui-indent-cell sui-group-intend-cell'/>").prependTo(row);
                    }
                }
            }
        },

        _renderGroupedData: function (data, count, level) {
            var self = this;

            // if the row has detail template it needs to be expanded by default and it needs to be non collapsible(otherwise the expand/collapse will conflict with groups expand collapse)
            self.options.detailExpandCollapse = false;
            for (var i = 0; i < data.length; i++) {
                var item = data[i];

                if (item.hasOwnProperty("field") && item.hasOwnProperty("items") && item.hasOwnProperty("value") && item.hasOwnProperty("order")) {
                    level++;
                    self._renderGroupHeader(item, level);
                    self._renderGroupedData(item.items, count, level);
                    self._renderGroupAggregates(item);
                    level--;
                }
                else {
                    self._renderDataItem(item, count, level);
                    count++;
                }
            }
        },

        _renderGroupAggregates: function (item) {
            if (item.aggregate) {
                var self = this,
                columns = self.columns,
                footerRow,
                groupFooterTemplate,
                dataItem = {},
                field,
                isNull = is["null"],
                i,
                aggregates = item.aggregate,
                cell;
                for (i = 0; i < columns.length; i++) {
                    groupFooterTemplate = columns[i].groupFooterTemplate;
                    if (groupFooterTemplate) {
                        footerRow = $("<tr class='sui-group-footer' />").appendTo(self.contentTable.tbody);
                        break;
                    }
                }
                if (footerRow) {
                    for (i = 0; i < columns.length; i++) {
                        cell = $("<td class='sui-group-footer-cell' />").appendTo(footerRow);
                        groupFooterTemplate = columns[i].groupFooterTemplate;
                        if (groupFooterTemplate) {
                            field = columns[i].field;

                            for (var j = 0; j < aggregates.length; j++) {
                                if (aggregates[j].field == field) {
                                    if (isFunc(aggregates[j].aggregate)) {
                                        dataItem.custom = aggregates[j].value;
                                    }
                                    else {
                                        dataItem[aggregates[j].aggregate] = aggregates[j].value;
                                    }
                                }
                            }
                            if (isFunc(groupFooterTemplate)) {
                                var value = groupFooterTemplate.call(self, cell, dataItem);
                                if (isDefined(value) && !isNull(value) && value !== "") {
                                    cell.html(value);
                                }
                            }
                            else {
                                // groupFooterTemplate is a string - format it using the shield format
                                cell.html(shieldFormat.call(self, groupFooterTemplate, dataItem));
                            }
                        }
                    }
                    var indentCells = self.dataSource.group.length;
                    for (i = 0; i < indentCells; i++) {
                        footerRow.prepend($("<td class='sui-indent-cell' />"));
                    }
                }
            }
        },

        _renderGroupHeader: function (item, level) {
            var self = this,
               contentTable = self.contentTable;

            var colspan = self.columns.length + self.dataSource.group.length - level + 1;
            var groupRow = $("<tr class='sui-group-header' data-group-level='" + level + "' />").appendTo(contentTable);
            var groupCell = $("<td class='sui-group-header-cell' colspan='" + colspan + "' />").appendTo(groupRow);
            var expandCollapseSpan = $("<span class='sui-collapse'>&#9662;</span>").appendTo(groupCell);
            $("<span class='sui-group-header-text'>" + item.field + ": " + item.value + "</span>").appendTo(groupCell);

            expandCollapseSpan.on(CLICK, self._expandCollapse = proxy(self._expandCollapseHandler, self));
        },

        _expandCollapseHandler: function (e) {
            var self = this,
                args,
                span = $(e.currentTarget),
                row = span.parent().parent();

            if (span.hasClass("sui-collapse")) {
                args = self.trigger(COMMAND, { commandName: COLLAPSE, cancel: false, row: row });
                if (!args.cancel) {
                    self.collapseGroup(row);
                    span.html("&#9656;");
                    span.removeClass("sui-collapse").addClass("sui-expand");
                    self.trigger(COLLAPSE, { row: row });
                }
            }
            else {
                args = self.trigger(COMMAND, { commandName: EXPAND, cancel: false, row: row });
                if (!args.cancel) {
                    self.expandGroup(row);
                    span.html("&#9662;");
                    span.removeClass("sui-expand").addClass("sui-collapse");
                    self.trigger(EXPAND, { row: row });
                }
            }
        },

        _renderDataItem: function (item, index, level) {
            var self = this,
               contentTable = self.contentTable;

            self._renderRow(index, contentTable, item).attr("data-group-level", level);
        },

        _renderRowsAndDetails: function (data) {
            var self = this,
                contentTable = self.contentTable,
                len,
                i;

            for (i = 0, len = data.length; i < len; i++) {
                var dataItem = self.dataSource.view[i];
                // render a row and append it to the table body
                self._renderRow(i, contentTable.tbody, dataItem);

                if (self._hasDetailTemplate() && !self._canExpandCollapse()) {
                    self._addDetailTemplate(data[i]);
                }
            }
        },

        // render a row, optionally appending it to a target;
        // returns the row
        _renderRow: function (index, target, dataItem) {
            var self = this,
                targetDefined = isDefined(target),
                isNull = is["null"],
                options = self.options,
                altRows = isUndefined(options.altRows) ? true : options.altRows,
                rowTemplate = altRows && (index % 2) && options.altRowTemplate ? options.altRowTemplate : options.rowTemplate,
                columns = self.columns,
                expandCell,
                row,
                args,
                i;

            if (rowTemplate) {
                // if row template is a string, trim it
                if (isString(rowTemplate)) {
                    rowTemplate = rowTemplate.replace(/^\s+/, '').replace(/\s+$/, '');
                }

                // render the row with the template
                row = $(shieldFormat(rowTemplate, dataItem));

                // if target is defined, append the row to it right after being created
                if (targetDefined) {
                    target.append(row);
                }
            }
            else {
                row = $("<tr class='" + ((altRows && (index % 2)) ? "sui-alt-row" : "sui-row") + "'/>");

                if (arguments.length > 3) {
                    // in edit mode we pass additional parameter which is the row index
                    var rowIndexInTable = arguments[3],
                        allRows = target.find("tr"),
                        nextRow = allRows.eq(rowIndexInTable);

                    if (allRows.length == rowIndexInTable) {
                        target.append(row);
                    }
                    else {
                        row.insertBefore(nextRow);
                    }
                }
                else if (targetDefined) {
                    // if target is defined, append the row to it right after being created
                    target.append(row);
                }

                // render the row cells
                for (i = 0; i < columns.length; i++) {
                    var column = columns[i],
                        columnTemplate = column.columnTemplate,
                        columnFormat = column.format,
                        columnField = column.field,
                        buttons = column.buttons,
                        value,
                        cell = $("<td " + normalizeAttributes(column.attributes) + " class='sui-cell' />").appendTo(row),
                        z;

                    if (buttons) {
                        for (z = 0; z < buttons.length; z++) {
                            self._buildButton(buttons[z], cell, row.get(0).rowIndex);
                        }
                    }
                    else if (columnTemplate) {
                        // if columnTemplate is defined (string or function) - use it for the cell value, 
                        // otherwise use the format string or function.
                        // if neither is defined, use the raw field 
                        if (isFunc(columnTemplate)) {
                            // columnTemplate is a function - execute it passing the container and the dataItem;
                            // if the result is not null, undefined or an empty string, add it as a value
                            value = columnTemplate.call(self, cell, dataItem, index);
                            if (isDefined(value) && !isNull(value) && value !== "") {
                                cell.html(value);
                            }
                        }
                        else {
                            // columnTemplate is a string - format it using the shield format
                            cell.html(shieldFormat.call(self, columnTemplate, dataItem));
                        }
                    }
                    else if (columnFormat) {
                        // column.format is present
                        cell.html(shieldFormat.call(self, columnFormat, columnField ? get(dataItem, columnField) : dataItem));
                    }
                    else {
                        cell.html("" + get(dataItem, columnField));
                    }
                }
            }

            // prepend an expand cell if needed
            if (self._hasDetailTemplate() && self._canExpandCollapse()) {
                args = self.trigger(COMMAND, { commandName: EXPANDBUTTONCREATE, cancel: false, item: dataItem });
                if (!args.cancel) {
                    expandCell = $("<td class='sui-cell sui-expand-cell' />");
                    self._setExpandCollapseCellText(expandCell, options.detailExpandText, options.detailCollapseText);
                }
                else {
                    expandCell = $("<td class='sui-cell sui-expand-cell-disabled' />");
                }
                expandCell.prependTo(row);
            }

            return row;
        },

        _renderFooter: function () {
            var self = this,
                columns = self.columns,
                footerRow,
                footerTemplate,
                dataItem = {},
                field,
                i,
                isNull = is["null"],
                aggregates = self.dataSource.aggregates,
                cell;
            for (i = 0; i < columns.length; i++) {
                footerTemplate = columns[i].footerTemplate;
                if (footerTemplate) {
                    footerRow = $("<tr class='sui-grid-footer' />").appendTo(self.contentTable.tbody);
                    break;
                }
            }

            if (footerRow) {
                for (i = 0; i < columns.length; i++) {
                    cell = $("<td class='sui-footer-cell' />").appendTo(footerRow);
                    footerTemplate = columns[i].footerTemplate;
                    if (footerTemplate) {
                        field = columns[i].field;
                        for (var j = 0; j < aggregates.length; j++) {
                            if (aggregates[j].field == field) {
                                if (isFunc(aggregates[j].aggregate)) {
                                    dataItem.custom = aggregates[j].value;
                                }
                                else {
                                    dataItem[aggregates[j].aggregate] = aggregates[j].value;
                                }
                            }
                        }
                        if (isFunc(footerTemplate)) {
                            var value = footerTemplate.call(self, cell, dataItem);
                            if (isDefined(value) && !isNull(value) && value !== "") {
                                cell.html(value);
                            }
                        }
                        else {
                            // footerTemplate is a string - format it using the shield format
                            cell.html(shieldFormat.call(self, footerTemplate, dataItem));
                        }
                    }
                }

                var previousRow = footerRow.prev();
                if (previousRow.find(".sui-expand-cell").length > 0 ||
                    previousRow.find(".sui-expand-cell-disabled").length > 0 ||
                    previousRow.find(".sui-indent-cell").length > 0 ||
                    previousRow.find(".sui-collapse-cell").length > 0) {

                    footerRow.prepend($("<td />"));
                }
            }
        },

        _buildButton: function (buttonOptions, cell, rowIndex) {
            var self = this,
                commandName = buttonOptions.commandName,
                commandHandler = buttonOptions.click,
                btn;

            if (shield.ui.Button) {
                var wrapperButton = $("<button type='button'>" + buttonOptions.caption + "</button>")
                    .appendTo(cell);

                cell.addClass("sui-button-cell")
                // override the command handler if a commandName is set
                if (commandName === "delete") {
                    commandHandler = self._deleteButtonClicked;
                    if (isUndefined(buttonOptions.cls)) {
                        buttonOptions.cls = "sui-delete";
                    }
                    else {
                        buttonOptions.cls += " sui-delete";
                    }
                }
                else if (commandName === "edit") {
                    if (self._editing) {
                        self._editing.type = "row";
                    }
                    self._preventClosingEditors = true;
                    commandHandler = self._editButtonClicked;
                    if (isUndefined(buttonOptions.cls)) {
                        buttonOptions.cls = "sui-edit";
                    }
                    else {
                        buttonOptions.cls += " sui-edit";
                    }
                }

                // build the button with the given options
                btn = new shield.ui.Button(wrapperButton, {
                    cls: buttonOptions.cls,
                    events: {
                        click: proxy(commandHandler, self, rowIndex, cell)
                    }
                });

                if (commandName == "delete" || commandName == "edit") {
                    if (!self._buttons) {
                        self._buttons = [];
                    }

                    self._buttons.push({ index: rowIndex, button: btn });
                }
            }
        },

        // handle the click event of delete button
        _deleteButtonClicked: function (index, cell) {
            var self = this,
                ds = self.dataSource,
                confirm = self.options.editing ? self.options.editing.confirmation : null,
                args = self.trigger(COMMAND, { commandName: DELETE, cancel: false, rowIndex: index });//,
            //pager = self.pager,
            //deleteItemIndex = pager ? pager.pageSize() * (pager.currentPage - 1) + index : index;

            if (!args.cancel) {
                if (confirm && confirm["delete"] && confirm["delete"].enabled) {
                    if (!win.confirm(shieldFormat(confirm["delete"].template, ds.view[index]))) {
                        return;
                    }
                }

                // if here - confirm was ok or no confirmation was needed
                ds.removeAtView(index);
                if (self.options.editing && !self.options.editing.batch) {
                    // call save, passing false to suppress triggering the change event
                    ds.save(false);
                }
                self.trigger(DELETE, { rowIndex: index });
            }
        },

        // handle the click event of edit button
        _editButtonClicked: function (index, cell) {
            var self = this,
                editing = self._editing,
                ds = self.dataSource,
                buttons = null,
                args = self.trigger(COMMAND, { commandName: EDIT, cancel: false, row: $(cell).parent(), cell: cell });

            self._editingInProcess = true;

            if (!args.cancel) {
                if (ds.tracker && ds.tracker.changes && ds.tracker.changes.added && ds.tracker.changes.added.length > 0) {
                    ds.cancel();
                }
                else {
                    self._closeAllEditedRows();

                    if (editing && editing.options.enabled) {
                        self._editing._putRowInEditMode($(self.contentTable.find("tbody > tr")[index]));
                    }

                    self._changeEditColumnButtons(index, cell);
                }

                self.trigger(EDIT, { row: $(cell).parent(), cell: cell });
            }
        },

        _changeEditColumnButtons: function (index, cell) {
            var self = this;

            self._removeButtons(cell, index);

            // create update button
            self._buildButton({ caption: "Update", click: self._updateButtonClicked }, cell, index);

            // create cancel button
            self._buildButton({ caption: "Cancel", click: self._cancelButtonClicked }, cell, index);

            cell.addClass("sui-update-buttons");
        },

        _removeButtons: function (cell, index) {
            var self = this,
                i,
                len = self._buttons.length;

            while (len--) {
                if (self._buttons[len].index == index) {
                    self._buttons[len].button.destroy();
                    self._buttons.splice(len, 1);
                }
            }

            cell.removeClass("sui-update-buttons")
                .empty();
        },

        // handle the click event of update button
        _updateButtonClicked: function (index, cell) {
            var self = this,
                ds = self.dataSource;

            self._updateItem(index, cell);

            if (self._editing._errorDuringEdit) {
                self._editing._errorDuringEdit = false;
                return;
            }

            self._putRowInViewMode(index, cell);
        },

        _updateItem: function (index, cell) {
            var self = this,
                ds = self.dataSource,
                pager = self.pager,
                model,
                updatedCellKyes = [],
                value,
                populateInsertedItem = true,
                args,
                key;

            if (ds.group && ds.group.length > 0) {
                var rows = self.contentTable.find(".sui-row, .sui-alt-row");
                var row = self.contentTable.find("tr").get(index);
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i] == row) {
                        index = i;
                        break;
                    }
                }
            }

            model = ds.editView(index);

            for (key in model.data) {
                if (model.data.hasOwnProperty(key)) {
                    if (model.data[key] != null) {
                        populateInsertedItem = false;
                    }
                    if (self._editing._editors[key]) {
                        if (self._editing._editors[key] == "custom") {
                            args = self.trigger("getCustomEditorValue", { field: key, value: null });
                            value = args.value;
                            self._editing._editors[key] = null;
                        }
                        else {
                            value = self._editing._editors[key].value ?
                                self._editing._editors[key].value() :
                                (self._editing._editors[key].checked ? self._editing._editors[key].checked() : UNDEFINED);
                        }

                        if (model.data[key] != value) {
                            updatedCellKyes.push(key);
                        }

                        if (isUndefined(value) || value == null) {
                            value = self._getDefaultValue(key);
                        }

                        model.set(key, value);
                    }
                }
            }

            if (self._editing._errorDuringEdit) {
                updatedCellKyes.length = 0;
                return;
            }

            if (!self._editing.options.batch) {
                args = self.trigger(COMMAND, { commandName: SAVE, cancel: false });

                if (!args.cancel) {
                    // call save, passing false to suppress triggering the change event
                    ds.save(false);
                    self.trigger(SAVE);
                }
            }

            self._populateInsertedItem = populateInsertedItem;

            return updatedCellKyes;
        },

        _getDefaultValue: function (field) {
            var self = this,
                schema = self.dataSource.schema,
                value;

            if (schema && schema.options.fields) {
                switch (schema.options.fields[field].type) {
                    case Number:
                        value = 0;
                        break;
                    case Date:
                        value = new Date();
                        break;
                    case String:
                        value = "";
                        break;
                    case Boolean:
                        value = false;
                        break;
                    default:
                }
            }
            else {
                value = "";
            }

            return value;
        },

        _closeAllEditedRows: function (allUpdatedCellsKyes) {
            var self = this,
                rowIndex,
                cell,
                editableCells = self.contentTable.find(".sui-editable-cell");

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                cell = self.contentTable.find(".sui-update-buttons").get(0);
                self._cancelButtonClicked(rowIndex, $(cell));

                // batch update with updated cells
                if (allUpdatedCellsKyes && allUpdatedCellsKyes.length > 0) {
                    self._renderUpdateMarkers(allUpdatedCellsKyes, rowIndex);
                }
            }
        },

        // handle the click event of cancel button
        _cancelButtonClicked: function (index, cell) {
            var self = this,
                dataSource = self.dataSource,
                args = self.trigger(COMMAND, { commandName: CANCEL, cancel: false, rowIndex: index, cell: cell });

            if (!args.cancel) {
                if (dataSource.tracker && dataSource.tracker.changes && dataSource.tracker.changes.added && dataSource.tracker.changes.added.length > 0) {
                    dataSource.cancel();
                }
                else {
                    self._putRowInViewMode(index, cell);
                }

                self.trigger(CANCEL);
            }
        },

        _putRowInViewMode: function (index, cell) {
            var self = this,
                dataItem,
                row,
                rows,
                i,
                ds = self.dataSource,
                contentTable = self.contentTable,
                dataItemIndex = index;

            if (ds.group && ds.group.length > 0) {
                rows = contentTable.find(".sui-row, .sui-alt-row");
                row = contentTable.find("tr").get(index);
                for (i = 0; i < rows.length; i++) {
                    if (rows[i] == row) {
                        dataItemIndex = i;
                        break;
                    }
                }
            }
            dataItem = ds.editView(dataItemIndex).data;

            if (cell) {
                self._removeButtons(cell, index);
            }

            row = contentTable.find("tr").get(index);
            var indentCellsCount = parseInt($(row).attr("data-group-level"), 10);

            self._editing._destroyRow(index);
            row = self._renderRow(dataItemIndex, self.contentTable.tbody, dataItem, index);

            for (i = 0; i < indentCellsCount; i++) {
                $("<td class='sui-indent-cell sui-group-intend-cell'/>").prependTo(row);
            }

            if (indentCellsCount) {
                row.attr("data-group-level", indentCellsCount);
            }

            if (self._editing.options.batch) {
                var cells = row.find(".sui-cell");

                if (self._markedCells && self._markedCells[index]) {
                    var item = self._markedCells[index],
                        currentIndex,
                        html;

                    for (i = 0; i < item.length; i++) {
                        currentIndex = item[i];
                        html = $(cells[currentIndex]).html();
                        $(cells[currentIndex]).html("<span class='sui-updated-marker' />" + html);
                    }
                }
            }
        },

        _renderUpdateMarkers: function (allUpdatedCellsKyes, rowIndex) {
            var self = this,
                columns = self.columns,
                cells = self.contentTable.find("tbody > tr").eq(rowIndex).find(".sui-cell"),
                i,
                j,
                html;

            for (i = 0; i < allUpdatedCellsKyes.length; i++) {
                for (j = 0; j < columns.length; j++) {
                    if (columns[j].field === allUpdatedCellsKyes[i]) {
                        html = $(cells[j]).html();
                        $(cells[j]).html("<span class='sui-updated-marker' />" + html);

                        if (!self._markedCells) {
                            self._markedCells = {};
                            self._markedCells[rowIndex] = [];
                            self._markedCells[rowIndex].push(j);
                        }
                        else {
                            if (!self._markedCells[rowIndex]) {
                                self._markedCells[rowIndex] = [];
                            }
                            self._markedCells[rowIndex].push(j);
                        }
                    }
                }
            }
        },

        _selection: function () {
            var self = this,
                options = self.options;

            if (options.selection) {
                self._selectable = new Selection(self.headerTable, self.contentTable, options.selection, self);
            }
        },

        _filtering: function () {
            var self = this,
                options = self.options;

            if (options.filtering && options.filtering.enabled) {
                self._filter = new Filtering(self);
            }
        },

        _paging: function (paging) {
            var self = this,
                element = self.element,
                pagerWrapper;

            if (shield.ui.Pager && paging) {
                if (isObject(paging) && paging instanceof shield.ui.Pager) {
                    self.pager = paging;
                    self.pager.dataSource = self.dataSource;
                    self.pager.element.appendTo(element);
                }
                else {
                    pagerWrapper = $("<div />").appendTo(element);
                    pagerWrapper.addClass("sui-pager");
                    self.pagerWrapper = pagerWrapper;

                    self.pager = new shield.ui.Pager(pagerWrapper.get(0), extend({}, paging, {
                        dataSource: self.dataSource
                    }));
                }
            }
        },

        _reorder: function () {
            var self = this,
                options = self.options;

            if (options.columnReorder) {
                self._columnReorder = new ColumnReorder(self);
            }
        },

        _expandCollapseDetailTemplate: function (e) {
            var self = this,
                parentRow = $(e.target).closest(".sui-row", self.contentTable);

            if (!parentRow.length) {
                parentRow = $(e.target).closest(".sui-alt-row", self.contentTable);
            }
            self._toggleDetailTemplate(parentRow);
        },

        _toggleDetailTemplate: function (parentRow) {
            var self = this,
                rows = self.contentTable.find("tr:first").parent().children().not(".sui-detail-row"),
                parentRowIndex = inArray(parentRow[0], rows),
                data = self.dataSource.view,
                detailRow = parentRow.next(),
                options = self.options,
                expandCollapseCell;

            if (detailRow && detailRow.hasClass("sui-detail-row")) {
                detailRow.toggle();
                expandCollapseCell = $(parentRow.get(0).cells[0]);
                self._toggleClasses(expandCollapseCell, "sui-expand-cell", "sui-collapse-cell");

                self._setExpandCollapseCellText(expandCollapseCell, options.detailExpandText, options.detailCollapseText);
            }
            else {
                self._addDetailTemplate(data[parentRowIndex], parentRow);
            }
        },

        _setExpandCollapseCellText: function (expandCollapseCell, detailExpandText, detailCollpsedText) {
            if (isUndefined(detailCollpsedText)) {
                detailCollpsedText = "-";
            }
            if (isUndefined(detailExpandText)) {
                detailExpandText = "+";
            }

            var collapseClass = this.options.detailCollapseCssClass;
            var expandClass = this.options.detailExpandCssClass;

            if (isUndefined(collapseClass)) {
                collapseClass = "";
            }
            else {
                collapseClass = " class = '" + collapseClass + "'";
            }

            if (isUndefined(expandClass)) {
                expandClass = "";
            }
            else {
                expandClass = " class = '" + expandClass + "'";
            }

            if (expandCollapseCell.hasClass("sui-collapse-cell")) {
                expandCollapseCell.html("<span" + collapseClass + ">" + detailCollpsedText + "</span>");
            }
            else if (expandCollapseCell.hasClass("sui-expand-cell")) {
                expandCollapseCell.html("<span" + expandClass + ">" + detailExpandText + "</span>");
            }
        },

        _addDetailTemplate: function (item, parentRow) {
            var self = this,
                options = self.options,
                row = $("<tr class='sui-detail-row'/>"),
                html = "",
                indentCell;

            if (self._canExpandCollapse()) {
                indentCell = $("<td class='sui-cell sui-indent-cell'/>");
                if (isIE7) {
                    indentCell.html("&nbsp;");
                }
                indentCell.appendTo(row);
            }

            var cell = $('<td class="sui-detail-cell" colspan="' + self.columns.length + '"></td>'),
                args = self.trigger(COMMAND, { commandName: DETAILCREATED, cancel: false, detailCell: cell, item: item });

            if (!args.cancel) {
                cell.appendTo(row);
                if (options.detailTemplate) {
                    cell.html(shieldFormat(options.detailTemplate, item));
                }

                if (!parentRow) {
                    row.appendTo(self.contentTable.tbody);
                }
                else {
                    row.insertAfter(parentRow);
                }

                self.trigger(DETAILCREATED, { detailCell: cell, item: item });

                if (parentRow) {
                    var expandCollapseCell = $(parentRow.get(0).cells[0]);
                    self._toggleClasses(expandCollapseCell, "sui-expand-cell", "sui-collapse-cell");

                    self._setExpandCollapseCellText(expandCollapseCell, options.detailExpandText, options.detailCollapseText);
                }
            }
        },

        _toggleClasses: function (element, firstClass, secondClass) {
            if (element.hasClass(firstClass)) {
                element.removeClass(firstClass);
                element.addClass(secondClass);
            }
            else {
                element.removeClass(secondClass);
                element.addClass(firstClass);
            }
        },

        _resizing: function () {
            var self = this;

            // create resize component if both resizing and scrolling is enabled
            if (self.options.resizing && self.options.scrolling) {
                self._columnResizing = new ColumnResizing(self);
            }
        },

        _initToolbar: function () {
            var self = this,
                options = self.options;

            // create toolbar component
            if (options.toolbar) {
                self._toolbar = new Toolbar(options.toolbar, self);
            }
        },

        _initEditing: function () {
            var self = this,
                options = self.options;

            // initialize editing
            if (options.editing) {
                self._buttons = [];
                self._editing = new Editing(options.editing, self);
            }
        },

        _refreshOnSort: function () {
            this._sortingInProgress = true;
            this.dataSource.read();
        },

        _updateGrid: function () {
            var self = this,
                options = shield.extend([Class], self.options, options);

            if (self.sorting) {
                self.sorting.destroy();
                self.sorting = null;
            }

            self.headerWrapper.find(".sui-headercell .sui-link").each(function (index, el) {
                var anchor = $(el);
                anchor.parent().html(anchor.html());
            });

            // remove all span elements in the header that have a class starting with sui-
            self.headerWrapper.find('.sui-headercell span[class^="sui-"]').remove();

            self._sorting();
        },

        _dsStartHandler: function () {
            this.loading(true);
        },

        refresh: function (options) {
            var self = this,
                dataSourceOptions = options ? options.dataSource : null;

            options = shield.extend([Class], self.options, options);

            // explicitly override the options.dataSource if such a new option came,
            // instead of applying the change on the instance
            if (dataSourceOptions) {
                options.dataSource = dataSourceOptions;
            }

            var dataSource,
                scrolling = options.scrolling,
                paging = self.pager ? self.pager.options : options.paging,
                scrollLeft = 0;

            if (scrolling && self.contentWrapper) {
                scrollLeft = self.contentWrapper.get(0).scrollLeft;
            }

            self._destroyInternal();

            dataSource = self.dataSource = DataSource.create(options.dataSource);
            dataSource.on(CHANGE, self._dsChange = proxy(self._renderData, self));
            dataSource.on(START, self._dsStart = proxy(self._dsStartHandler, self));

            self._resolveColumns(options.columns);

            self._createWrappers();

            self._createHeaderTable();
            self._createContentTable();

            self._initToolbar();
            self._initEditing();

            self._selection();
            self._paging(paging);

            self._resizing();
            self._reorder();

            self._filtering();

            if (!self.pager) {
                self.dataSource.read();
            }

            self._sorting();

            self._rsNS = '.rs.' + self.getInstanceId();
            $(win).on(RESIZE + self._rsNS, self._resize = proxy(self._resizeHandler, self));

            if (scrollLeft) {
                self.contentWrapper.get(0).scrollLeft = scrollLeft;
            }
        },

        loading: function (isLoading) {
            var self = this;

            if (shield.ui.LoadingPanel) {
                if (isLoading) {
                    if (!self.loadingPanel) {
                        self.loadingPanel = new shield.ui.LoadingPanel(self.element.get(0));
                    }

                    self.loadingPanelTimeout = setTimeout(function () {
                        if (self.loadingPanel) {
                            self.loadingPanel.show();
                        }
                    }, 50);
                }
                else if (self.loadingPanel) {
                    clearTimeout(self.loadingPanelTimeout);
                    self.loadingPanelTimeout = null;
                    self.loadingPanel.hide();
                }
            }
        },

        select: function (items) {
            var self = this,
                selectable = self._selectable;

            items = $(items);
            if (items.length) {
                if (!selectable.multiple) {
                    selectable.clear();
                    items = items.first();
                }
                selectable.select(items);
                return;
            }

            return selectable.value();
        },

        clearSelection: function () {
            this._selectable.clear();
        },

        sort: function (fieldName, desc, unsort) {
            if (this.sorting) {
                this.sorting._sort(fieldName, desc, unsort);
            }
        },

        _getItemRow: function(row) {
            if (isNumber(row)) {
                // row is an index, so find it in the details
                row = this.contentTable.children('tbody').children(".sui-row, .sui-alt-row").get(row);
            }
            return row;
        },

        expandRow: function (row) {
            var self = this,
                expandRow = $(self._getItemRow(row)),
                detailRow = expandRow.next();

            if (detailRow.hasClass("sui-detail-row")) {
                if (detailRow.css("display") == "none") {
                    self._toggleDetailTemplate(expandRow);
                }
            }
            else {
                self._toggleDetailTemplate(expandRow);
            }
        },

        collapseRow: function (row) {
            var self = this,
                collapseRow = $(self._getItemRow(row)),
                detailRow = collapseRow.next();

            if (detailRow.hasClass("sui-detail-row")) {
                if (detailRow.css("display") != "none") {
                    self._toggleDetailTemplate(collapseRow);
                }
            }
            else {
                self._toggleDetailTemplate(collapseRow);
                collapseRow.next().toggle();
            }
        },

        reorderColumn: function (index, newIndex) {
            var self = this,
                element = self.element,
                columns = self.columns,
                columnOptions = self.options.columns || [],
                header = self.headerWrapper,
                method = "before",
                indent = header.find(".sui-indent-cell").length,
                column;

            index = +index;
            newIndex = +newIndex;

            if (isNaN(index) || isNaN(newIndex) || index < 0 || newIndex < 0 || index > columns.length - 1 || newIndex > columns.length - 1) {
                throw new Error("Invalid index in column reorder.");
            }

            if (index === newIndex) {
                return;
            }

            if (newIndex > index) {
                method = "after";
            }

            column = columns.splice(index, 1)[0];
            columns.splice(newIndex, 0, column);

            column = columnOptions.splice(index, 1)[0];
            columnOptions.splice(newIndex, 0, column);

            index += indent;
            newIndex += indent;

            element.find(".sui-gridheader col:nth-child(" + (index + 1) + ")")
                .add(element.find(".sui-gridheader .sui-columnheader th:nth-child(" + (index + 1) + ")"))
                .add(element.find(".sui-gridcontent col:nth-child(" + (index + 1) + ")"))
                .add(element.find(".sui-gridcontent tr:not(.sui-detail-row) td:nth-child(" + (index + 1) + ")"))
                .each(function () {
                    $(this).parent().children().eq(newIndex)[method](this);
                });
        },

        // Add passed object or created new one with defaults to end of datasource
        addRow: function (obj) {
            return this.dataSource.add(isDefined(obj) ? obj : {});
        },

        // Add passed object or created new one with defaults to specified position in view
        insertRow: function (index, obj) {
            return this.dataSource.insertView(index, isDefined(obj) ? obj : {});
        },

        // Saves all unsaved changes in DataSource
        saveChanges: function () {
            // save the datasource, this will trigger a datasource change event
            this.dataSource.save();
        },

        // Reverts all changes from the DataSource
        revertChanges: function () {
            this.dataSource.cancel();
        },

        // returns the data item to which the row at passed index is bound
        dataItem: function (index) {
            return this.dataSource.view[index];
        },

        editCell: function (rowIndex, colIndex) {
            var self = this,
                cell = self.contentTable.find("tbody > tr").eq(rowIndex).find("td").eq(colIndex).get(0);

            self._editingInProcess = true;
            self._editing._putCellInEditMode(cell, rowIndex);
        },

        editRow: function (rowIndex) {
            var self = this,
                row = self.contentTable.find("tbody > tr").eq(rowIndex).get(0);

            self._editingInProcess = true;
            self._editing._putRowInEditMode($(row), 0);
        },

        cancelEditing: function () {
            var self = this,
                rowIndex,
                cell,
                editableCells = self.contentTable.find(".sui-editable-cell");

            if (editableCells.length > 0) {
                rowIndex = editableCells.get(0).parentNode.rowIndex;
                cell = self.contentTable.find(".sui-update-buttons").get(0);

                self._putRowInViewMode(rowIndex, $(cell));
            }
        },

        // deletes a row / data item using the specified view index
        deleteRow: function (rowIndex) {
            this.dataSource.removeAtView(rowIndex);
        },

        filter: function () {
            var self = this,
                ds = self.dataSource,
                args = [].slice.call(arguments);

            if (args.length > 0) {
                ds.filter = args[0];
                ds.read();
            }
            else {
                return ds.filter;
            }
        },

        group: function (dataField, index, order, aggregates) {
            var self = this,
                groups = self.dataSource.group;
            if (groups) {
                groups.splice(index, 0, { field: dataField, order: order, aggregates: aggregates });
            }
            else {
                self.dataSource.group = [];
                self.dataSource.group.push({ field: dataField, order: order, aggregates: aggregates });
            }
        },

        ungroup: function (dataField) {
            var self = this,
                groups = self.dataSource.group;

            self.headerTable.thead.find(".sui-columnheader > .sui-indent-cell").remove();
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].field == dataField) {
                    groups.splice(i, 1);
                    if (groups.length === 0) {
                        self.dataSource.group = null;
                    }
                    self.dataSource.read();
                }
            }
        },

        collapseGroup: function (row) {
            var self = this,
                shouldHideNextRow = true,
                groupLevel = parseInt(row.attr("data-group-level"), 10);

            while (shouldHideNextRow) {

                row = row.next().css("display", "none");
                if (row.next().length > 0) {
                    var nextRowGroupLevel = parseInt(row.next().attr("data-group-level"), 10);
                    if (nextRowGroupLevel <= groupLevel && row.next().hasClass("sui-group-header")) {
                        shouldHideNextRow = false;
                    }
                }
                else {
                    shouldHideNextRow = false;
                }
            }
        },

        expandGroup: function (row) {
            var self = this,
                            shouldHideNextRow = true,
                            groupLevel = parseInt(row.attr("data-group-level"), 10);

            while (shouldHideNextRow) {
                row = row.next().css("display", "");
                if (row.hasClass("sui-group-header")) {
                    if (row.find(".sui-expand").length > 0) {
                        return;
                    }
                }
                if (row.next().length > 0) {
                    var nextRowGroupLevel = parseInt(row.next().attr("data-group-level"), 10);
                    if (nextRowGroupLevel <= groupLevel && row.next().hasClass("sui-group-header")) {
                        shouldHideNextRow = false;
                    }
                }
                else {
                    shouldHideNextRow = false;
                }
            }
        }
    });

    Grid.defaults = defaults;
    shield.ui.plugin("Grid", Grid);

})(jQuery, shield, this);