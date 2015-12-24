import d3 from 'd3';
/**
 * From https://github.com/dk8996/Gantt-Chart
 * @author Dimitry Kudrayvtsev
 * @version 2.x
 */

export default function(milestoneCount) {
    var FIT_TIME_DOMAIN_MODE = "fit";
    var FIXED_TIME_DOMAIN_MODE = "fixed";

    var margin = {
	top : 20,
	right : 40,
	bottom : 20,
	left : 250
    };
    var selector = 'body';
    var timeDomainStart = d3.time.day.offset(new Date(),-3);
    var timeDomainEnd = d3.time.hour.offset(new Date(),+3);
    var timeDomainMode = FIT_TIME_DOMAIN_MODE;// fixed or fit
    var taskTypes = [];
    var taskStatus = [];
    // var height = document.body.clientHeight - margin.top - margin.bottom-5;
    var height = milestoneCount * 50; // height of chart is based on # of milestones
    var width = document.body.clientWidth - margin.right - margin.left-5;

    var tickFormat = "%H:%M";

    var keyFunction = function(d) {
	return d.startDate + d.taskName + d.endDate;
    };

    var rectTransform = function(d) {
	     return "translate(" + x(d.startDate) + "," + y(d.taskName) + ")";
    };
    var rectTransformCompleted = function(d) {
	     return "translate(" + x(d.startDate) + "," + y(d.taskName) + ")";
    };
    var rectTransformRemaining = function(d) {
	     return "translate(" + (x(d.startDate) + d.percent * (x(d.endDate)-x(d.startDate))) + "," + y(d.taskName) + ")";
    };

    var x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, width ]).clamp(true);

    var y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format(tickFormat)).tickSubdivide(true)
	    .tickSize(8).tickPadding(8);

    var yAxis = d3.svg.axis().scale(y).orient("right").tickSize(0);

    var initTimeDomain = function(tasks) {
	if (timeDomainMode === FIT_TIME_DOMAIN_MODE) {
	    if (tasks === undefined || tasks.length < 1) {
		timeDomainStart = d3.time.day.offset(new Date(), -3);
		timeDomainEnd = d3.time.hour.offset(new Date(), +3);
		return;
	    }
	    tasks.sort(function(a, b) {
		return a.endDate - b.endDate;
	    });
	    timeDomainEnd = tasks[tasks.length - 1].endDate;
	    tasks.sort(function(a, b) {
		return a.startDate - b.startDate;
	    });
	    timeDomainStart = tasks[0].startDate;
	}
    };

    var initAxis = function() {
	x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, width ]).clamp(true);
	y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);
	xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format(tickFormat)).tickSubdivide(true)
		.tickSize(8).tickPadding(8);

	yAxis = d3.svg.axis().scale(y).orient("right").tickSize(0);
    };

    function gantt(tasks) {

	initTimeDomain(tasks);
	initAxis();

	var svg = d3.select(selector)
	.append("svg")
	.attr("class", "chart")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
        .attr("class", "gantt-chart")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

var PHIL =
      svg.selectAll(".chart");

  PHIL.select('line.today').data([new Date()]).enter()
    .append('line')
    .attr('class', 'today')
    .attr('x1', function(d) { return x(d); })
    .attr('x2', function(d) { return x(d); })
    .attr('y1', 0)
    .attr('y2', height)
    .style({stroke:'rgb(0,0,255)', 'stroke-width':2})
    ;

   PHIL.selectAll('rect.milestone-completed').data(tasks, keyFunction).enter()
  	 .append("rect")
  	//  .attr("rx", 5)
    //        .attr("ry", 5)
  	 .attr("class", function(d){
  	     return 'milestone-completed ' + d.status;
  	     })
  	 .attr("y", 0)
  	 .attr("transform", rectTransformCompleted)
  	 .attr("height", function(d) { return y.rangeBand(); })
  	 .attr("width", function(d) {
  	     return d.percent * (x(d.endDate) - x(d.startDate));
       });

   // PHIL: Copy-pasta to show the 2nd half of the milestone (unfinished)
   PHIL.selectAll('rect.milestone-remaining').data(tasks, keyFunction).enter()

 	 .append("rect")
 // 	 .attr("rx", 5)
  //         .attr("ry", 5)
 	 .attr("class", function(d){
 	     return 'milestone-remaining ' + d.status;
 	     })
 	 .attr("y", 0)
 	 .attr("transform", rectTransformRemaining)
 	 .attr("height", function(d) { return y.rangeBand(); })
 	 .attr("width", function(d) {
 	     return (1-d.percent) * (x(d.endDate) - x(d.startDate));
 	     });


	 svg.append("g")
	 .attr("class", "x axis")
	 .attr("transform", "translate(0, " + (height - margin.top - margin.bottom) + ")")
	 .transition()
	 .call(xAxis);

	 svg.append("g").attr("class", "y axis").attr('transform', 'translate(-'+margin.left+',0)').transition().call(yAxis);

	 return gantt;

    };

    gantt.redraw = function(tasks) {

	initTimeDomain(tasks);
	initAxis();

        var svg = d3.select(".chart");

        var ganttChartGroup = svg.select(".gantt-chart");
        var rect = ganttChartGroup.selectAll("rect.milestone-completed").data(tasks, keyFunction);

        rect.enter()
         .append("rect")
        //  .attr("rx", 5)
        //  .attr("ry", 5)
	 .attr("class", function(d){
	     return 'milestone-completed ' +d.status;
	     })
	 .transition()
	 .attr("y", 0)
	 .attr("transform", rectTransformCompleted)
	 .attr("height", function(d) { return y.rangeBand(); })
	 .attr("width", function(d) {
	     return d.percent*(x(d.endDate) - x(d.startDate));
	     });

        rect.transition()
          .attr("transform", rectTransform)
	 .attr("height", function(d) { return y.rangeBand(); })
	 .attr("width", function(d) {
	     return d.percent*(x(d.endDate) - x(d.startDate));
	     });

	rect.exit().remove();

  //PHIL Copy-pasta
  var rect = ganttChartGroup.selectAll("rect.milestone-remaining").data(tasks, keyFunction);

  rect.enter()
   .append("rect")
   .attr("rx", 5)
   .attr("ry", 5)
.attr("class", function(d){
 return 'milestone-remaining ' +d.status;
 })
.transition()
.attr("y", 0)
.attr("transform", rectTransformRemaining)
.attr("height", function(d) { return y.rangeBand(); })
.attr("width", function(d) {
 return (1-d.percent)*(x(d.endDate) - x(d.startDate));
 });

  rect.transition()
    .attr("transform", rectTransformRemaining)
.attr("height", function(d) { return y.rangeBand(); })
.attr("width", function(d) {
 return (1-d.percent)*(x(d.endDate) - x(d.startDate));
 });

rect.exit().remove();


	svg.select(".x").transition().call(xAxis);
	svg.select(".y").transition().call(yAxis);

	return gantt;
    };

    gantt.margin = function(value) {
	if (!arguments.length)
	    return margin;
	margin = value;
	return gantt;
    };

    gantt.timeDomain = function(value) {
	if (!arguments.length)
	    return [ timeDomainStart, timeDomainEnd ];
	timeDomainStart = +value[0], timeDomainEnd = +value[1];
	return gantt;
    };

    /**
     * @param {string}
     *                vale The value can be "fit" - the domain fits the data or
     *                "fixed" - fixed domain.
     */
    gantt.timeDomainMode = function(value) {
	if (!arguments.length)
	    return timeDomainMode;
        timeDomainMode = value;
        return gantt;

    };

    gantt.taskTypes = function(value) {
	if (!arguments.length)
	    return taskTypes;
	taskTypes = value;
	return gantt;
    };

    gantt.taskStatus = function(value) {
	if (!arguments.length)
	    return taskStatus;
	taskStatus = value;
	return gantt;
    };

    gantt.width = function(value) {
	if (!arguments.length)
	    return width;
	width = +value;
	return gantt;
    };

    gantt.height = function(value) {
	if (!arguments.length)
	    return height;
	height = +value;
	return gantt;
    };

    gantt.tickFormat = function(value) {
	if (!arguments.length)
	    return tickFormat;
	tickFormat = value;
	return gantt;
    };

    gantt.selector = function(value) {
	if (!arguments.length)
	    return selector;
	selector = value;
	return gantt;
    };

    return gantt;
};
