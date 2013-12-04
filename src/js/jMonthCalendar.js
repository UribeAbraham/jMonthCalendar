/*!
* Title:  jMonthCalendar @VERSION
* Dependencies:  jQuery 1.3.0 +
* Author:  Kyle LeNeau
* Email:  kyle.leneau@gmail.com
* Project Hompage:  http://www.bytecyclist.com/projects/jmonthcalendar
* Source:  http://github.com/KyleLeneau/jMonthCalendar
*
*/
(function($) {
	
	$.fn.jMonthCalendar=function(){
		var arrayjmonth=[];
		this.each(function(){
			if(!$(this).data("jMonthCalendar")){
				$(this).data("jMonthCalendar",new jMonthCalendar());
				arrayjmonth.push($(this).data("jMonthCalendarjMonthCalendar"));
			}
		});
		if(this.length>1){
			
			return arrayjmonth;
		}
		else{
			return $(this).data("jMonthCalendar");
		}
	};
	var jMonthCalendar=function(){
	var calendar=this;
	this._boxes = [];
	this._eventObj = {};
	
	this._workingDate = null;
	this._daysInMonth = 0;
	this._firstOfMonth = null;
	this._lastOfMonth = null;
	this._gridOffset = 0;
	this._totalDates = 0;
	this._gridRows = 0;
	this._totalBoxes = 0;
	this._dateRange = { startDate: null, endDate: null };
	
	
	this.cEvents = [];
	this.def = {
			containerId: "#jMonthCalendar",
			headerHeight: 50,
			firstDayOfWeek: 0,
			calendarStartDate:new Date(),
			dragableEvents: true,
			dragHoverClass: 'DateBoxOver',
			navLinks: {
				enableToday: true,
				enableNextYear: true,
				enablePrevYear: true,
				p:'&lsaquo; Prev', 
				n:'Next &rsaquo;', 
				t:'Today',
				showMore: 'Show More'
			},
			onMonthChanging: function() {},
			onMonthChanged: function() {},
			onEventLinkClick: function() {},
			onEventBlockClick: function() {},
			onEventBlockOver: function() {},
			onEventBlockOut: function() {},
			onDayLinkClick: function() {},
			onDayCellClick: function() {},
			onDayCellDblClick: function() {},
			onEventDropped: function() {},
			onShowMoreClick: function() {}
		};
	
	this._getJSONDate = function(dateStr) {
		//check conditions for different types of accepted dates
		var tDt, k;
		if (typeof dateStr == "string") {
			
			//  "2008-12-28T00:00:00.0000000"
			var isoRegPlus = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{7})$/;
			
			//  "2008-12-28T00:00:00"
			var isoReg = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})$/;
		
			//"2008-12-28"
			var yyyyMMdd = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
			
			//  "new Date(2009, 1, 1)"
			//  "new Date(1230444000000)
			var newReg = /^new/;
			
			//  "\/Date(1234418400000-0600)\/"
			var stdReg = /^\\\/Date\(([0-9]{13})-([0-9]{4})\)\\\/$/;
			
			if (k = dateStr.match(isoRegPlus)) {
				return new Date(k[1],k[2]-1,k[3],k[4],k[5],k[6]);
			} else if (k = dateStr.match(isoReg)) {
				return new Date(k[1],k[2]-1,k[3],k[4],k[5],k[6]);
			} else if (k = dateStr.match(yyyyMMdd)) {
				return new Date(k[1],k[2]-1,k[3]);
			}
			
			if (k = dateStr.match(stdReg)) {
				return new Date(k[1]);
			}
			
			if (k = dateStr.match(newReg)) {
				return eval('(' + dateStr + ')');
			}
			
			return tDt;
		}
	};
	
	//This function will clean the JSON array, primaryly the dates and put the correct ones in the object.  Intended to alwasy be called on event functions.
	this._filterEventCollection = function() {
		if (calendar.cEvents && calendar.cEvents.length > 0) {
			var multi = [];
			var single = [];
			
			//Update and parse all the dates
			$.each(calendar.cEvents, function(){
				var ev = this;
				//Date Parse the JSON to create a new Date to work with here				
				if(ev.StartDateTime) {
					if (typeof ev.StartDateTime == 'object' && ev.StartDateTime.getDate) { this.StartDateTime = ev.StartDateTime; }
					if (typeof ev.StartDateTime == 'string' && ev.StartDateTime.split) { this.StartDateTime = _getJSONDate(ev.StartDateTime); }
				} else if(ev.Date) { // DEPRECATED
					if (typeof ev.Date == 'object' && ev.Date.getDate) { this.StartDateTime = ev.Date; }
					if (typeof ev.Date == 'string' && ev.Date.split) { this.StartDateTime = _getJSONDate(ev.Date); }
				} else {
					return;  //no start date, or legacy date. no event.
				}
				
				if(ev.EndDateTime) {
					if (typeof ev.EndDateTime == 'object' && ev.EndDateTime.getDate) { this.EndDateTime = ev.EndDateTime; }
					if (typeof ev.EndDateTime == 'string' && ev.EndDateTime.split) { this.EndDateTime = _getJSONDate(ev.EndDateTime); }
				} else {
					this.EndDateTime = this.StartDateTime.clone();
				}
				
				if (this.StartDateTime.clone().clearTime().compareTo(this.EndDateTime.clone().clearTime()) == 0) {
					single.push(this);
				} else if (this.StartDateTime.clone().clearTime().compareTo(this.EndDateTime.clone().clearTime()) == -1) {
					multi.push(this);
				}
			});
			
			multi.sort(calendar._eventSort);
			single.sort(calendar._eventSort);
			calendar.cEvents = [];
			$.merge(calendar.cEvents, multi);
			$.merge(calendar.cEvents, single);
		}
	};
	
	this._eventSort = function(a, b) {
		return a.StartDateTime.compareTo(b.StartDateTime);
	};
	
	this._clearBoxes = function() {
		calendar._clearBoxEvents();
		calendar._boxes = [];
	};
	
	this._clearBoxEvents = function() {
		for (var i = 0; i < calendar._boxes.length; i++) {
			calendar._boxes[i].clear();
		}
		calendar._eventObj = {};
	};
	
	this._initDates = function(dateIn) {
		var today = calendar.def.calendarStartDate;
		if(dateIn == undefined) {
			calendar._workingDate = new Date(today.getFullYear(), today.getMonth(), 1);
		} else {
			calendar._workingDate = dateIn;
			calendar._workingDate.setDate(1);
		}
		
		calendar._daysInMonth = calendar._workingDate.getDaysInMonth();
		calendar._firstOfMonth = calendar._workingDate.clone().moveToFirstDayOfMonth();
		calendar._lastOfMonth = calendar._workingDate.clone().moveToLastDayOfMonth();
		calendar._gridOffset = calendar._firstOfMonth.getDay() - calendar.def.firstDayOfWeek;
		calendar._totalDates = calendar._gridOffset + calendar._daysInMonth;
		calendar._gridRows = Math.ceil(calendar._totalDates / 7);
		calendar._totalBoxes = calendar._gridRows * 7;
		
		calendar._dateRange.startDate = calendar._firstOfMonth.clone().addDays((-1) * calendar._gridOffset);
		calendar._dateRange.endDate = calendar._lastOfMonth.clone().addDays(calendar._totalBoxes - (calendar._daysInMonth + calendar._gridOffset));
	};
	
	this._initHeaders = function() {
		// Create Previous Month link for later
		var prevMonth = calendar._workingDate.clone().addMonths(-1);
		var prevMLink = $('<div class="MonthNavPrev"><a class="link-prev">'+ calendar.def.navLinks.p +'</a></div>').click(function() {
			calendar.ChangeMonth(prevMonth);
			return false;
		});
		
		//Create Next Month link for later
		var nextMonth = calendar._workingDate.clone().addMonths(1);
		var nextMLink = $('<div class="MonthNavNext"><a class="link-next">'+ calendar.def.navLinks.n +'</a></div>').click(function() {
			calendar.ChangeMonth(nextMonth);
			return false;
		});
		
		//Create Previous Year link for later
		var prevYear = calendar._workingDate.clone().addYears(-1);
		var prevYLink;
		if(calendar.def.navLinks.enablePrevYear) {
			prevYLink = $('<div class="YearNavPrev"><a>'+ prevYear.getFullYear() +'</a></div>').click(function() {
				calendar.ChangeMonth(prevYear);
				return false;
			});
		}
		
		//Create Next Year link for later
		var nextYear = calendar._workingDate.clone().addYears(1);
		var nextYLink;
		if(calendar.def.navLinks.enableNextYear) {
			nextYLink = $('<div class="YearNavNext"><a>'+ nextYear.getFullYear() +'</a></div>').click(function() {
				calendar.ChangeMonth(nextYear);
				return false;
			});
		}
		
		var todayLink;
		if(calendar.def.navLinks.enableToday) {
			//Create Today link for later
			todayLink = $('<div class="TodayLink"><a class="link-today">'+ calendar.def.navLinks.t +'</a></div>').click(function() {
				calendar.ChangeMonth(new Date());
				return false;
			});
		}

		//Build up the Header first,  Navigation
		var navRow = $('<tr><td colspan="7"><div class="FormHeader MonthNavigation"></div></td></tr>');
		var navHead = $('.MonthNavigation', navRow);
		
		navHead.append(prevMLink, nextMLink);
		if(calendar.def.navLinks.enableToday) { navHead.append(todayLink); }

		navHead.append($('<div class="MonthName"></div>').append(Date.CultureInfo.monthNames[calendar._workingDate.getMonth()] + " " + calendar._workingDate.getFullYear()));
		
		if(calendar.def.navLinks.enablePrevYear) { navHead.append(prevYLink); }
		if(calendar.def.navLinks.enableNextYear) { navHead.append(nextYLink); }
		
		
		//  Days
		var headRow = $("<tr></tr>");		
		for (var i = calendar.def.firstDayOfWeek; i < calendar.def.firstDayOfWeek+7; i++) {
			var weekday = i % 7;
			var wordday = Date.CultureInfo.dayNames[weekday];
			headRow.append('<th title="' + wordday + '" class="DateHeader' + (weekday == 0 || weekday == 6 ? ' Weekend' : '') + '"><span>' + wordday + '</span></th>');
		}
		
		headRow = $("<thead id=\"CalendarHead\"></thead>").css({ "height" : calendar.def.headerHeight + "px" }).append(headRow);
		headRow = headRow.prepend(navRow);
		return headRow;
	};

	calendar.DrawCalendar = function(dateIn){
		var now = new Date();
		now.clearTime();
		
		var today = calendar.def.calendarStartDate;
		
		calendar._clearBoxes();
		
		calendar._initDates(dateIn);
		var headerRow = calendar._initHeaders();
		
		//properties
		var isCurrentMonth = (calendar._workingDate.getMonth() == today.getMonth() && calendar._workingDate.getFullYear() == today.getFullYear());
		var containerHeight = $(calendar.def.containerId).outerHeight();
		var rowHeight = (containerHeight - calendar.def.headerHeight) / calendar._gridRows;
		var row = null;

		//Build up the Body
		var tBody = $('<tbody id="CalendarBody"></tbody>');
		
		for (var i = 0; i < calendar._totalBoxes; i++) {
			var currentDate = calendar._dateRange.startDate.clone().addDays(i);
			if (i % 7 == 0 || i == 0) {
				row = $("<tr></tr>");
				row.css({ "height" : rowHeight + "px" });
				tBody.append(row);
			}
			
			var weekday = (calendar.def.firstDayOfWeek + i) % 7;
			var atts = {'class':"DateBox" + (weekday == 0 || weekday == 6 ? ' Weekend ' : ''),
						'date':currentDate.toString("M/d/yyyy")
			};
			
			//dates outside of month range.
			if (currentDate.compareTo(calendar._firstOfMonth) == -1 || currentDate.compareTo(calendar._lastOfMonth) == 1) {
				atts['class'] += ' Inactive';
			}
			
			//check to see if current date rendering is today
			if (currentDate.compareTo(now) == 0) { 
				atts['class'] += ' Today';
			}
			
			//DateBox Events
			var dateLink = $('<div class="DateLabel"><a>' + currentDate.getDate() + '</a></div>');
			dateLink.bind('click', { Date: currentDate.clone() }, calendar.def.onDayLinkClick);
			
			var dateBox = $("<td></td>").attr(atts).append(dateLink);
			dateBox.bind('dblclick', { Date: currentDate.clone() }, calendar.def.onDayCellDblClick);
			dateBox.bind('click', { Date: currentDate.clone() }, calendar.def.onDayCellClick);
			
			if (calendar.def.dragableEvents) {
				dateBox.droppable({
					hoverClass: calendar.def.dragHoverClass,
					tolerance: 'pointer',
					drop: function(ev, ui) {
						var eventId = ui.draggable.attr("eventid")
						var newDate = new Date($(this).attr("date")).clearTime();
						
						var event;
						$.each(calendar.cEvents, function() {
							if (this.EventID == eventId) {
								var days = new TimeSpan(newDate - this.StartDateTime).days;
								
								this.StartDateTime.addDays(days);
								this.EndDateTime.addDays(days);
																
								event = this;
							}
						});
						
						calendar.ClearEventsOnCalendar();
						calendar._drawEventsOnCalendar();
						
						calendar.def.onEventDropped.call(this, event, newDate);
					}
				});
			}
			
			calendar._boxes.push(new CalendarBox(i, currentDate, dateBox, dateLink));
			row.append(dateBox);
		}
		tBody.append(row);

		var a = $(calendar.def.containerId);
		var cal = $('<table class="MonthlyCalendar" cellpadding="0" tablespacing="0"></table>').append(headerRow, tBody);
		
		a.hide();
		a.html(cal);
		a.fadeIn("normal");
		
		calendar._drawEventsOnCalendar();
	}
	
	this._drawEventsOnCalendar = function() {
		//filter the JSON array for proper dates
		calendar._filterEventCollection();
		calendar._clearBoxEvents();
		
		if (calendar.cEvents && calendar.cEvents.length > 0) {
			var container = $(calendar.def.containerId);			
			
			$.each(calendar.cEvents, function(){
				var ev = this;
				//alert("eventID: " + ev.EventID + ", start: " + ev.StartDateTime + ",end: " + ev.EndDateTime);
				
				var tempStartDT = ev.StartDateTime.clone().clearTime();
				var tempEndDT = ev.EndDateTime.clone().clearTime();
				
				var startI = new TimeSpan(tempStartDT - calendar._dateRange.startDate).days;
				var endI = new TimeSpan(tempEndDT - calendar._dateRange.startDate).days;
				//alert("start I: " + startI + " end I: " + endI);
				
				var istart = (startI < 0) ? 0 : startI;
				var iend = (endI > calendar._boxes.length - 1) ? calendar._boxes.length - 1 : endI;
				//alert("istart: " + istart + " iend: " + iend);
				
				
				for (var i = istart; i <= iend; i++) {
					var b = calendar._boxes[i];

					var startBoxCompare = tempStartDT.compareTo(b.date);
					var endBoxCompare = tempEndDT.compareTo(b.date);

					var continueEvent = ((i != 0 && startBoxCompare == -1 && endBoxCompare >= 0 && b.weekNumber != calendar._boxes[i - 1].weekNumber) || (i == 0 && startBoxCompare == -1));
					var toManyEvents = (startBoxCompare == 0 || (i == 0 && startBoxCompare == -1) || 
										continueEvent || (startBoxCompare == -1 && endBoxCompare >= 0)) && b.vOffset >= (b.getCellBox().height() - b.getLabelHeight() - 32);
					
					//alert("b.vOffset: " + b.vOffset + ", cell height: " + (b.getCellBox().height() - b.getLabelHeight() - 32));
					//alert(continueEvent);
					//alert(toManyEvents);
					
					if (toManyEvents) {
						if (!b.isTooManySet) {
							var moreDiv = $('<div class="MoreEvents" id="ME_' + i + '">' + calendar.def.navLinks.showMore + '</div>');
							var pos = b.getCellPosition();
							var index = i;

							moreDiv.css({ 
								"top" : (pos.top + (b.getCellBox().height() - b.getLabelHeight())), 
								"left" : pos.left, 
								"width" : (b.getLabelWidth() - 7),
								"position" : "absolute" });
							
							moreDiv.click(function(e) { calendar._showMoreClick(e, index); });
							
							calendar._eventObj[moreDiv.attr("id")] = moreDiv;
							b.isTooManySet = true;
						} //else update the +more to show??
						b.events.push(ev);
					} else if (startBoxCompare == 0 || (i == 0 && startBoxCompare == -1) || continueEvent) {
						var block = _buildEventBlock(ev, b.weekNumber);						
						var pos = b.getCellPosition();
						
						block.css({ 
							"top" : (pos.top + b.getLabelHeight() + b.vOffset), 
							"left" : pos.left, 
							"width" : (b.getLabelWidth() - 7), 
							"position" : "absolute" });
						
						b.vOffset += 19;
						
						if (continueEvent) {
							block.prepend($('<span />').addClass("ui-icon").addClass("ui-icon-triangle-1-w"));
							
							var e = calendar._eventObj['Event_' + ev.EventID + '_' + (b.weekNumber - 1)];
							if (e) { e.prepend($('<span />').addClass("ui-icon").addClass("ui-icon-triangle-1-e")); }
						}
						
						calendar._eventObj[block.attr("id")] = block;
						
						b.events.push(ev);
					} else if (startBoxCompare == -1 && endBoxCompare >= 0) {
						var e = calendar._eventObj['Event_' + ev.EventID + '_' + b.weekNumber];
						if (e) {
							var w = e.css("width")
							e.css({ "width" : (parseInt(w) + b.getLabelWidth() + 1) });
							b.vOffset += 19;
							b.events.push(ev);
						}
					}
					
					//end of month continue
					if (i == iend && endBoxCompare > 0) {
						var e = calendar._eventObj['Event_' + ev.EventID + '_' + b.weekNumber];
						if (e) { e.prepend($('<span />').addClass("ui-icon").addClass("ui-icon-triangle-1-e")); }
					}
				}
			});
			
			for (var o in calendar._eventObj) {
				calendar._eventObj[o].hide();
				container.append(calendar._eventObj[o]);
				calendar._eventObj[o].show();
			}
		}
	}
	
	this._buildEventBlock = function(ev, weekNumber) {
		var block = $('<div class="Event" id="Event_' + ev.EventID + '_' + weekNumber + '" eventid="' + ev.EventID +'"></div>');
		
		if(ev.CssClass) { block.addClass(ev.CssClass) }
		block.bind('click', { Event: ev }, calendar.def.onEventBlockClick);
		block.bind('mouseover', { Event: ev }, calendar.def.onEventBlockOver);
		block.bind('mouseout', { Event: ev }, calendar.def.onEventBlockOut);
		
		if (calendar.def.dragableEvents) {
			_dragableEvent(ev, block, weekNumber);
		}
		
		var link;
		if (ev.URL && ev.URL.length > 0) {
			link = $('<a href="' + ev.URL + '">' + ev.Title + '</a>');
		} else {
			link = $('<a>' + ev.Title + '</a>');
		}
		
		link.bind('click', { Event: ev }, calendar.def.onEventLinkClick);
		block.append(link);
		return block;
	}	

	this._dragableEvent = function(event, block, weekNumber) {
		block.draggable({
			zIndex: 4,
			delay: 50,
			opacity: 0.5,
			revertDuration: 1000,
			cursorAt: { left: 5 },
			start: function(ev, ui) {
				//hide any additional event parts
				for (var i = 0; i <= calendar._gridRows; i++) {
					if (i == weekNumber) {
						continue;
					}
					
					var e = calendar._eventObj['Event_' + event.EventID + '_' + i];
					if (e) { e.hide(); }
				}
			}
		});
	}
	
	this._showMoreClick = function(e, boxIndex) {
		var box = calendar._boxes[boxIndex];
		calendar.def.onShowMoreClick.call(this, box.events);
		e.stopPropagation();
	}
	
	
	calendar.ClearEventsOnCalendar = function() {
		calendar._clearBoxEvents();
		$(".Event", $(calendar.def.containerId)).remove();
		$(".MoreEvents", $(calendar.def.containerId)).remove();
	}
	
	calendar.AddEvents = function(eventCollection) {
		if(eventCollection) {
			if(eventCollection.length > 0) {
				$.merge(calendar.cEvents, eventCollection);
			} else {
				calendar.cEvents.push(eventCollection);
			}
			calendar.ClearEventsOnCalendar();
			calendar._drawEventsOnCalendar();
		}
	}
	
	calendar.ReplaceEventCollection = function(eventCollection) {
		if(eventCollection) {
			calendar.cEvents = [];
			calendar.cEvents = eventCollection;
		}
		
		calendar.ClearEventsOnCalendar();
		calendar._drawEventsOnCalendar();
	}
	
	calendar.ChangeMonth = function(dateIn) {
		var returned = calendar.def.onMonthChanging.call(this, dateIn);
		if (!returned) {
			calendar.DrawCalendar(dateIn);
			calendar.def.onMonthChanged.call(this, dateIn);
		}
	}
	
	calendar.Initialize = function(options, events) {
		var today = new Date();
		
		options = $.extend(calendar.def, options);
		
		if (events) { 
			calendar.ClearEventsOnCalendar();
			calendar.cEvents = events;
		}
		
		calendar.DrawCalendar();
		return calendar;
	};
	
	
	function CalendarBox(id, boxDate, cell, label) {
		this.id = id;
		this.date = boxDate;
		this.cell = cell;
		this.label = label;
		this.weekNumber = Math.floor(id / 7);
		this.events= [];
		this.isTooManySet = false;
		this.vOffset = 0;
		
		this.echo = function() {
			alert("Date: " + this.date + " WeekNumber: " + this.weekNumber + " ID: " + this.id);
		}
		
		this.clear = function() {
			this.events = [];
			this.isTooManySet = false;
			this.vOffset = 0;
		}
		
		this.getCellPosition = function() {
			if (this.cell) { 
				return this.cell.position();
			}
			return;
		}
		
		this.getCellBox = function() {
			if (this.cell) { 
				return this.cell;
			}
			return;
		}
		
		this.getLabelWidth = function() {
			if (this.label) {
				return this.label.innerWidth();
			}
			return;
		}
		
		this.getLabelHeight = function() {
			if (this.label) { 
				return this.label.height();
			}
			return;
		}
		
		this.getDate = function() {
			return this.date;
		}
	}
	
	
	}
})(jQuery);
