(function ($, shield, win, UNDEFINED) {
    "use strict";

    // some variables global for the closure
    var Widget = shield.ui.Widget,
		Class = shield.Class,
        DataSource = shield.DataSource,
		doc = document,
        is = shield.is,
		get = shield.get,
        format = shield.format,
        toInt = shield.to["int"],
        abs = Math.abs,
        each = $.each,
        proxy = $.proxy,
		extend = $.extend,
		map = $.map,

        isOpera = win.opera,
		userAgent = navigator.userAgent,
		isIE = /msie/i.test(userAgent) && !isOpera,
        isIE7 = isIE && doc.documentMode === 7,

        HEIGHT = "height",
        WIDTH = "width",
        SELECTED = "sui-selected",
        DISABLED = "sui-disabled",
        CLICK = "click",
        PX = "px";

    // the default configuration options for the pager
    var defaults = {
        currentPage: 1,
        totalItems: null,
        pageSize: 10,
        pageLinksCount: 5,
        directionLinks: true,
        boundaryLinks: true,
        imageLinks: false,
        messages: {
            infoBarTemplate: "{0} - {1} of {2} items",
            previousText: "&lsaquo;",
            nextText: "&rsaquo;",
            firstText: "&laquo;",
            lastText: "&raquo;",
            firstTooltip: "Go to the first page",
            previousTooltip: "Go to the previous page",
            nextTooltip: "Go to the next page",
            lastTooltip: "Go to the last page"
        }
    },
    // the Pager class encapsulating the main pager logic
    Pager = Widget.extend({
        // initialization method, called by the framework
        init: function (element, userOptions) {
            // call the parent init
            Widget.fn.init.apply(this, arguments);

            var self = this,
				options = self.options,
                dataSource,
                changeDelegate;

            self.currentPage = options.currentPage;

            self._createWrappers();
            self._createPagerElements();

            // hack for IE<10, the older version of IE do not recognize user-select: none; or -ms-user-select: none;
            if (isIE) {
                self.element.on("selectstart", self._selectStart = function () { return false; });
            }
            self.element.on(CLICK, "a", self._click = proxy(self._clickHandler, self));

            if (options.dataSource) {
                dataSource = self.dataSource = DataSource.create(options.dataSource);
                changeDelegate = self._changeDelegate = proxy(self._dataChange, self);

                dataSource.on("change", changeDelegate);

                self._updateDataSource();
            }
            else {
                self.refresh(true);
            }
        },

        // destructor
        destroy: function () {
            var self = this;

            if (self.dataSource) {
                self.dataSource.off("change", self._changeDelegate);
                self._changeDelegate = null;
            }

            self.pagination = null;
            self.infoBox = null;
            self.element.off("selectstart", self._selectStart);
            self._selectStart = null;

            self.element.off(CLICK, "a", self._click);
            self._click = null;
            self.startLinkIndex = null;
            self.endLinkIndex = null;

            self.element.remove();

            Widget.fn.destroy.call(self);
        },

        _clickHandler: function (e) {
            var target = $(e.currentTarget),
                self = this,
                options = self.options;

            e.preventDefault();
            if (!target.parent().hasClass(DISABLED)) {
                var currentPage = toInt(target.attr("data-page"));
                self.currentPage = currentPage;

                self.refresh();
            }
        },

        _createWrappers: function () {
            var self = this,
               element = self.element;

            element.addClass("sui-pager sui-pager-core");

            var pagination = $("<ul />").appendTo(element);
            if (isIE7) {
                pagination.addClass("sui-pagination sui-pagination-ie7");
            }
            else {
                pagination.addClass("sui-pagination");
            }

            var infoBox = $("<div />").appendTo(element);
            if (isIE && !isIE7) {
                infoBox.addClass("sui-pager-info-box-ie");
            }
            else {
                infoBox.addClass("sui-pager-info-box");
            }

            self.pagination = pagination;
            self.infoBox = infoBox;
        },

        _updateInfoBox: function () {
            var self = this,
                options = self.options,
                messages = options.messages,
                firstItemIndex = (options.pageSize * (self.currentPage - 1)) + 1,
                shownItemsCount = firstItemIndex - 1 + options.pageSize,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize);
            
            if (shownItemsCount > options.totalItems) {
                shownItemsCount = options.totalItems;
            }
            if (options.totalItems === 0)
            {
                firstItemIndex = 0;
            }
            var html = format(messages.infoBarTemplate, firstItemIndex, shownItemsCount, options.totalItems, self.currentPage, numberOfPages);
            self.infoBox.empty();
            self.infoBox.html(html);
        },

        _createPagerElements: function () {
            var self = this,
                options = self.options,
                messages = options.messages,
                currentPage = self.currentPage,
                pagination = self.pagination,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize),
                linksNumber = Math.min(options.pageLinksCount, numberOfPages),
                html = "",
                navigationLinksClass = "",
                disabledPrevClass = "",
                disabledNextClass = "",
                selected = "",
                viewIndex = toInt((currentPage - 1) / options.pageLinksCount),
                startIndex = viewIndex * options.pageLinksCount + 1;

            if (currentPage == 1) {
                disabledPrevClass = " " + DISABLED;
            }
            if (currentPage == numberOfPages || !options.totalItems) {
                disabledNextClass = " " + DISABLED;
            }
            if (options.imageLinks) {
                messages.previousText = "&nbsp;";
                messages.nextText = "&nbsp;";
                messages.firstText = "&nbsp;";
                messages.lastText = "&nbsp;";
                navigationLinksClass = "sui-navigation-links ";
            }

            var end = Math.min((startIndex + linksNumber), numberOfPages + 1);

            self.startLinkIndex = startIndex;
            self.endLinkIndex = end - 1;

            if (viewIndex > 0) {
                html += "<li class='sui-pager-element'><a data-page='" + (self.startLinkIndex - 1) + "'>...</a></li>";
            }

            for (var i = startIndex; i < end; i++) {
                if (i == currentPage) {
                    selected = " " + SELECTED;
                }
                html += "<li class='sui-pager-element'><a data-page='" + i + "' class='sui-pager-number" + selected + "'>" + i + "</a></li>";
                selected = "";
            }

            if (self.endLinkIndex < numberOfPages) {
                html += "<li class='sui-pager-element'><a data-page='" + (self.endLinkIndex + 1) + "'>...</a></li>";
            }

            if (options.directionLinks) {
                html = "<li class='sui-pager-element" + disabledPrevClass + "'><a title='" + messages.previousTooltip + "' data-page='" + (currentPage - 1) + "' class='" + navigationLinksClass + "sui-prev'>" + messages.previousText + "</a></li>" + html;
                html = html + "<li class='sui-pager-element" + disabledNextClass + "'><a title='" + messages.nextTooltip + "' data-page='" + (currentPage + 1) + "' class='" + navigationLinksClass + "sui-next'>" + messages.nextText + "</a></li>";
            }
            if (options.boundaryLinks) {
                html = "<li class='sui-pager-element" + disabledPrevClass + "'><a title='" + messages.firstTooltip + "' data-page='1' class='" + navigationLinksClass + "'>" + messages.firstText + "</a></li>" + html;
                html = html + "<li class='sui-pager-element" + disabledNextClass + "'><a title='" + messages.lastTooltip + "' data-page='" + numberOfPages + "' class='" + navigationLinksClass + "'>" + messages.lastText + "</a></li>";
            }

            pagination.html(html);

            var allLinks = pagination.find("a");
            if (allLinks.length > 0) {
                $(allLinks[0]).addClass("sui-first");
                $(allLinks[allLinks.length - 1]).addClass("sui-last");
            }

            if (isIE7) {
                var lis = pagination.find("li");
                if (lis.length > 0) {
                    var width = 0;
                    for (i = 0; i < lis.length; i++) {
                        var liWidth = lis[i].clientWidth;
                        width += liWidth;
                        $(lis[i]).css(WIDTH, liWidth + PX);
                    }
                    pagination.css(WIDTH, width + PX);
                }
            }
        },

        _dataChange: function () {
            var self = this,
                options = self.options,
                dataSource = self.dataSource,
                pageSize = dataSource.take,
                page = Math.ceil(dataSource.skip / pageSize) + 1;

            self.currentPage = page;
            options.pageSize = pageSize;
            options.totalItems = dataSource.total;

            self.refresh(true);
        },

        refresh: function (noevent) {
            var self = this,
                options = self.options,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize),
                currentPage = self.currentPage,
                dataSource = self.dataSource;

            self.pagination.empty();
            self._createPagerElements();

            self._updateInfoBox();

            if (!noevent) {
                self._updateDataSource();
                self.trigger("change", { currentPage: self.currentPage, pageSize: options.pageSize });
            }
        },

        _updateDataSource: function () {
            var self = this,
                dataSource = self.dataSource,
                options = self.options;

            if (dataSource) {
                dataSource.skip = (self.currentPage - 1) * options.pageSize;
                dataSource.take = options.pageSize;
                dataSource.read();
            }
        },

        page: function (pageNumber) {
            var self = this;

            if (pageNumber) {
                var currentPage = toInt(pageNumber);

                if (self._isValidPage(currentPage)) {
                    self.currentPage = currentPage;
                    self.refresh();
                }
            }
            else {
                return self.currentPage;
            }
        },

        first: function () {
            this.currentPage = 1;
            this.refresh();
        },

        last: function () {
            var self = this,
                options = self.options,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize);

            self.currentPage = numberOfPages;
            self.refresh();
        },

        next: function () {
            var self = this,
                options = self.options,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize);

            if (self.currentPage == numberOfPages) {
                return;
            }
            else {
                self.currentPage = self.currentPage + 1;
                self.refresh();
            }
        },

        prev: function () {
            var self = this,
                options = self.options;

            if (self.currentPage == 1) {
                return;
            }
            else {
                self.currentPage = self.currentPage - 1;
                self.refresh();
            }
        },

        pageSize: function (numberOfItems) {
            var self = this,
                options = self.options;

            if (numberOfItems) {
                var itemsCount = toInt(numberOfItems);

                if (self._isValidPageSize(itemsCount)) {
                    self.currentPage = 1;
                    options.pageSize = itemsCount;
                    self.refresh();
                }
            }
            else {
                return options.pageSize;
            }
        },

        _isValidPage: function (pageNumber) {
            var options = this.options,
                numberOfPages = Math.ceil(options.totalItems / options.pageSize);

            if (is.integer(pageNumber)) {
                if (pageNumber > numberOfPages || pageNumber < 1) {
                    shield.error("Invalid page number. The page number must be greater than 0 and less than " + numberOfPages + ".", options.dieOnError);
                    return false;
                }
            }
            else {
                shield.error("Invalid page number. The page number must integer.", options.dieOnError);
                return false;
            }

            return true;
        },

        _isValidPageSize: function (pageSize) {
            var options = this.options;

            if (is.integer(pageSize)) {
                if (pageSize < 1) {
                    shield.error("Invalid page number. The page number must be greater than 0 (zero).", options.dieOnError);
                    return false;
                }
            }
            else {
                shield.error("Invalid page size number. The page size number must be integer.", options.dieOnError);
                return false;
            }

            return true;
        }
    });

    // Set the default options to the Pager constructor
    Pager.defaults = defaults;

    // register the shieldPager jQuery plugin
    shield.ui.plugin("Pager", Pager);
    shield.ui.Pager = Pager;

})(jQuery, shield, this);