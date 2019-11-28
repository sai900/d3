//Init Map
//*******************************************************************************************************************************************************
var lat = 41.141376;
var lng = -8.613999;
var zoom = 14;

// add an OpenStreetMap tile layer
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';




var grayscale = L.tileLayer(mbUrl, {
        id: 'mapbox.light',
        attribution: mbAttr
    }),
    streets = L.tileLayer(mbUrl, {
        id: 'mapbox.streets',
        attribution: mbAttr
    });


var map = L.map('map', {
    center: [lat, lng], // Porto
    zoom: zoom,
    layers: [streets],
    zoomControl: true,
    fullscreenControl: true,
    fullscreenControlOptions: { // optional
        title: "Show me the fullscreen !",
        titleCancel: "Exit fullscreen mode",
        position: 'bottomright'
    }
});

var baseLayers = {
    "Grayscale": grayscale, // Grayscale tile layer
    "Streets": streets, // Streets tile layer
};

layerControl = L.control.layers(baseLayers, null, {
    position: 'bottomleft'
}).addTo(map);

// Initialise the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var featureGroup = L.featureGroup();

var drawControl = new L.Control.Draw({
    position: 'bottomright',
	collapsed: false,
    draw: {
        // Available Shapes in Draw box. To disable anyone of them just convert true to false
        polyline: false,
        polygon: false,
        circle: false,
        rectangle: true,
        marker: false,
    },
    edit: {
        featureGroup: drawnItems,
        //remove: true,
        //edit: true
    }

});
map.addControl(drawControl); // To add anything to map, add it to "drawControl"
//*******************************************************************************************************************************************************
//*****************************************************************************************************************************************
// Index Road Network by Using R-Tree
//*****************************************************************************************************************************************
var rt = cw(function(data,cb){
	var self = this;
	var request,_resp;
	importScripts("js/rtree.js");
	if(!self.rt){
		self.rt=RTree();
		request = new XMLHttpRequest();
		request.open("GET", data);
		request.onreadystatechange = function() {
			if (request.readyState === 4 && request.status === 200) {
				_resp=JSON.parse(request.responseText);
				self.rt.geoJSON(_resp);
				cb(true);
			}
		};
		request.send();
	}else{
		return self.rt.bbox(data);
	}
});

rt.data(cw.makeUrl("js/trips.json"));
//*****************************************************************************************************************************************
// Clear the Map.
//*****************************************************************************************************************************************	
function clearMap() {
    for (i in map._layers) {
        if (map._layers[i]._path != undefined) {
            try {
                map.removeLayer(map._layers[i]);
            } catch (e) {
                console.log("problem with " + e + map._layers[i]);
            }
        }
    }
}
//*****************************************************************************************************************************************
// Draw rectangle on Map Event for Query :
// Click the small box on Map and start drawing to do query.
//*****************************************************************************************************************************************	

var horizontal, scatter, pie, bar, line = false;

map.on('draw:created', function (e) {
	
	clearMap();
	
	var type = e.layerType,
		layer = e.layer;
	
	if (type === 'rectangle') {
		var bounds=layer.getBounds();
		rt.data([[bounds.getSouthWest().lng,bounds.getSouthWest().lat],[bounds.getNorthEast().lng,bounds.getNorthEast().lat]]).
		then(function(d){var result = d.map(function(a) {return a.properties;});
		console.log(result);		// Trip Info: avspeed, distance, duration, endtime, maxspeed, minspeed, starttime, streetnames, taxiid, tripid
		DrawRS(result);

        if (bar === true) { 
            barChart(result);
        } else if (line === true) {
            lineChart(result);
        } else if (horizontal === true){
            horizontalBarChart(result);
        } else if (scatter === true) {
            scatterplot(result);
        } else if (pie === true) {
            pieChart(result);
        }
		});
	}
	drawnItems.addLayer(layer);			//Add your Selection to Map  
});

function barChartTrue() {
    d3.select("#graph-display").select("svg").remove();
    bar = true;
    line = false;
    pie = false;
    scatter = false;
    horizontal = false;
}

function lineChartTrue(){
    d3.select("#graph-display").select("svg").remove();
    bar = false;
    line = true;
    pie = false;
    scatter = false;
    horizontal = false;
}

function horizontalCharTrue(){
    d3.select("#graph-display").select("svg").remove();
    pie = false;
    bar = false;
    line = false;
    scatter = false;
    horizontal = true;
}

function scatterPlotTrue() {
    d3.select("#graph-display").select("svg").remove();
    pie = false;
    bar = false;
    line = false;
    scatter = true;
    horizontal = false;
}

function pieChartTrue() {
    d3.select("#graph-display").select("svg").remove();
    horizontal = false;
    bar = false;
    line = false;
    scatter = false;
    pie = true;
}

