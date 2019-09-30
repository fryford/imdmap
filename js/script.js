
//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//Load data and config file
	d3.queue()
		.defer(d3.json, "data/config.json")
		.await(ready);

	function ready (error, config){

	// function ready (error, data, config, geog){

		//Set up global variables
		dvc = config.ons;
		oldlsoa11cd = "";
		firsthover = true;



		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;


		//Set up number formats
		// displayformat = GB.format("$,." + dvc.displaydecimals + "%");
		displayformat = d3.format(",." + dvc.displaydecimals + "f");
		legendformat = d3.format(",");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'data/style.json', //stylesheet location
			//style: 'https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-night/style.json',
		  center: [-0.12, 51.5], // starting position51.5074° N, 0.1278
		  zoom:12, // starting zoom
		  minZoom:4,
			maxZoom: 17, //
		  attributionControl: false
		});
		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl());

		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());

		// Disable map rotation using right click + drag
		map.dragRotate.disable();

		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();


		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}));

		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}));

		addFullscreen();

		if(config.ons.breaks =="jenks") {
			breaks = [];

			ss.ckmeans(values, (dvc.numberBreaks)).map(function(cluster,i) {
				if(i<dvc.numberBreaks-1) {
					breaks.push(cluster[0]);
				} else {
					breaks.push(cluster[0])
					//if the last cluster take the last max value
					breaks.push(cluster[cluster.length-1]);
				}
			});
		}
		else if (config.ons.breaks == "equal") {
			breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks);
		}
		else {breaks = config.ons.breaks;};


		//round breaks to specified decimal places
		breaks = breaks.map(function(each_element){
			return Number(each_element.toFixed(dvc.legenddecimals));
		});

		//work out halfway point (for no data position)
		midpoint = breaks[0] + ((breaks[dvc.numberBreaks] - breaks[0])/2)

		//Load colours
		if(typeof dvc.varcolour === 'string') {
			colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
		} else {
			colour = dvc.varcolour;
		}

		//set up d3 color scales
		color = d3.scaleThreshold()
				.domain(breaks.slice(1))
				.range(colour);

		//now ranges are set we can call draw the key
		createKey(config);
		createLegend(config)


		map.on('load', function() {

				map.addLayer({
					"id": "income",
					'type': 'fill',
					"source": {
						"type": "vector",
						//"tiles": ["http://localhost:8000/tiles/{z}/{x}/{y}.pbf"],
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t18/tiles/{z}/{x}/{y}.pbf"],
						"minzoom": 4,
						"maxzoom": 13
					},
					"source-layer": "imddata2",
					"background-color": "#ccc",
					'paint': {
							'fill-opacity':1,
							'fill-outline-color':'rgba(0,0,0,0)',
							'fill-color': {
									// Refers to the data of that specific property of the polygon
								'property': 'imddata2_i',
								'default': '#666666',
								// Prevents interpolation of colors between stops
								'base': 0,
							//	"varcolour": ["#276419","#4d9221","#7fbc41","#b8e186","#e6f5d0","#e5b9ad","#dfa2a1","#da8b95","#d5728a","#d0587e"],

							//	"varcolour": ["#009392","#55a49d","#88b4a7","#aec5b2","#cfd8bd","#eacfb9","#e4b3aa","#dc979b","#d6798d","#d0587e"],
							//	"varcolour": ["#798234","#939956","#acb178","#c7c99c","#e2e2bf","#e5b9ad","#dfa2a1","#da8b95","#d5728a","#d0587e"],
							//"varcolour": ["#37ae3f", "#6cc064", "#97d287", "#bfe4ab", "#e6f5d0","#f0dccd","#eabcb9","#e39ca5","#da7b91","#d0587e"],

								'stops': [
									[0, '#d0587e'],
									[1, '#d0587e'],
									[2, '#da7b91'],
									[3, '#e39ca5'],
									[4, '#eabcb9'],
									[5, '#f0dccd'],
									[6, '#e6f5d0'],
									[7, '#bfe4ab'],
									[8, '#97d287'],
									[9, '#6cc064'],
									[10, '#37ae3f']

								]
							}

						}
				}, 'place_suburb');

				map.addLayer({
					"id": "lsoa-outlines",
					"type": "fill",
					"source": {
						"type": "vector",
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t18/tiles2/{z}/{x}/{y}.pbf"],
						"minzoom": 10
					},
					"source-layer": "imdatafull",
					"layout": {},
					'paint': {
							'fill-opacity':0,
							'fill-outline-color':'rgba(0,0,0,0)',
							'fill-color': "#fff"
						},
				}, 'place_suburb');

				map.addLayer({
					"id": "lsoa-outlines-hover",
					"type": "line",
					"source": {
						"type": "vector",
						"tiles": ["https://cdn.ons.gov.uk/maptiles/t18/tiles2/{z}/{x}/{y}.pbf"],
						"minzoom": 10
					},
					"source-layer": "imdatafull",
					"layout": {},
					"paint": {
						"line-color": "orange",
						"line-width": 3
					},
					"filter": ["==", "lsoa11cd", ""]
				}, 'place_suburb');

			//test whether ie or not
			function detectIE() {
			  var ua = window.navigator.userAgent;


			  var msie = ua.indexOf('MSIE ');
			  if (msie > 0) {
				// IE 10 or older => return version number
				return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
			  }

			  var trident = ua.indexOf('Trident/');
			  if (trident > 0) {
				// IE 11 => return version number
				var rv = ua.indexOf('rv:');
				return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
			  }

			  var edge = ua.indexOf('Edge/');
			  if (edge > 0) {
				// Edge (IE 12+) => return version number
				return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
			  }

			  // other browser
			  return false;
			}


			if(detectIE()){
				onMove = onMove.debounce(100);
				onLeave = onLeave.debounce(100);
			};

			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "lsoa-outlines", onMove);

			// Reset the lsoa-fills-hover layer's filter when the mouse leaves the layer.
			map.on("mouseleave", "lsoa-outlines", onLeave);

			map.getCanvasContainer().style.cursor = 'pointer';

			//Add click event
			map.on('click', 'lsoa-outlines', onClick);

			//get location on click
			d3.select(".mapboxgl-ctrl-geolocate").on("click", geolocate);


			map.on('zoom', function(){console.log(map.getZoom())});//end mapload

})

		$(".search-control").click(function() {
			$(".search-control").val('')
		})

		d3.select(".search-control").on("keydown", function() {
    if(d3.event.keyCode === 13){
			event.preventDefault();
			event.stopPropagation();

			myValue=$(".search-control").val();


			getCodes(myValue);
			pymChild.sendHeight();

    }
  })

		$("#submitPost").click(function( event ) {

						event.preventDefault();
						event.stopPropagation();

						myValue=$(".search-control").val();


						getCodes(myValue);
						pymChild.sendHeight();
		});

		function onMove(e) {


				newlsoa11cd = e.features[0].properties.lsoa11cd;
				if(firsthover) {
            dataLayer.push({
                'event': 'mapHoverSelect',
                'selected': newlsoa11cd
            })

            firsthover = false;
        }


				if(newlsoa11cd != oldlsoa11cd) {
					oldlsoa11cd = e.features[0].properties.lsoa11cd;
					map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", e.features[0].properties.lsoa11cd]);

					// selectArea(e.features[0].properties.lsoa11cd);


					var features = map.queryRenderedFeatures(e.point,{layers: ['lsoa-outlines']});
				 	if(features.length != 0){

						//console.log(features[0].properties)

						setAxisVal(features[0].properties.lsoa11nm, features[0].properties["imddata_imddata__2"]);
						updatePercent(e.features[0]);
					}
					//setAxisVal(e.features[0].properties.lsoa11nm, e.features[0].properties["houseprice"]);
				}
		};


		function tog(v){return v?'addClass':'removeClass';}
		$(document).on('input', '.clearable', function(){
				$(this)[tog(this.value)]('x');
		}).on('mousemove', '.x', function( e ){
				$(this)[tog(this.offsetWidth-28 < e.clientX-this.getBoundingClientRect().left)]('onX');
		}).on('touchstart click', '.onX', function( ev ){
				ev.preventDefault();
				$(this).removeClass('x onX').val('').change();
			//	console.log("here")
				enableMouseEvents();
				onLeave();
		});



		function onLeave() {
				map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", ""]);
				oldlsoa11cd = "";
				// $("#areaselect").val("").trigger("chosen:updated");
				hideaxisVal();
		};



		 function onClick(e) {
		 		disableMouseEvents();
		 		newlsoa11cd = e.features[0].properties.lsoa11cd;

		 		if(newlsoa11cd != oldlsoa11cd) {
		 			oldlsoa11cd = e.features[0].properties.lsoa11cd;
		 			map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", e.features[0].properties.lsoa11cd]);

		 			 //selectArea(e.features[0].properties.lsoa11cd);
					updatePercent(e.features[0]);
		 			setAxisVal(e.features[0].properties.lsoa11nm, e.features[0].properties["imddata_imddata__2"]);
		 		}

		 		dataLayer.push({
             'event':'mapClickSelect',
             'selected': newlsoa11cd
         })
		 };

		function disableMouseEvents() {
				map.off("mousemove", "lsoa-outlines", onMove);
				map.off("mouseleave", "lsoa-outlines", onLeave);
		}

		function enableMouseEvents() {
				map.on("mousemove", "lsoa-outlines", onMove);
				map.on("click", "lsoa-outlines", onClick);
				map.on("mouseleave", "lsoa-outlines", onLeave);
		}


		function setAxisVal(areanm,areaval) {

			d3.select("#keyvalue").style("font-weight","bold").text(function(){
				if(!isNaN(areaval)) {
					return areanm;
				} else {
					return areanm;
				}
			});

			d3.selectAll(".blocks").attr("stroke","black").attr("stroke-width","2px");

			d3.select("#block" + (11 - areaval)).attr("stroke","orange").attr("stroke-width","3px").raise()


		}

		function hideaxisVal() {
			d3.select("#keyvalue").style("font-weight","bold").text("");

			d3.selectAll(".blocks").attr("stroke","black").attr("stroke-width","2px");


		}

		function createKey(config){

					keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

					var svgkey = d3.select("#key")
						.attr("width", keywidth)
						.attr("height",20);

					var color = d3.scaleThreshold()
					   .domain(breaks)
					   .range(colour);

					// Set up scales for legend
					x = d3.scaleLinear()
						.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
						.range([0,keywidth-30]); /*range for pixels*/


					var xAxis = d3.axisBottom(x)
						.tickSize(15)
						.tickValues(color.domain())
						.tickFormat(legendformat);

					var g2 = svgkey.append("g").attr("id","horiz")
						.attr("transform", "translate(15,5)");


					keyhor = d3.select("#horiz");

					g2.selectAll("rect")
						.data(color.range().map(function(d,i) {

						  return {
							x0: i ? x(color.domain()[i+1]) : x.range()[0],
							x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
							z: d
						  };
						}))
					  .enter().append("rect")
						.attr("id",function(d,i){return "block" + (i+1)})
						.attr("class", "blocks")
						.attr("height", 10)
						.attr("x", function(d) {
							 return d.x0; })
						.attr("width", function(d) {return d.x1 - d.x0; })
						.style("opacity",1)
						.attr("stroke","black")
						.attr("stroke-width","2px")
						.style("fill", function(d) { return d.z; });


					g2.append("line")
						.attr("id", "currLine")
						.attr("x1", x(10))
						.attr("x2", x(10))
						.attr("y1", -10)
						.attr("y2", 8)
						.attr("stroke-width","2px")
						.attr("stroke","#000")
						.attr("opacity",0);

					g2.append("text")
						.attr("id", "currVal")
						.attr("x", x(10))
						.attr("y", -15)
						.attr("fill","#000")
						.text("");



					keyhor.selectAll("rect")
						.data(color.range().map(function(d, i) {
						  return {
							x0: i ? x(color.domain()[i]) : x.range()[0],
							x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
							z: d
						  };
						}))
						.attr("x", function(d) { return d.x0; })
						.attr("width", function(d) { return d.x1 - d.x0; })
						.style("fill", function(d) { return d.z; });

					keyhor.call(xAxis).append("text")
						.attr("id", "caption")
						.attr("x", -63)
						.attr("y", -20)
						.text("");

					keyhor.append("rect")
						.attr("id","keybar")
						.attr("width",8)
						.attr("height",0)
						.attr("transform","translate(15,0)")
						.style("fill", "#ccc")
						.attr("x",x(0));


					if(dvc.dropticks) {
					// 	d3.select("#horiz").selectAll("text").attr("opacity",function(d,i){
					// 			// if there are more that 4 breaks, so > 5 ticks, then drop every other.
					// 			if(i >= 3 && i<11  || i==1){return 0} }
					// 	);
						d3.select("#horiz").selectAll("text").attr("opacity",0);
					}

					console.log(x.range()[1]/10);

					d3.selectAll(".tick text").attr("transform","translate(-" + (x.range()[1]/10)/2 + ",0)")
					//Temporary	hardcode unit text
					dvc.unittext = "change in life expectancy";

					d3.select("#keyunits").append("p").style("float","left").attr("id","keyunit").style("margin-top","-10px").style("margin-left","18px").html(dvc.varunit);
					d3.select("#keyunits").append("p").style("float","right").attr("id","keyunitR").style("margin-top","-10px").style("margin-right","18px").html(dvc.varunit2);
					d3.select("#keyunits2").append("p").attr("width","100%").style("text-align","center").style("margin-top","-10px").style("margin-right","18px").html(dvc.varunit3);

			} // Ends create key

			function createLegend(keydata) {

							legend = d3.select("#details-content-3").append("p").attr("width","100%").style("text-align","center").style("margin-top","-10px").style("margin-right","18px").html(dvc.varunit3);

						 legend = d3.select("#details-content-3")//.append('ul')
						// 	.attr('class', 'key')
							.selectAll('g')
							.data(keydata.ons.legendvars)
							.enter()
							.append('div')
							.attr('class', function(d, i) { return 'key-item key-' + i + ' b '+ d.replace(' ', '-').toLowerCase(); })
							// .on("mouseover",function(d, i){
							// 	d3.selectAll(".key-item").style("opacity",0.2);
							// 	d3.selectAll(".key-" + i).style("opacity",1);
							// })
							// .on("mouseout",function(d, i){
							// 	d3.selectAll(".key-item").style("opacity",1);
							// })

						legend.append('label').attr('class','legendlabel').text(function(d,i) {
							var value = parseFloat(d).toFixed(1);
							return d;
						});

						legend.append('div')
								.attr("id","bars")
								.style("width","calc(100% - 95px)")
								.style("height","8px")
								.style("float","right")
								.style("height","20px")
								.append("div")
								.attr("class", "legendRect")
								.style("float","left")
								.attr("id",function(d,i){return "legendRect" + i})
								.style("width","2px")
								//.style("background","repeating-linear-gradient(to right, #fff, #fff " + (parseInt(d3.select("#bars").style("width")/10)) + "px, #ffd180 10px, #ffd180 20px)")
								.style("height","8px")
								.style("margin-top","8px");
								//
								// background: repeating-linear-gradient(
								// 	to right,
								// 	#f6ba52,
								// 	#f6ba52 10px,
								// 	#ffd180 10px,
								// 	#ffd180 20px
								// );

								barwidth = parseInt(d3.select("#bars").style("width"));

								d3.selectAll(".legendRect").style("background","repeating-linear-gradient(to right, #fff, #fff " + (((barwidth-20)/10)-2) + "px, #000 2px, #000 " + (((barwidth-20)/10)) +"px)")




					} //end createLegend


			function updatePercent(props) {

				console.log(props);


//"Income","Employment","Education","Health","Crime",	"Environment"],
		Overall = 11 - props.properties.imddata_imddata__2;
		Income = 11 - props.properties.imddata_imddata__3;
		Employment = 11 -props.properties.imddata_imddata__4;
		Education =	11 -props.properties.imddata_imddata__5;
		Health = 11 - props.properties.imddata_imddata__6;
		Crime =	11 - props.properties.imddata_imddata__7;
		Housing =	11 - props.properties.imddata_imddata__8;
		Environment= 11 - props.properties.imddata_imddata__9;

				percentages = [Overall,Income,Employment,Education,Health,Crime,Housing,Environment];
				console.log(percentages)
				percentages.forEach(function(d,i) {
					d3.select("#legendRect" + i).transition().duration(300).style("width", parseInt(percentages[i]*((barwidth-20)/10)) + "px");
				});




			}

	function addFullscreen() {

		currentBody = d3.select("#map").style("height");
		console.log(currentBody)
		d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)

	}

	function setbodyheight() {
		d3.select("#map").style("height","100%");

		document.addEventListener('webkitfullscreenchange', exitHandler, false);
		document.addEventListener('mozfullscreenchange', exitHandler, false);
		document.addEventListener('fullscreenchange', exitHandler, false);
		document.addEventListener('MSFullscreenChange', exitHandler, false);

	}


	function exitHandler() {
			if (document.webkitIsFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.mozFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.msFullscreenElement === false)
			{
				shrinkbody();
			}
		}

	function shrinkbody() {
		console.log(currentBody);
		d3.select("#map").style("height",currentBody);
		pymChild.sendHeight();
	}

	function geolocate() {
		dataLayer.push({
								'event': 'geoLocate',
								'selected': 'geolocate'
		})

		var options = {
		  enableHighAccuracy: true,
		  timeout: 5000,
		  maximumAge: 0
		};

		navigator.geolocation.getCurrentPosition(success, error, options);
	}

	function getCodes(myPC)	{

		//first show the remove cross
		d3.select(".search-control").append("abbr").attr("class","postcode");

			dataLayer.push({
								 'event': 'geoLocate',
								 'selected': 'postcode'
							 })

			var myURIstring=encodeURI("https://api.postcodes.io/postcodes/"+myPC);
			$.support.cors = true;
			$.ajax({
				type: "GET",
				crossDomain: true,
				dataType: "jsonp",
				url: myURIstring,
				error: function (xhr, ajaxOptions, thrownError) {
					},
				success: function(data1){
					if(data1.status == 200 ){
						//$("#pcError").hide();
						lat =data1.result.latitude;
						lng = data1.result.longitude;
						//console.log(lat,lng);
						successpc(lat,lng)
					} else {
						$(".search-control").val("Sorry, invalid postcode.");
					}
				}

			});

		}


	function successpc(lat,lng) {

		map.jumpTo({center:[lng,lat], zoom:12})
		point = map.project([lng,lat]);


		setTimeout(function(){

		var tilechecker = setInterval(function(){
			 features=null
		 	var features = map.queryRenderedFeatures(point,{layers: ['lsoa-outlines']});
		 	if(features.length != 0){
		 		 //onrender(),
		 		map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", features[0].properties.lsoa11cd]);
				//var features = map.queryRenderedFeatures(point);
				disableMouseEvents();
				setAxisVal(features[0].properties.lsoa11nm, features[0].properties["imddata_imddata__2"]);
				updatePercent(features[0]);
		 		clearInterval(tilechecker);
		 	}
		 },500)
		},500);




	};

		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.lsoa11cd; });
			var areanames =  datacsv.map(function(d) { return d.lsoa11nm; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

					if(typeof params != 'undefined') {

							disableMouseEvents();

							map.setFilter("lsoa-outlines-hover", ["==", "lsoa11cd", params.selected]);

							selectArea(params.selected);
							setAxisVal(params.selected);

							zoomToArea(params.selected);

							dataLayer.push({
									'event': 'mapDropSelect',
									'selected': params.selected
							})
					}
					else {
							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};

	}

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