function lineChart(e) {
    var margin =  {
        top: 20,
        right: 20,
        bottom: 50,
    left: 40
    }, 
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    var x = d3.scaleBand().range([0, width], .05);
    var y = d3.scaleLinear().range([height, 0]);

    var xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%I:%M %p"));
    var yAxis = d3.axisLeft().scale(y).ticks(20);

    var svg = d3.select("#graph-display").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var hourParser = d3.isoParse;

    var dataset = d3.nest()
        .key(function (d) { return d3.timeHour.round(hourParser(d.starttime)); }).sortKeys(d3.ascending)
        .rollup(function (d) { return d3.mean(d, function (g) { return g.duration; }); })
        .entries(e);
        console.log(JSON.stringify(dataset));

    var line = d3.line()
    .x(function(d) { return x(d.key); })
    .y(function(d) { return y(d.value); });

     x.domain(dataset.map(function(d) { return new Date(d.key); }));
     y.domain(d3.extent(dataset, function(d) { return d.value; }));

    svg.append("g")
    .append("text")
    .attr("x", width/2)             
    .attr("y", 0)
    .attr("text-anchor", "middle")  
    .attr('dy', -8)
    .text("Visualizing average trip duration per hour: ");


  svg.append("g")
      .attr("transform", "translate(-32," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-45)" );

  svg.append("g")
      .call(yAxis)
    .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Duration");

   // Add the valueline path.
  svg.append("path")
      .data([dataset])
      .attr("class", "line")
      .attr("d", line);
}

function scatterplot(e) {

var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

    var dataset = d3.nest()
        .key(function (d) { return d.streetnames[0] }).sortKeys(d3.ascending)
        .rollup(function(d) { return {"avduration": d3.mean(d, function (g) { return g.duration; }), "avspeed": d3.mean(d, function (g) { return g.avspeed; })}})
        .entries(e);
        console.log(JSON.stringify(dataset));

    // setup x 
    var xValue = function(d) { return d.value.avspeed;}, // data -> value
        xScale = d3.scaleLinear().range([0, width]), // value -> display
        xMap = function(d) { return xScale(xValue(d));}, // data -> display
        xAxis = d3.axisBottom().scale(xScale);

    // setup y
    var yValue = function(d) { return d.value.avduration;}, // data -> value
        yScale = d3.scaleLinear().range([height, 0]), // value -> display
        yMap = function(d) { return yScale(yValue(d));}, // data -> display
        yAxis = d3.axisLeft().scale(yScale);

    // setup fill color
    var cValue = function(d) { return d.key;},

    color = d3.scaleOrdinal(d3.schemeCategory20);

    // add the graph canvas to the body of the webpage
    var svg = d3.select("#graph-display").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 100);

    // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain([d3.min(dataset, xValue) - 1, d3.max(dataset, xValue) + 1]);
  yScale.domain([d3.min(dataset, yValue) - 1, d3.max(dataset, yValue) + 1]);

  // x-axis
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(0)")
      .attr("y", 17)
      .attr("dy", "0.71em")
      .attr("text-anchor", "start")
      .text("Average Speed");

  // y-axis
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Average Duration");

  // draw dots
  svg.selectAll(".dot")
      .data(dataset)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .style("fill", function(d) { return color(cValue(d));}) 
      .on("mouseover", function(d) {
          tooltip.transition()
               .duration(200)
               .style("opacity", .9);
          tooltip.html(d.key + "<br/> (Average Speed: " + xValue(d) 
	        + ", Average Duration: " + yValue(d) + ")")
               .style("left", (d3.event.pageX + 5) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
      });

  // draw legend
  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  // draw legend colored rectangles
  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  // draw legend text
  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d;})

}

function horizontalBarChart(e){

    var hourParser = d3.isoParse;

    var dataset = d3.nest()
    .key(function (d) { return d.taxiid }).sortKeys(d3.ascending)
    .rollup(function (d) { return d3.sum(d, function (g) { return g.distance; });})
    .entries(e);
    console.log(JSON.stringify(dataset));

 var margin =  {
        top: 20,
        right: 20,
        bottom: 50,
    left: 60
    }, 
    width = 960 - margin.left - margin.right,
    height = 900 - margin.top - margin.bottom;

    var svg = d3.select("#graph-display").append("svg").attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g").attr("Fuckin' text yo");
    var tooltip = d3.select("body").append("div").attr("class", "toolTip");
    
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().range([height, 0]);

  
  
  	dataset.sort(function(a, b) { return a.value - b.value; });
  
  	x.domain([0, d3.max(dataset, function(d) { return d.value; })]);
    y.domain(dataset.map(function(d) { return d.key; })).padding(0.1);

     svg.append("g")
    .append("text")
    .attr("x", width/2)             
    .attr("y", 0)
    .attr("text-anchor", "middle")  
    .attr('dy', -8)
    .text("Visualizing total distance traveled per taxi: ");


    svg.append("g")
        .attr("class", "x axis")
       	.attr("transform", "translate(0," + height + ")")
      	.call(d3.axisBottom(x).ticks(5).tickFormat(function(d) { return parseInt(d / 1000); }).tickSizeInner([-height]));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y));

    svg.selectAll(".bar")
        .data(dataset)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("y", function(d) { return y(d.key); })
        .attr("width", function(d) { return x(d.value); })
        .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX - 50 + "px")
              .style("top", d3.event.pageY - 70 + "px")
              .style("display", "inline-block")
              .html("Taxi ID: " + (d.key) + "<br>" + (d.value / 1000) + " Kilometers");
        })
    		.on("mouseout", function(d){ tooltip.style("display", "none");});


}

function barChart(e) {

    var margin =  {
        top: 20,
        right: 20,
        bottom: 50,
    left: 40
    }, 
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


    var x = d3.scaleBand().rangeRound([0, width], .05).padding(0.1);
    var y = d3.scaleLinear().range([height, 0]);

    var xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%I:%M %p"));
    var yAxis = d3.axisLeft().scale(y).ticks(10);

    var svg = d3.select("#graph-display").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tooltip = d3.select("body").append("div").attr("class", "toolTip");

    var hourParser = d3.isoParse; //d3.timeParse("%I:%M%p");


    var dataset = d3.nest()
        .key(function (d) { return d3.timeHour.round(hourParser(d.starttime)); }).sortKeys(d3.ascending)
        .rollup(function (d) { return d3.mean(d, function (g) { return g.avspeed; }); })
        .entries(e);
        console.log(JSON.stringify(dataset));
    

    x.domain(dataset.map(function(d) { return new Date(d.key); }));
    y.domain([0, d3.max(dataset, function(d) { return d.value; })]);

    svg.append("g")
        .append("text")
        .attr("x", width/2)             
        .attr("y", 0)
        .attr("text-anchor", "middle")  
        .attr('dy', -8)
        .text("Visualizing average trip speed per hour: ");

   svg.selectAll(".bar")
    .data(dataset)
   .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(new Date(d.key)); })
    .attr("width", x.bandwidth())
    .attr("y", function(d) { return y(d.value); })
    .attr("height", function(d) { return height - y(d.value); })
    .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX - 50 + "px")
              .style("top", d3.event.pageY - 70 + "px")
              .style("display", "inline-block")
              .html("<strong>"  + (d.key) + "</strong>" + "<br>" + "Average Speed" + "<br>" + "<strong>"  + (d.value) + "</strong>");
        })
    .on("mouseout", function(d){ tooltip.style("display", "none");});
    

   svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-45)" );

  // add the y Axis
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Value");
}

function pieChart(e){

    var hourParser = d3.isoParse;

    var dataset = d3.nest()
        .key(function (d) { return d3.timeHour.round(hourParser(d.starttime)); }).sortKeys(d3.ascending)
        .rollup(function (d) { return d.length })
        .entries(e);
        console.log(JSON.stringify(dataset));

    var width = 960,
        height = 500,
        radius = Math.min(width, height) / 2;

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var tooltip = d3.select("body").append("div").attr("class", "toolTip");

    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var labelArc = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.value; });

    var svg = d3.select("#graph-display").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
        .data(pie(dataset))
        .enter().append("g")
        .attr("class", "arc")
        .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX - 50 + "px")
              .style("top", d3.event.pageY - 70 + "px")
              .style("display", "inline-block")
              .html("<strong>"  + (new Date(d.key)) + "</strong>" + "<br>" + "Trip Amount" + "<br>" + "<strong>"  + (d.value) + "</strong>");
        })
        .on("mouseout", function(d){ tooltip.style("display", "none");});;

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.value); });

    g.append("text")
        .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return d.value; });
}

//*****************************************************************************************************************************************
// DrawRS Function:
// Input is a list of Trip and the function draw these trips on Map based on their IDs
//*****************************************************************************************************************************************
function DrawRS(trips) {
    for (var j=0; j<trips.length; j++) {  // Check Number of Segments and go through all segments
        var TPT = new Array();              
        TPT = TArr[trips[j].tripid].split(',');           // Find each segment in TArr Dictionary. 
        var polyline = new L.Polyline([]).addTo(drawnItems);
        polyline.setStyle({
            color: 'red',                      // polyline color
            weight: 1,                         // polyline weight
            opacity: 0.5,                      // polyline opacity
            smoothFactor: 1.0  
        });
        for(var y = 0; y < TPT.length-1; y=y+2){    // Parse latlng for each segment
            polyline.addLatLng([parseFloat(TPT[y+1]), parseFloat(TPT[y])]);
        }
    }        
}